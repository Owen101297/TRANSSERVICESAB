import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import {
  esAdministradorAsistencia,
  EVENTO_ESTADOS,
  fechaValida,
  textoOpcional,
  textoRequerido,
} from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";
import { resolveDocumentUrl } from "@/lib/storage/document-storage";

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
  const evidencias = await Promise.all(
    evento.evidencias.map(async (evidencia) => ({
      ...evidencia,
      archivoUrl: await resolveDocumentUrl(evidencia.archivoUrl),
    })),
  );
  return NextResponse.json({
    success: true,
    evento: { ...evento, evidencias },
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
      include: { participantes: true, evidencias: true },
    });
    if (!before) {
      return NextResponse.json({ success: false, error: "Evento no encontrado." }, { status: 404 });
    }

    if (body.action === "registro") {
      if (!esAdministradorAsistencia(auth.session)) {
        return NextResponse.json({ success: false, error: "Solo el administrador puede abrir o cerrar el registro." }, { status: 403 });
      }
      const abierto = body.abierto === true;
      if (abierto && !["programado", "en_curso"].includes(before.estado)) {
        return NextResponse.json(
          { success: false, error: "La actividad debe estar programada o en curso para abrir el registro." },
          { status: 409 },
        );
      }
      if (["cerrado", "cancelado"].includes(before.estado)) {
        return NextResponse.json({ success: false, error: "La actividad no admite cambios en el registro." }, { status: 409 });
      }
      const updated = await prisma.eventoAsistencia.update({
        where: { id },
        data: {
          registroAbierto: abierto,
          registroAbiertoAt: abierto ? new Date() : before.registroAbiertoAt,
          registroCerradoAt: abierto ? null : new Date(),
        },
      });
      await recordAudit({
        action: "STATUS_CHANGE",
        entityType: "EventoAsistencia",
        entityId: id,
        before,
        after: updated,
        metadata: { operation: abierto ? "OPEN_ATTENDANCE" : "CLOSE_ATTENDANCE" },
        actor: auth.session,
      });
      return NextResponse.json({ success: true, evento: updated });
    }

    if (body.action === "actualizar") {
      if (!esAdministradorAsistencia(auth.session)) {
        return NextResponse.json({ success: false, error: "Solo el administrador puede editar el expediente." }, { status: 403 });
      }
      if (["cerrado", "cancelado"].includes(before.estado)) {
        return NextResponse.json({ success: false, error: "Reabre el expediente antes de modificar sus datos." }, { status: 409 });
      }
      const fechaInicio = fechaValida(body.fechaInicio, "La fecha inicial");
      const fechaFin = fechaValida(body.fechaFin, "La fecha final");
      if (fechaFin <= fechaInicio) {
        return NextResponse.json({ success: false, error: "La fecha final debe ser posterior a la inicial." }, { status: 400 });
      }
      const modalidad = textoRequerido(body.modalidad, "La modalidad", 30);
      const updated = await prisma.$transaction(async (tx) => {
        const evento = await tx.eventoAsistencia.update({
          where: { id },
          data: {
            nombre: textoRequerido(body.nombre, "El nombre", 180),
            objetivo: textoRequerido(body.objetivo, "El objetivo", 1200),
            descripcion: textoOpcional(body.descripcion, 3000),
            fechaInicio,
            fechaFin,
            modalidad,
            lugar: textoRequerido(body.lugar, "El lugar", 220),
            proyecto: textoOpcional(body.proyecto, 120),
            responsableNombre: textoRequerido(body.responsableNombre, "El responsable", 160),
            facilitadorNombre: textoRequerido(body.facilitadorNombre, "El facilitador", 160),
            facilitadorEmpresa: textoOpcional(body.facilitadorEmpresa, 180),
            materialUrl: textoOpcional(body.materialUrl, 1000),
            contenido: textoOpcional(body.contenido, 5000),
            instruccionesRegistro: textoOpcional(body.instruccionesRegistro, 1000),
            permiteExternos: body.permiteExternos === true,
            toleranciaMinutos: Math.max(0, Math.min(180, Number(body.toleranciaMinutos) || 0)),
            permanenciaMinima: Math.max(0, Math.min(100, Number(body.permanenciaMinima) || 0)),
            requiereFoto: modalidad !== "virtual",
          },
        });
        const capacitacion = await tx.capacitacion.findUnique({ where: { eventoId: id } });
        if (capacitacion) {
          await tx.capacitacion.update({
            where: { id: capacitacion.id },
            data: {
              nombre: evento.nombre,
              fecha: evento.fechaInicio,
              duracionHoras: Math.max(0.25, (evento.fechaFin.getTime() - evento.fechaInicio.getTime()) / 3_600_000),
              facilitador: evento.facilitadorNombre,
              objetivo: evento.objetivo,
              lugar: evento.lugar,
              materialUrl: evento.materialUrl,
              materialContenido: evento.contenido,
              requiereSelfie: false,
              requiereFirma: true,
            },
          });
        }
        return evento;
      });
      await recordAudit({
        action: "UPDATE",
        entityType: "EventoAsistencia",
        entityId: id,
        before,
        after: updated,
        metadata: { operation: "UPDATE_EVENT_FILE" },
        actor: auth.session,
      });
      return NextResponse.json({ success: true, evento: updated });
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
    if (["pendiente_revision", "cerrado", "cancelado"].includes(estado)) {
      data.registroAbierto = false;
      data.registroCerradoAt = new Date();
    }
    if (estado === "programado") {
      data.aprobadoPorId = auth.session.id;
      data.aprobadoPorNombre = auth.session.nombre;
      data.aprobadoAt = new Date();
    }
    if (estado === "cerrado") {
      const obligatorios = before.participantes.filter((p) => p.tipoConvocatoria === "obligatoria");
      const pendientes = obligatorios.filter((p) => !p.resultadoDefinitivo);
      const excepcional = body.cerradoExcepcional === true;
      const tienePresencial = before.evidencias.some((item) => ["foto_presencial", "practica"].includes(item.categoria));
      const tieneVirtual = before.evidencias.some((item) => ["captura_virtual", "reporte_virtual"].includes(item.categoria));
      const faltanEvidencias = before.modalidad === "mixta"
        ? !tienePresencial || !tieneVirtual
        : before.modalidad === "virtual"
          ? !tieneVirtual
          : !tienePresencial;
      if ((pendientes.length > 0 || faltanEvidencias) && !excepcional) {
        const causas = [
          pendientes.length > 0 ? `${pendientes.length} participantes obligatorios sin resultado definitivo` : null,
          faltanEvidencias ? `falta la evidencia requerida para modalidad ${before.modalidad}` : null,
        ].filter(Boolean).join(" y ");
        return NextResponse.json(
          {
            success: false,
            error: `No es posible cerrar: ${causas}. Puede completar el expediente o realizar un cierre excepcional motivado.`,
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
