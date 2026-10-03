import { NextResponse } from "next/server";
import { normalizeDocument, requiresFormValidation } from "@/lib/event-strategy";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isValidWebhookApiKey } from "@/lib/webhook-auth";

export const dynamic = "force-dynamic";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: Request) {
  const providedSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!isValidWebhookApiKey(providedSecret, process.env.GOOGLE_FORMS_WEBHOOK_SECRET)) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }
  const limit = consumeRateLimit(`google-forms:${clientIp(req)}`, 300, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Límite temporal alcanzado." }, { status: 429 });

  try {
    const body = await req.json();
    const codigoActividad = typeof body.codigoActividad === "string" ? body.codigoActividad.trim().slice(0, 80) : "";
    const responseId = typeof body.responseId === "string" ? body.responseId.trim().slice(0, 200) : "";
    const personaDocumento = normalizeDocument(body.personaDocumento ?? body.documento);
    if (!codigoActividad || !responseId || personaDocumento.length < 4) {
      throw new Error("Código de actividad, documento y responseId son obligatorios.");
    }

    const evento = await prisma.eventoAsistencia.findUnique({ where: { consecutivo: codigoActividad } });
    if (!evento) return NextResponse.json({ success: false, error: "Actividad no encontrada." }, { status: 404 });
    if (evento.materialOrigen !== "empresa" || !requiresFormValidation(evento.validacionTipo)) {
      return NextResponse.json({ success: false, error: "La actividad no usa validación de Google Forms." }, { status: 409 });
    }

    const rawScore = numeric(body.calificacion ?? body.puntaje);
    const maxScore = numeric(body.puntajeMaximo);
    const percentage = rawScore === null ? null : maxScore && maxScore > 0 ? Math.round((rawScore / maxScore) * 10_000) / 100 : rawScore;
    const explicitlyApproved = typeof body.aprobada === "boolean" ? body.aprobada : null;
    const estado = evento.validacionTipo === "formulario_enviado"
      ? "enviado"
      : (explicitlyApproved ?? (percentage !== null && percentage >= (evento.notaMinima ?? 80)))
        ? "aprobado"
        : "no_aprobado";
    const submittedAt = body.submittedAt ? new Date(body.submittedAt) : new Date();
    if (Number.isNaN(submittedAt.getTime())) throw new Error("La fecha de respuesta no es válida.");

    const validacion = await prisma.$transaction(async (tx) => {
      const saved = await tx.eventoValidacionFormulario.upsert({
        where: { eventoId_responseId: { eventoId: evento.id, responseId } },
        create: { eventoId: evento.id, personaDocumento, responseId, estado, calificacion: percentage, submittedAt },
        update: { personaDocumento, estado, calificacion: percentage, submittedAt, syncedAt: new Date() },
      });
      const participante = await tx.eventoParticipante.findFirst({ where: { eventoId: evento.id, personaDocumento } });
      if (participante) {
        await tx.eventoParticipante.update({
          where: { id: participante.id },
          data: { calificacion: percentage, evaluacionEstado: estado },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: "google-forms",
          actorName: "Google Forms",
          actorRole: "integracion",
          action: "SYNC",
          entityType: "EventoValidacionFormulario",
          entityId: saved.id,
          metadata: { eventoId: evento.id, codigoActividad, estado, responseId },
          ipAddress: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });
      return saved;
    });

    return NextResponse.json({ success: true, id: validacion.id, estado: validacion.estado }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "No fue posible procesar la respuesta." },
      { status: 400 },
    );
  }
}
