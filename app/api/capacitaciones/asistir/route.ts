import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { conductorIdentityFromSession } from "@/lib/portal-validation";

export const dynamic = "force-dynamic";

// ── POST: Registrar asistencia con selfie y firma digital desde Portal Conductor ──
export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
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

    const identity = conductorIdentityFromSession(auth.session, {
      id: personaId,
      name: personaNombre,
      document: personaDocumento,
    });

    if (!capacitacionId) {
      return NextResponse.json(
        { success: false, error: "ID de la capacitación es requerido." },
        { status: 400 }
      );
    }

    if (!identity.name) {
      return NextResponse.json(
        { success: false, error: "Nombre del participante es requerido." },
        { status: 400 }
      );
    }
    const participantName = identity.name.trim();

    // Verificar si ya asistió a esta capacitación para evitar duplicados
    const existing = await prisma.asistenciaRegistro.findFirst({
      where: {
        capacitacionId,
        OR: [
          ...(identity.id ? [{ personaId: identity.id }] : []),
          ...(identity.document ? [{ personaDocumento: identity.document }] : []),
          { personaNombre: participantName },
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
      include: { evento: true },
    });

    if (!capacitacion) {
      return NextResponse.json(
        { success: false, error: "La capacitación solicitada no existe." },
        { status: 404 }
      );
    }

    const nuevaAsistencia = await prisma.$transaction(async (tx) => {
      const asistencia = await tx.asistenciaRegistro.create({ data: {
        capacitacionId,
        personaId: identity.id || null,
        personaDocumento: identity.document || null,
        personaNombre: participantName,
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
      }});

      if (capacitacion.eventoId) {
        const participantData = {
          personaNombre: participantName,
          personaDocumento: identity.document || null,
          tipoPersona: identity.id ? "interno" : "externo",
          cargo: cargo?.trim() || "Conductor",
          proyecto: proyecto || "Operación General",
          condicionLaboral: "disponible",
          resultadoPreliminar: "presente",
          resultadoDefinitivo: "presente",
          horaEntrada: new Date(),
          firmaUrl: firmaUrl || null,
          fotoUrl: fotoUrl || null,
          calificacion: parseFloat(String(calificacion)) || 100,
          evaluacionEstado: Number(calificacion) >= 80 ? "aprobada" : "no_aprobada",
          observaciones: observaciones?.trim() || null,
          validadoPorId: auth.session.id,
          validadoPorNombre: auth.session.nombre,
          validadoAt: new Date(),
        };
        if (identity.id) {
          await tx.eventoParticipante.upsert({
            where: { eventoId_personaId: { eventoId: capacitacion.eventoId, personaId: identity.id } },
            create: { eventoId: capacitacion.eventoId, personaId: identity.id, ...participantData },
            update: participantData,
          });
        } else {
          const existingParticipant = await tx.eventoParticipante.findFirst({
            where: {
              eventoId: capacitacion.eventoId,
              OR: [
                ...(identity.document ? [{ personaDocumento: identity.document }] : []),
                { personaNombre: participantName },
              ],
            },
          });
          if (existingParticipant) {
            await tx.eventoParticipante.update({ where: { id: existingParticipant.id }, data: participantData });
          } else {
            await tx.eventoParticipante.create({ data: { eventoId: capacitacion.eventoId, ...participantData } });
          }
        }
      }
      return asistencia;
    });

    // Actualizar conteo de asistentes reales en la capacitación
    const totalAsistentes = await prisma.asistenciaRegistro.count({
      where: { capacitacionId },
    });

    await prisma.$transaction([
      prisma.capacitacion.update({
        where: { id: capacitacionId },
        data: { asistentesReales: totalAsistentes },
      }),
      ...(capacitacion.eventoId && capacitacion.evento?.estado === "programado"
        ? [prisma.eventoAsistencia.update({ where: { id: capacitacion.eventoId }, data: { estado: "en_curso" } })]
        : []),
    ]);
    await recordAudit({
      action: "CREATE",
      entityType: "AsistenciaRegistro",
      entityId: nuevaAsistencia.id,
      after: nuevaAsistencia,
      actor: auth.session,
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
