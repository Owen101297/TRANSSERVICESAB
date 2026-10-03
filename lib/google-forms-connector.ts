import "server-only";

import { prisma } from "@/lib/prisma";

const CONNECTOR_TIMEOUT_MS = 25_000;

export type GoogleFormsConnectorResult = {
  success: boolean;
  action: "register" | "sync" | "status";
  formId?: string;
  formTitle?: string;
  publishedUrl?: string;
  connected?: boolean;
  synced?: number;
  failed?: number;
  totalResponses?: number;
  truncated?: boolean;
  error?: string;
};

export function isGoogleFormsConnectorConfigured() {
  return Boolean(
    process.env.GOOGLE_FORMS_CONNECTOR_URL &&
      (process.env.GOOGLE_FORMS_CONNECTOR_SECRET || process.env.GOOGLE_FORMS_WEBHOOK_SECRET) &&
      process.env.GOOGLE_FORMS_WEBHOOK_SECRET,
  );
}

export function normalizeGoogleFormEditUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("El enlace de administración de Google Forms no es válido.");
  }
  if (parsed.protocol !== "https:" || !/(^|\.)docs\.google\.com$/i.test(parsed.hostname)) {
    throw new Error("Usa el enlace de edición de Google Forms alojado en docs.google.com.");
  }
  if (!/^\/forms\/d\/[^/]+\/(edit|viewform)\/?$/i.test(parsed.pathname)) {
    throw new Error("Abre el formulario como propietario y copia su enlace de edición terminado en /edit.");
  }
  if (parsed.pathname.includes("/forms/d/e/")) {
    throw new Error("Este es el enlace público. Abre el formulario como propietario y copia el enlace terminado en /edit.");
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function connectorRequest(
  action: GoogleFormsConnectorResult["action"],
  payload: Record<string, unknown>,
): Promise<GoogleFormsConnectorResult> {
  const endpoint = process.env.GOOGLE_FORMS_CONNECTOR_URL?.trim();
  const connectorSecret = (
    process.env.GOOGLE_FORMS_CONNECTOR_SECRET || process.env.GOOGLE_FORMS_WEBHOOK_SECRET
  )?.trim();
  if (!endpoint || !connectorSecret || !process.env.GOOGLE_FORMS_WEBHOOK_SECRET) {
    throw new Error("El conector central de Google Forms todavía no está configurado.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: connectorSecret, action, ...payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(CONNECTOR_TIMEOUT_MS),
    redirect: "follow",
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Google Apps Script no devolvió una respuesta válida. Revisa el despliegue del conector.");
  }
  const result = (await response.json()) as GoogleFormsConnectorResult;
  if (!response.ok || !result.success) {
    throw new Error(result.error || "El conector central no pudo completar la operación.");
  }
  return result;
}

export async function registerGoogleForm(input: {
  formUrl: string;
  codigoActividad: string;
  webhookOrigin: string;
  documentQuestion?: string;
}) {
  return connectorRequest("register", {
    formUrl: normalizeGoogleFormEditUrl(input.formUrl),
    codigoActividad: input.codigoActividad,
    documentQuestion: input.documentQuestion || "Número de documento",
    webhookUrl: `${input.webhookOrigin.replace(/\/$/, "")}/api/asistencia/publica/google-forms/respuesta`,
    webhookSecret: process.env.GOOGLE_FORMS_WEBHOOK_SECRET,
  });
}

export async function syncGoogleForm(input: { formId: string; codigoActividad: string; full?: boolean }) {
  return connectorRequest("sync", input);
}

export async function getGoogleFormConnectorStatus(input: { formId: string; codigoActividad: string }) {
  return connectorRequest("status", input);
}

function safeConnectorError(error: unknown) {
  return (error instanceof Error ? error.message : "No fue posible conectar Google Forms.").slice(0, 1000);
}

export async function connectEventGoogleForm(input: {
  eventId: string;
  formUrl: string;
  webhookOrigin: string;
}) {
  const event = await prisma.eventoAsistencia.findUnique({ where: { id: input.eventId } });
  if (!event) throw new Error("La actividad no existe.");
  const formUrl = normalizeGoogleFormEditUrl(input.formUrl);
  if (!formUrl) throw new Error("El enlace de edición de Google Forms es obligatorio.");

  await prisma.eventoAsistencia.update({
    where: { id: event.id },
    data: {
      googleFormAdminUrl: formUrl,
      formConnectorStatus: "pendiente",
      formLastSyncStatus: "pendiente",
      formLastSyncError: null,
    },
  });
  if (!isGoogleFormsConnectorConfigured()) {
    const message = "El conector central de Google Forms todavía no está configurado en este ambiente.";
    await prisma.eventoAsistencia.update({
      where: { id: event.id },
      data: { formLastSyncStatus: "error", formLastSyncError: message },
    });
    throw new Error(message);
  }

  try {
    const result = await registerGoogleForm({
      formUrl,
      codigoActividad: event.consecutivo,
      webhookOrigin: input.webhookOrigin,
    });
    const responseCount = await prisma.eventoValidacionFormulario.count({ where: { eventoId: event.id } });
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.eventoAsistencia.update({
        where: { id: event.id },
        data: {
          googleFormAdminUrl: formUrl,
          googleFormId: result.formId,
          materialUrl: result.publishedUrl || event.materialUrl,
          formConnectorStatus: result.connected === false ? "error" : "conectado",
          formConnectedAt: result.connected === false ? null : now,
          formLastSyncAt: now,
          formLastSyncStatus: (result.failed || 0) > 0 ? "parcial" : "correcta",
          formLastSyncError: (result.failed || 0) > 0
            ? `${result.failed} respuestas no pudieron sincronizarse.`
            : null,
          formResponseCount: responseCount,
        },
      });
      if (result.publishedUrl) {
        await tx.capacitacion.updateMany({
          where: { eventoId: event.id },
          data: { materialUrl: result.publishedUrl },
        });
      }
      return saved;
    });
    return { event: updated, connector: result };
  } catch (error) {
    await prisma.eventoAsistencia.update({
      where: { id: event.id },
      data: {
        formConnectorStatus: "error",
        formLastSyncStatus: "error",
        formLastSyncError: safeConnectorError(error),
      },
    });
    throw error;
  }
}

export async function synchronizeEventGoogleForm(eventId: string, full = true) {
  const event = await prisma.eventoAsistencia.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("La actividad no existe.");
  if (!event.googleFormId) throw new Error("Primero conecta el formulario de esta actividad.");
  try {
    const result = await syncGoogleForm({
      formId: event.googleFormId,
      codigoActividad: event.consecutivo,
      full,
    });
    const responseCount = await prisma.eventoValidacionFormulario.count({ where: { eventoId: event.id } });
    const updated = await prisma.eventoAsistencia.update({
      where: { id: event.id },
      data: {
        formConnectorStatus: result.connected === false ? "error" : "conectado",
        formLastSyncAt: new Date(),
        formLastSyncStatus: (result.failed || 0) > 0 ? "parcial" : "correcta",
        formLastSyncError: (result.failed || 0) > 0
          ? `${result.failed} respuestas no pudieron sincronizarse.`
          : null,
        formResponseCount: responseCount,
      },
    });
    return { event: updated, connector: result };
  } catch (error) {
    await prisma.eventoAsistencia.update({
      where: { id: event.id },
      data: { formLastSyncStatus: "error", formLastSyncError: safeConnectorError(error) },
    });
    throw error;
  }
}

export async function refreshEventGoogleFormStatus(eventId: string) {
  const event = await prisma.eventoAsistencia.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("La actividad no existe.");
  if (!event.googleFormId) throw new Error("Primero conecta el formulario de esta actividad.");
  const result = await getGoogleFormConnectorStatus({
    formId: event.googleFormId,
    codigoActividad: event.consecutivo,
  });
  const updated = await prisma.eventoAsistencia.update({
    where: { id: event.id },
    data: {
      formConnectorStatus: result.connected ? "conectado" : "error",
      formLastSyncError: result.connected ? null : "El formulario ya no está registrado en el conector central.",
    },
  });
  return { event: updated, connector: result };
}
