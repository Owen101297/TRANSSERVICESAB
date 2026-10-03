import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  crearCodigoRegistro,
  crearTokenEvidencia,
  textoOpcional,
  textoRequerido,
  validarFirmaManuscrita,
} from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isGoogleDriveConfigured } from "@/lib/storage/google-drive";
import { normalizeDocument, requiresFormValidation } from "@/lib/event-strategy";

export const dynamic = "force-dynamic";

const DOCUMENT_TYPES = new Set(["CC", "CE", "PA", "TI", "PEP", "NIT", "OTRO"]);

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function publicEventState(evento: { estado: string; registroAbierto: boolean }) {
  if (evento.estado === "cancelado") return "cancelada";
  if (evento.estado === "cerrado") return "cerrada";
  if (!evento.registroAbierto) return "no_abierta";
  return "abierta";
}

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const evento = await prisma.eventoAsistencia.findUnique({
    where: { tokenRegistro: token },
    include: {
      documentos: {
        orderBy: { codigo: "asc" },
        select: { id: true, codigo: true, nombre: true, version: true, tipo: true },
      },
      evidencias: { where: { categoria: { in: ["selfie_remota", "selfie_individual"] } }, select: { participanteId: true } },
    },
  });
  if (!evento) {
    return NextResponse.json({ success: false, error: "El enlace de asistencia no es válido." }, { status: 404 });
  }

  const session = await getServerSession();
  const existing = session
    ? await prisma.eventoParticipante.findFirst({
        where: { eventoId: evento.id, personaId: session.id, firmaAt: { not: null } },
        select: { id: true, registroCodigo: true, firmaAt: true, fotoUrl: true },
      })
    : null;

  return NextResponse.json({
    success: true,
    estadoRegistro: publicEventState(evento),
    evento: {
      nombre: evento.nombre,
      tipo: evento.tipo,
      proceso: evento.proceso,
      caracter: evento.caracter,
      objetivo: evento.objetivo,
      descripcion: evento.descripcion,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      modalidad: evento.modalidad,
      lugar: evento.lugar,
      responsableNombre: evento.responsableNombre,
      facilitadorNombre: evento.facilitadorNombre,
      facilitadorEmpresa: evento.facilitadorEmpresa,
      materialUrl: evento.materialUrl,
      materialOrigen: evento.materialOrigen,
      validacionTipo: evento.validacionTipo,
      formConnectorStatus: evento.formConnectorStatus,
      enlaceReunion: evento.enlaceReunion,
      evidenciaTipo: evento.evidenciaTipo,
      notaMinima: evento.notaMinima,
      instruccionesRegistro: evento.instruccionesRegistro,
      declaracionAsistencia: evento.declaracionAsistencia,
      permiteExternos: evento.permiteExternos,
      requiereFoto: evento.requiereFoto,
      driveDisponible: isGoogleDriveConfigured(),
      documentos: evento.documentos,
    },
    participante: session
      ? {
          autenticado: true,
          id: session.id,
          nombre: session.nombre,
          documento: session.documento,
          perfiles: session.perfiles,
          registro: existing
            ? {
                registroCodigo: existing.registroCodigo,
                firmaAt: existing.firmaAt,
                evidenciaCompleta: Boolean(existing.fotoUrl) || evento.evidencias.some((item) => item.participanteId === existing.id),
                evidenciaToken: evento.requiereFoto
                  ? crearTokenEvidencia({ eventoId: evento.id, participanteId: existing.id })
                  : null,
              }
            : null,
        }
      : { autenticado: false },
  });
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const limit = consumeRateLimit(`attendance:${clientIp(req)}:${token.slice(0, 16)}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Se alcanzó el límite de intentos. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json();
    const evento = await prisma.eventoAsistencia.findUnique({
      where: { tokenRegistro: token },
      include: { capacitacion: true },
    });
    if (!evento) {
      return NextResponse.json({ success: false, error: "El enlace de asistencia no es válido." }, { status: 404 });
    }
    if (publicEventState(evento) !== "abierta") {
      return NextResponse.json({ success: false, error: "El registro de esta actividad no está abierto." }, { status: 409 });
    }
    if (body.declaracionAceptada !== true || body.tratamientoDatosAceptado !== true) {
      return NextResponse.json(
        { success: false, error: "Debes aceptar la declaración de asistencia y el tratamiento de datos." },
        { status: 400 },
      );
    }

    const firma = validarFirmaManuscrita(body.firmaUrl);
    const session = await getServerSession();
    const requestedType = body.tipoParticipante === "externo" ? "externo" : "vinculado";

    let personaId: string | null = null;
    let personaNombre: string;
    let personaDocumento: string;
    let tipoDocumento: string;
    let tipoPersona: string;
    let empresa: string | null;
    let cargo: string | null;
    let proyecto: string | null;

    if (requestedType === "vinculado") {
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Ingresa con tu cuenta para registrar asistencia como personal vinculado." },
          { status: 401 },
        );
      }
      const persona = await prisma.persona.findUnique({ where: { id: session.id } });
      if (!persona) {
        return NextResponse.json({ success: false, error: "No fue posible verificar tu identidad." }, { status: 401 });
      }
      personaId = persona.id;
      personaNombre = `${persona.nombres} ${persona.apellidos}`.trim();
      personaDocumento = persona.numeroDocumento;
      tipoDocumento = persona.tipoDocumento;
      tipoPersona = persona.contratistaId ? "contratista" : "interno";
      empresa = persona.contratistaNombre || "TRANS SERVICES A&B S.A.S.";
      cargo = persona.perfiles.join(", ");
      proyecto = persona.contratistaNombre;
    } else {
      if (!evento.permiteExternos) {
        return NextResponse.json({ success: false, error: "Esta actividad no admite registros externos." }, { status: 403 });
      }
      tipoDocumento = typeof body.tipoDocumento === "string" ? body.tipoDocumento.toUpperCase() : "CC";
      if (!DOCUMENT_TYPES.has(tipoDocumento)) tipoDocumento = "OTRO";
      personaDocumento = normalizeDocument(body.personaDocumento);
      if (personaDocumento.length < 4) throw new Error("El número de documento es obligatorio.");
      const personaVinculada = await prisma.persona.findUnique({ where: { numeroDocumento: personaDocumento } });
      if (personaVinculada) {
        return NextResponse.json(
          { success: false, error: "Este documento pertenece al personal vinculado. Ingresa con la cuenta correspondiente." },
          { status: 409 },
        );
      }
      const nombres = textoRequerido(body.nombres, "Los nombres", 90);
      const apellidos = textoRequerido(body.apellidos, "Los apellidos", 90);
      personaNombre = `${nombres} ${apellidos}`.trim();
      tipoPersona = "externo";
      empresa = textoRequerido(body.empresa, "La empresa o procedencia", 180);
      cargo = textoRequerido(body.cargo, "El cargo o relación", 120);
      proyecto = empresa;
    }

    let validacionFormulario: { estado: string; calificacion: number | null } | null = null;
    if (requiresFormValidation(evento.validacionTipo)) {
      const respuestas = await prisma.eventoValidacionFormulario.findMany({
        where: { eventoId: evento.id, personaDocumento: normalizeDocument(personaDocumento) },
        orderBy: { submittedAt: "desc" },
        take: 20,
        select: { estado: true, calificacion: true },
      });
      validacionFormulario = evento.validacionTipo === "formulario_aprobado"
        ? respuestas.find((item) => item.estado === "aprobado") || respuestas[0] || null
        : respuestas[0] || null;
      if (!validacionFormulario) {
        return NextResponse.json(
          { success: false, error: "Primero completa el Google Forms y verifica la respuesta antes de firmar." },
          { status: 409 },
        );
      }
    }

    const now = new Date();
    const lateLimit = new Date(evento.fechaInicio.getTime() + evento.toleranciaMinutos * 60_000);
    const resultadoPreliminar = now > lateLimit ? "tardanza" : "presente";
    const registroCodigo = crearCodigoRegistro(now);
    const declaracion = evento.declaracionAsistencia;
    const evidenceHash = createHash("sha256")
      .update(`${firma.hash}:${evento.id}:${personaId || personaDocumento}:${declaracion}:${now.toISOString()}`)
      .digest("hex");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.eventoParticipante.findFirst({
        where: {
          eventoId: evento.id,
          OR: [
            ...(personaId ? [{ personaId }] : []),
            ...(personaDocumento ? [{ personaDocumento }] : []),
          ],
        },
      });
      if (existing?.personaId && !personaId) {
        throw new Error("Este documento pertenece a una persona vinculada. Ingresa con su cuenta para continuar.");
      }
      if (existing?.firmaAt) {
        return { alreadyRegistered: true, participante: existing };
      }

      const participantData = {
        personaId,
        personaNombre,
        personaDocumento,
        tipoDocumento,
        tipoPersona,
        empresa,
        cargo,
        proyecto,
        tipoConvocatoria: existing?.tipoConvocatoria || "registro_abierto",
        condicionLaboral: existing?.condicionLaboral || (personaId ? "disponible" : "no_aplica"),
        resultadoPreliminar,
        horaEntrada: now,
        firmaUrl: firma.dataUrl,
        firmaHash: evidenceHash,
        firmaAt: now,
        declaracionFirmada: declaracion,
        declaracionAceptadaAt: now,
        tratamientoDatosAt: now,
        registroCodigo,
        origenRegistro: session ? "portal" : "enlace",
        calificacion: validacionFormulario?.calificacion ?? existing?.calificacion ?? null,
        evaluacionEstado: validacionFormulario?.estado ?? existing?.evaluacionEstado ?? null,
      };

      const participante = existing
        ? await tx.eventoParticipante.update({ where: { id: existing.id }, data: participantData })
        : await tx.eventoParticipante.create({ data: { eventoId: evento.id, ...participantData } });

      const legacyData = {
        capacitacionId: evento.capacitacion?.id || null,
        personaId,
        personaDocumento,
        personaNombre,
        cargo,
        proyecto,
        facilitador: evento.facilitadorNombre,
        lugar: evento.lugar,
        duracionHoras: Math.max(0.25, (evento.fechaFin.getTime() - evento.fechaInicio.getTime()) / 3_600_000),
        asistio: true,
        estado: resultadoPreliminar,
        horaLlegada: now.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" }),
        evento: evento.nombre,
        tipoEvento: evento.tipo,
        firmaUrl: firma.dataUrl,
        observaciones: JSON.stringify({ eventoId: evento.id, registroCodigo, origen: session ? "portal" : "enlace" }),
        fecha: now,
      };
      const existingLegacy = evento.capacitacion?.id
        ? await tx.asistenciaRegistro.findFirst({
            where: {
              capacitacionId: evento.capacitacion.id,
              OR: [
                ...(personaId ? [{ personaId }] : []),
                ...(personaDocumento ? [{ personaDocumento }] : []),
              ],
            },
          })
        : null;
      if (existingLegacy) {
        await tx.asistenciaRegistro.update({ where: { id: existingLegacy.id }, data: legacyData });
      } else {
        await tx.asistenciaRegistro.create({ data: legacyData });
      }
      if (evento.capacitacion?.id) {
        const total = await tx.asistenciaRegistro.count({
          where: { capacitacionId: evento.capacitacion.id, asistio: true },
        });
        await tx.capacitacion.update({ where: { id: evento.capacitacion.id }, data: { asistentesReales: total } });
      }
      await tx.auditLog.create({
        data: {
          actorId: session?.id || personaDocumento,
          actorName: personaNombre,
          actorRole: session?.rolPrincipal || "externo",
          action: "CREATE",
          entityType: "EventoParticipante",
          entityId: participante.id,
          metadata: {
            operation: "SELF_ATTENDANCE_REGISTRATION",
            eventoId: evento.id,
            registroCodigo,
            firmaHash: evidenceHash,
            alreadyInvited: Boolean(existing),
          },
          ipAddress: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });
      return { alreadyRegistered: false, participante };
    });

    return NextResponse.json({
      success: true,
      alreadyRegistered: result.alreadyRegistered,
      registro: {
        codigo: result.participante.registroCodigo,
        nombre: result.participante.personaNombre,
        fecha: result.participante.firmaAt,
        actividad: evento.nombre,
      },
      evidenciaToken: evento.requiereFoto
        ? crearTokenEvidencia({ eventoId: evento.id, participanteId: result.participante.id })
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible registrar la asistencia.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
