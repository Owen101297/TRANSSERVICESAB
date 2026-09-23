import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { canAccessPortalVehicle, normalizeVehiclePlate } from "@/lib/portal-access";

export async function GET(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const placa = searchParams.get("placa");

    if (!placa) {
      return NextResponse.json({ error: "Placa requerida" }, { status: 400 });
    }

    const cleanPlaca = normalizeVehiclePlate(placa);
    if (!(await canAccessPortalVehicle(auth.session, cleanPlaca))) {
      return NextResponse.json({ error: "No autorizado para consultar este vehículo." }, { status: 403 });
    }

    // Buscar inspección preoperacional de las últimas 24 horas para este vehículo
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const inspeccion = await prisma.inspeccionPreoperacional.findFirst({
      where: {
        placa: cleanPlaca,
        createdAt: {
          gte: hace24Horas,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!inspeccion) {
      return NextResponse.json({
        aprobado: false,
        encontrado: false,
        mensaje: `No se registra inspección preoperacional en las últimas 24 horas para la placa ${cleanPlaca}.`,
      });
    }

    const esApto = inspeccion.estadoConcepto === "apto" || inspeccion.estadoConcepto === "apto_con_observacion";

    return NextResponse.json({
      aprobado: esApto,
      encontrado: true,
      estadoConcepto: inspeccion.estadoConcepto,
      fecha: inspeccion.fecha,
      conductorNombre: inspeccion.conductorNombre,
      kilometraje: inspeccion.kilometraje,
      hallazgoDetectado: inspeccion.hallazgoDetectado,
      descripcionHallazgo: inspeccion.descripcionHallazgo,
      mensaje: esApto
        ? `Preoperacional APROBADO (${inspeccion.estadoConcepto}) el ${new Date(inspeccion.fecha).toLocaleDateString("es-CO")}.`
        : `Vehículo NO APTO según inspección preoperacional. Motivo: ${inspeccion.descripcionHallazgo || "Falla crítica detectada"}.`,
    });
  } catch (error: any) {
    console.error("Error verificando preoperacional:", error);
    return NextResponse.json(
      { error: error.message || "Error al verificar preoperacional" },
      { status: 500 }
    );
  }
}
