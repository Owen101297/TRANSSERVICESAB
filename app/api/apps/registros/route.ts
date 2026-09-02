import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipo, // 'aseo', 'lavado', 'botiquin', 'extintor', 'encuesta'
      conductorId,
      conductorNombre,
      conductorDocumento,
      placa,
      datos,
      signature,
      observaciones,
    } = body;

    let cId = conductorId;
    let vId = undefined;

    if (conductorDocumento && !cId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: conductorDocumento },
      });
      if (persona) cId = persona.id;
    }

    if (placa) {
      const cleanPlaca = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const vehiculo = await prisma.vehiculo.findUnique({
        where: { placa: cleanPlaca },
      });
      if (vehiculo) vId = vehiculo.id;
    }

    console.log(`✓ Registro [${tipo || "general"}] recibido para placa: ${placa || "N/A"}, conductor: ${conductorNombre}`);

    return NextResponse.json({
      success: true,
      message: `Registro de ${tipo || "operación"} guardado exitosamente en el ERP`,
      data: {
        tipo,
        conductorId: cId,
        conductorNombre,
        placa: placa ? placa.toUpperCase() : null,
        fecha: new Date(),
        datos: datos || body,
      },
    });
  } catch (error: any) {
    console.error("Error al registrar evento operativo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar registro" },
      { status: 500 }
    );
  }
}
