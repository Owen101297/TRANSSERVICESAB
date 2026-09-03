import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha");
    const proyecto = searchParams.get("proyecto");
    const tipoEvento = searchParams.get("tipoEvento");
    const cedula = searchParams.get("cedula");

    // Consulta de conductor por cédula para autocompletado en la app móvil
    if (cedula) {
      const persona = await prisma.persona.findFirst({
        where: { numeroDocumento: cedula.trim() },
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          numeroDocumento: true,
          perfiles: true,
          telefono: true,
        },
      });
      if (!persona) return NextResponse.json({ success: true, persona: null });

      const cargo = (persona.perfiles && persona.perfiles.length > 0)
        ? persona.perfiles[0].toUpperCase()
        : "CONDUCTOR";

      return NextResponse.json({
        success: true,
        persona: {
          id: persona.id,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          numeroDocumento: persona.numeroDocumento,
          cargo,
          telefono: persona.telefono,
        },
      });
    }

    const where: any = {};
    if (fecha) {
      const start = new Date(`${fecha}T00:00:00.000Z`);
      const end = new Date(`${fecha}T23:59:59.999Z`);
      where.fecha = { gte: start, lte: end };
    }
    if (proyecto && proyecto !== "TODOS") {
      where.proyecto = proyecto;
    }
    if (tipoEvento && tipoEvento !== "TODOS") {
      where.tipoEvento = tipoEvento;
    }

    const asistencias = await prisma.asistenciaRegistro.findMany({
      where,
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ success: true, asistencias });
  } catch (error: any) {
    console.error("Error al obtener asistencias:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener asistencias" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      cargo,
      proyecto,
      facilitador,
      lugar,
      duracionHoras,
      evento,
      tipoEvento,
      estado,
      observaciones,
      signature,
      fotoUrl,
    } = body;

    let pId = conductorId;

    if (conductorDocumento && !pId) {
      const persona = await prisma.persona.findFirst({
        where: { numeroDocumento: conductorDocumento },
      });
      if (persona) pId = persona.id;
    }

    const fechaNow = new Date();
    const horaNow = fechaNow.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const asistencia = await prisma.asistenciaRegistro.create({
      data: {
        personaId: pId || "persona-general",
        personaDocumento: conductorDocumento || null,
        personaNombre: conductorNombre || "Participante",
        cargo: cargo || "CONDUCTOR",
        proyecto: proyecto || "TRANS SERVICES A&B",
        facilitador: facilitador || null,
        lugar: lugar || "Villagarzón",
        duracionHoras: duracionHoras ? parseFloat(duracionHoras) : 1.0,
        fecha: fechaNow,
        horaLlegada: horaNow,
        evento: evento || "Registro Diario de Asistencia",
        tipoEvento: tipoEvento || "capacitacion",
        estado: estado || "presente",
        firmaUrl: signature || null,
        fotoUrl: fotoUrl || null,
        observaciones: observaciones || null,
        asistio: estado !== "ausente",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia guardado exitosamente en Railway",
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
