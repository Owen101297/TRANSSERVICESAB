import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      evento,
      tipoEvento,
      estado,
      observaciones,
      signature,
      fotoUrl,
    } = body;

    let pId = conductorId;

    if (conductorDocumento && !pId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: conductorDocumento },
      });
      if (persona) pId = persona.id;
    }

    const asistencia = await prisma.asistenciaRegistro.create({
      data: {
        personaId: pId || "persona-general",
        personaNombre: conductorNombre || "Participante",
        fecha: new Date(),
        horaLlegada: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        evento: evento || "Registro Diario de Asistencia",
        tipoEvento: tipoEvento || "asistencia_general",
        estado: estado || "presente",
        observaciones: observaciones || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia guardado exitosamente",
      asistencia,
    });
  } catch (error: any) {
    console.error("Error al registrar asistencia desde App:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar asistencia" },
      { status: 500 }
    );
  }
}
