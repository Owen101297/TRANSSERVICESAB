import { NextResponse } from "next/server";
import { createPreoperacionalDb, getPreoperacionalesDb } from "@/lib/services/preoperacional.service";
import { requireApiSession } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { canAccessPortalVehicle, conductorIdentityFromSession, normalizeVehiclePlate } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const identity = conductorIdentityFromSession(auth.session, {
      id: body.conductorId,
      name: body.conductorNombre,
      document: body.conductorDocumento || body.documento,
    });
    const cleanPlaca = normalizeVehiclePlate(body.placa);
    if (!(await canAccessPortalVehicle(auth.session, cleanPlaca))) {
      return NextResponse.json({ error: "No autorizado para operar este vehículo." }, { status: 403 });
    }
    if (auth.session.rolPrincipal === "conductor") {
      const dia = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date());
      const turno = await prisma.turnoDespacho.findFirst({
        where: {
          conductorDocumento: auth.session.documento,
          placa: { equals: cleanPlaca, mode: "insensitive" },
          fecha: {
            gte: new Date(`${dia}T00:00:00-05:00`),
            lte: new Date(`${dia}T23:59:59.999-05:00`),
          },
        },
        select: { id: true },
      });
      if (!turno) {
        return NextResponse.json(
          { success: false, error: "Primero debes abrir la jornada para este vehículo." },
          { status: 409 }
        );
      }
    }

    const result = await createPreoperacionalDb({
      conductorId: identity.id || undefined,
      conductorNombre: identity.name || undefined,
      conductorDocumento: identity.document || undefined,
      placa: cleanPlaca,
      kilometraje: body.kilometraje,
      checklist: body.checklist || body.checks || {},
      observaciones: body.observaciones,
      signature: body.signature || body.firmaConductor,
      fotoEvidenciaUrl: body.fotoEvidenciaUrl,
    });
    await recordAudit({ action: "CREATE", entityType: "InspeccionPreoperacional", entityId: result.data?.id, after: result.data, actor: auth.session });

    return NextResponse.json({
      success: true,
      message: "Inspección preoperacional guardada exitosamente en PostgreSQL (Railway)",
      data: result.data,
    });
  } catch (error: any) {
    console.error("Error al registrar preoperacional desde App:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar preoperacional" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const rangoFecha = searchParams.get("rangoFecha") as any;
    const fechaDesde = searchParams.get("fechaDesde") || undefined;
    const fechaHasta = searchParams.get("fechaHasta") || undefined;
    const placa = searchParams.get("placa") || undefined;
    const conductorId = auth.session.rolPrincipal === "conductor"
      ? auth.session.id
      : searchParams.get("conductorId") || undefined;
    const estadoConcepto = searchParams.get("estadoConcepto") || undefined;
    const busqueda = searchParams.get("busqueda") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 25;

    const data = await getPreoperacionalesDb({
      rangoFecha,
      fechaDesde,
      fechaHasta,
      placa,
      conductorId,
      estadoConcepto,
      busqueda,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("Error al obtener preoperacionales:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar preoperacionales" },
      { status: 500 }
    );
  }
}
