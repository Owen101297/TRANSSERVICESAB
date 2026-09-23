import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { esAdministradorAsistencia, RESULTADOS_DEFINITIVOS, textoOpcional } from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { id: eventoId } = await context.params;

  try {
    const body = await req.json();
    const evento = await prisma.eventoAsistencia.findUnique({ where: { id: eventoId } });
    if (!evento || ["cerrado", "cancelado"].includes(evento.estado)) {
      return NextResponse.json({ success: false, error: "El evento no admite participantes." }, { status: 409 });
    }

    let data: Record<string, unknown>;
    if (typeof body.personaId === "string" && body.personaId) {
      const persona = await prisma.persona.findUnique({ where: { id: body.personaId } });
      if (!persona) {
        return NextResponse.json({ success: false, error: "Persona no encontrada." }, { status: 404 });
      }
      data = {
        eventoId,
        personaId: persona.id,
        personaNombre: `${persona.nombres} ${persona.apellidos}`.trim(),
        personaDocumento: persona.numeroDocumento,
        cargo: persona.perfiles.join(", "),
        proyecto: persona.contratistaNombre,
        tipoPersona: "interno",
        tipoConvocatoria: body.tipoConvocatoria || "opcional",
        condicionLaboral: persona.estado === "activo" ? "disponible" : persona.estado,
      };
    } else {
      const nombre = typeof body.personaNombre === "string" ? body.personaNombre.trim() : "";
      if (!nombre) {
        return NextResponse.json({ success: false, error: "El nombre es obligatorio." }, { status: 400 });
      }
      data = {
        eventoId,
        personaNombre: nombre.slice(0, 180),
        personaDocumento: textoOpcional(body.personaDocumento, 40),
        tipoPersona: body.tipoPersona || "externo",
        empresa: textoOpcional(body.empresa, 180),
        cargo: textoOpcional(body.cargo, 120),
        tipoConvocatoria: body.tipoConvocatoria || "invitado",
        condicionLaboral: "no_aplica",
      };
    }

    const participante = await prisma.eventoParticipante.create({ data: data as never });
    await recordAudit({ action: "CREATE", entityType: "EventoParticipante", entityId: participante.id, after: participante, actor: auth.session });
    return NextResponse.json({ success: true, participante }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible agregar el participante.";
    const duplicate = message.toLowerCase().includes("unique");
    return NextResponse.json(
      { success: false, error: duplicate ? "La persona ya pertenece a la convocatoria." : message },
      { status: duplicate ? 409 : 400 }
    );
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { id: eventoId } = await context.params;

  try {
    const body = await req.json();
    const participanteId = typeof body.participanteId === "string" ? body.participanteId : "";
    const before = await prisma.eventoParticipante.findFirst({
      where: { id: participanteId, eventoId },
      include: { evento: true },
    });
    if (!before) {
      return NextResponse.json({ success: false, error: "Participante no encontrado." }, { status: 404 });
    }
    if (["cerrado", "cancelado"].includes(before.evento.estado)) {
      return NextResponse.json({ success: false, error: "El evento no admite cambios." }, { status: 409 });
    }

    const action = body.action;
    const data: Record<string, unknown> = {};
    if (action === "entrada") {
      if (before.horaEntrada) {
        return NextResponse.json({ success: false, error: "La entrada ya fue registrada." }, { status: 409 });
      }
      const horaEntrada = new Date();
      const limite = new Date(before.evento.fechaInicio.getTime() + before.evento.toleranciaMinutos * 60000);
      data.horaEntrada = horaEntrada;
      data.resultadoPreliminar = horaEntrada > limite ? "tardanza" : "presente";
    } else if (action === "salida") {
      if (!before.horaEntrada) {
        return NextResponse.json({ success: false, error: "Debe registrar primero la entrada." }, { status: 409 });
      }
      data.horaSalida = new Date();
    } else if (action === "conciliar") {
      if (!esAdministradorAsistencia(auth.session)) {
        return NextResponse.json({ success: false, error: "Solo el administrador puede conciliar." }, { status: 403 });
      }
      const resultado = typeof body.resultadoDefinitivo === "string" ? body.resultadoDefinitivo : "";
      if (!RESULTADOS_DEFINITIVOS.includes(resultado as (typeof RESULTADOS_DEFINITIVOS)[number])) {
        return NextResponse.json({ success: false, error: "Resultado definitivo no válido." }, { status: 400 });
      }
      const observaciones = textoOpcional(body.observaciones, 1200);
      if (["ausencia_justificada", "no_aplica", "anulado"].includes(resultado) && !observaciones) {
        return NextResponse.json({ success: false, error: "La decisión requiere una observación." }, { status: 400 });
      }
      data.resultadoDefinitivo = resultado;
      data.observaciones = observaciones;
      data.justificacionTipo = textoOpcional(body.justificacionTipo, 80);
      data.justificacionEstado = resultado === "ausencia_justificada" ? "aprobada" : null;
      data.validadoPorId = auth.session.id;
      data.validadoPorNombre = auth.session.nombre;
      data.validadoAt = new Date();
    } else {
      return NextResponse.json({ success: false, error: "Acción no válida." }, { status: 400 });
    }

    const participante = await prisma.eventoParticipante.update({
      where: { id: participanteId },
      data,
    });
    await recordAudit({
      action: action === "conciliar" ? "APPROVE" : "UPDATE",
      entityType: "EventoParticipante",
      entityId: participante.id,
      before,
      after: participante,
      actor: auth.session,
    });
    return NextResponse.json({ success: true, participante });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar la asistencia.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  if (!esAdministradorAsistencia(auth.session)) {
    return NextResponse.json({ success: false, error: "Solo el administrador puede conciliar." }, { status: 403 });
  }
  const { id: eventoId } = await context.params;
  const evento = await prisma.eventoAsistencia.findUnique({ where: { id: eventoId } });
  if (!evento || evento.estado !== "pendiente_revision") {
    return NextResponse.json({ success: false, error: "El evento no está pendiente de revisión." }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const presentes = await tx.eventoParticipante.updateMany({
      where: { eventoId, resultadoDefinitivo: null, resultadoPreliminar: "presente" },
      data: {
        resultadoDefinitivo: "presente",
        validadoPorId: auth.session.id,
        validadoPorNombre: auth.session.nombre,
        validadoAt: new Date(),
      },
    });
    const tardanzas = await tx.eventoParticipante.updateMany({
      where: { eventoId, resultadoDefinitivo: null, resultadoPreliminar: "tardanza" },
      data: {
        resultadoDefinitivo: "tardanza",
        validadoPorId: auth.session.id,
        validadoPorNombre: auth.session.nombre,
        validadoAt: new Date(),
      },
    });
    return presentes.count + tardanzas.count;
  });
  await recordAudit({
    action: "APPROVE",
    entityType: "EventoAsistencia",
    entityId: eventoId,
    metadata: { action: "BULK_RECONCILE", records: result },
    actor: auth.session,
  });
  return NextResponse.json({ success: true, updated: result });
}
