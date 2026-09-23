import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { esAdministradorAsistencia, EVENTO_ESTADOS, textoOpcional } from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { id } = await context.params;

  const evento = await prisma.eventoAsistencia.findUnique({
    where: { id },
    include: {
      participantes: { orderBy: { personaNombre: "asc" } },
      documentos: { orderBy: { codigo: "asc" } },
      evidencias: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!evento) {
    return NextResponse.json({ success: false, error: "Evento no encontrado." }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    evento,
    isAdmin: esAdministradorAsistencia(auth.session),
  });
}

const TRANSICIONES: Record<string, string[]> = {
  borrador: ["pendiente_aprobacion", "programado", "cancelado"],
  pendiente_aprobacion: ["borrador", "programado", "cancelado"],
  programado: ["en_curso", "cancelado"],
  en_curso: ["pendiente_revision", "cancelado"],
  pendiente_revision: ["en_curso", "cerrado"],
  cerrado: ["pendiente_revision"],
  cancelado: ["borrador"],
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { id } = await context.params;

  try {
    const body = await req.json();
    const before = await prisma.eventoAsistencia.findUnique({
      where: { id },
      include: { participantes: true },
    });
    if (!before) {
      return NextResponse.json({ success: false, error: "Evento no encontrado." }, { status: 404 });
    }

    const estado = typeof body.estado === "string" ? body.estado : null;
    if (!estado || !EVENTO_ESTADOS.includes(estado as (typeof EVENTO_ESTADOS)[number])) {
      return NextResponse.json({ success: false, error: "Estado no válido." }, { status: 400 });
    }
    if (!TRANSICIONES[before.estado]?.includes(estado)) {
      return NextResponse.json(
        { success: false, error: `No se puede pasar de ${before.estado} a ${estado}.` },
        { status: 409 }
      );
    }

    const isAdmin = esAdministradorAsistencia(auth.session);
    if (["programado", "cerrado"].includes(estado) && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Solo el administrador puede aprobar o cerrar el evento." },
        { status: 403 }
      );
    }
    if (before.estado === "cerrado" && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Solo el administrador puede reabrir un evento." },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = { estado };
    if (estado === "programado") {
      data.aprobadoPorId = auth.session.id;
      data.aprobadoPorNombre = auth.session.nombre;
      data.aprobadoAt = new Date();
    }
    if (estado === "cerrado") {
      const obligatorios = before.participantes.filter((p) => p.tipoConvocatoria === "obligatoria");
      const pendientes = obligatorios.filter((p) => !p.resultadoDefinitivo);
      const excepcional = body.cerradoExcepcional === true;
      if (pendientes.length > 0 && !excepcional) {
        return NextResponse.json(
          {
            success: false,
            error: `Hay ${pendientes.length} participantes obligatorios sin resultado definitivo.`,
          },
          { status: 409 }
        );
      }
      const motivo = textoOpcional(body.motivoCierreExcepcional, 1000);
      if (excepcional && !motivo) {
        return NextResponse.json(
          { success: false, error: "El cierre excepcional requiere un motivo." },
          { status: 400 }
        );
      }
      data.cerradoExcepcional = excepcional;
      data.motivoCierreExcepcional = motivo;
      data.observacionesCierre = textoOpcional(body.observacionesCierre, 2000);
      data.cerradoPorId = auth.session.id;
      data.cerradoPorNombre = auth.session.nombre;
      data.cerradoAt = new Date();
    }
    if (before.estado === "cerrado" && estado === "pendiente_revision") {
      const motivo = textoOpcional(body.motivo, 1000);
      if (!motivo) {
        return NextResponse.json(
          { success: false, error: "La reapertura requiere un motivo." },
          { status: 400 }
        );
      }
      data.revision = { increment: 1 };
      data.cerradoAt = null;
      data.cerradoPorId = null;
      data.cerradoPorNombre = null;
      data.observacionesCierre = `Reabierto: ${motivo}`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const evento = await tx.eventoAsistencia.update({ where: { id }, data });
      const capacitacion = await tx.capacitacion.findUnique({ where: { eventoId: id } });
      if (capacitacion) {
        const estadoCapacitacion = estado === "cerrado"
          ? "realizada"
          : estado === "cancelado"
            ? "cancelada"
            : estado === "programado" || before.estado === "cerrado"
              ? "programada"
              : null;
        if (estadoCapacitacion) {
          await tx.capacitacion.update({ where: { id: capacitacion.id }, data: { estado: estadoCapacitacion } });
        }
      }
      return evento;
    });
    await recordAudit({
      action: "STATUS_CHANGE",
      entityType: "EventoAsistencia",
      entityId: id,
      before,
      after: updated,
      metadata: { motivo: textoOpcional(body.motivo, 1000) },
      actor: auth.session,
    });
    return NextResponse.json({ success: true, evento: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar el evento.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
