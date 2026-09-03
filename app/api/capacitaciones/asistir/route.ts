import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── POST: Registrar asistencia con selfie y firma digital desde Portal Conductor ──
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      capacitacionId,
      personaId,
      personaDocumento,
      personaNombre,
      cargo = "Conductor",
      proyecto,
      firmaUrl,
      fotoUrl, // Selfie de evidencia
      calificacion = 100,
      respuestas = {},
      tiempoLectura = 0,
      observaciones,
    } = body;

    if (!capacitacionId) {
      return NextResponse.json(
        { success: false, error: "ID de la capacitación es requerido." },
        { status: 400 }
      );
    }

    if (!personaNombre) {
      return NextResponse.json(
        { success: false, error: "Nombre del participante es requerido." },
        { status: 400 }
      );
    }

    // Verificar si ya asistió a esta capacitación para evitar duplicados
    const existing = await prisma.asistenciaRegistro.findFirst({
      where: {
        capacitacionId,
        OR: [
          ...(personaId ? [{ personaId }] : []),
          ...(personaDocumento ? [{ personaDocumento }] : []),
          { personaNombre },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Ya has registrado tu asistencia a esta capacitación previamente.",
        asistencia: existing,
        alreadyRegistered: true,
      });
    }

    const capacitacion = await prisma.capacitacion.findUnique({
      where: { id: capacitacionId },
    });

    if (!capacitacion) {
      return NextResponse.json(
        { success: false, error: "La capacitación solicitada no existe." },
        { status: 404 }
      );
    }

    const nuevaAsistencia = await prisma.asistenciaRegistro.create({
      data: {
        capacitacionId,
        personaId: personaId || null,
        personaDocumento: personaDocumento || null,
        personaNombre: personaNombre.trim(),
        cargo: cargo?.trim() || "Conductor",
        proyecto: proyecto || "Operación General",
        facilitador: capacitacion.facilitador || "Coordinador HSEQ / PESV",
        lugar: capacitacion.lugar || "Portal Digital",
        duracionHoras: capacitacion.duracionHoras,
        asistio: true,
        estado: "presente",
        horaLlegada: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        evento: capacitacion.nombre,
        tipoEvento: capacitacion.categoria || "charla_semanal",
        firmaUrl: firmaUrl || null,
        fotoUrl: fotoUrl || null, // Selfie
        calificacion: parseFloat(String(calificacion)) || 100,
        respuestas: respuestas || {},
        tiempoLectura: parseInt(String(tiempoLectura), 10) || 0,
        observaciones: observaciones?.trim() || null,
        fecha: new Date(),
      },
    });

    // Actualizar conteo de asistentes reales en la capacitación
    const totalAsistentes = await prisma.asistenciaRegistro.count({
      where: { capacitacionId },
    });

    await prisma.capacitacion.update({
      where: { id: capacitacionId },
      data: {
        asistentesReales: totalAsistentes,
        // Si hay asistentes, marcar como realizada si estaba programada
        estado: "realizada",
      },
    });

    return NextResponse.json({
      success: true,
      message: "¡Asistencia y evidencia registradas exitosamente!",
      asistencia: nuevaAsistencia,
    });
  } catch (error: any) {
    console.error("Error en POST /api/capacitaciones/asistir:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la asistencia." },
      { status: 500 }
    );
  }
}
