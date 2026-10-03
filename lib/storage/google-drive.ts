import "server-only";

import { randomUUID } from "node:crypto";
import {
  googleDriveAuthenticationMessage,
  normalizeGoogleOAuthCredential,
} from "@/lib/google-drive-auth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_FOLDER_NAME = "TRANS SERVICES A&B - Evidencias";

type DriveConfiguration = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId?: string;
};

type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  createdTime?: string;
  md5Checksum?: string;
};

let tokenCache: { value: string; expiresAt: number } | null = null;
const folderCache = new Map<string, string>();

export function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  );
}

function configuration(): DriveConfiguration {
  const clientId = normalizeGoogleOAuthCredential(process.env.GOOGLE_DRIVE_CLIENT_ID);
  const clientSecret = normalizeGoogleOAuthCredential(process.env.GOOGLE_DRIVE_CLIENT_SECRET);
  const refreshToken = normalizeGoogleOAuthCredential(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive no está conectado. Configura la cuenta documental antes de guardar evidencias.");
  }
  return {
    clientId,
    clientSecret,
    refreshToken,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || undefined,
  };
}

async function accessToken(forceRefresh = false) {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value;
  }
  const config = configuration();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    let errorCode: string | undefined;
    try {
      const errorPayload = (await response.json()) as { error?: string };
      errorCode = errorPayload.error;
    } catch {
      // Google puede devolver una respuesta no JSON; se conserva un mensaje seguro y genérico.
    }
    console.error("Google Drive OAuth rechazó la autenticación.", {
      status: response.status,
      error: errorCode || "unknown",
    });
    throw new Error(googleDriveAuthenticationMessage(errorCode));
  }
  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Google Drive no entregó un token de acceso válido.");
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in || 3600) * 1000,
  };
  return payload.access_token;
}

async function driveFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${await accessToken()}`,
    },
    cache: "no-store",
  });
  if (response.status === 401 && retry) {
    tokenCache = null;
    return driveFetch(url, init, false);
  }
  return response;
}

async function driveError(response: Response, fallback: string): Promise<never> {
  let detail = "";
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    detail = body.error?.message ? ` (${body.error.message})` : "";
  } catch {
    // La respuesta de Google no siempre es JSON.
  }
  throw new Error(`${fallback}${detail}`);
}

function queryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function readableName(value: string, fallback: string) {
  return value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || fallback;
}

async function findFolder(name: string, parentId?: string, appProperty?: [string, string]) {
  const clauses = [
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    `name = '${queryValue(name)}'`,
    "trashed = false",
  ];
  if (parentId) clauses.push(`'${queryValue(parentId)}' in parents`);
  if (appProperty) {
    clauses.push(`appProperties has { key='${queryValue(appProperty[0])}' and value='${queryValue(appProperty[1])}' }`);
  }
  const params = new URLSearchParams({
    q: clauses.join(" and "),
    spaces: "drive",
    fields: "files(id,name)",
    pageSize: "1",
  });
  const response = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!response.ok) return driveError(response, "No fue posible consultar las carpetas de Google Drive.");
  const payload = (await response.json()) as { files?: Array<{ id: string; name: string }> };
  return payload.files?.[0]?.id || null;
}

async function createFolder(
  name: string,
  parentId?: string,
  appProperties?: Record<string, string>,
) {
  const response = await driveFetch(`${DRIVE_API}/files?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: DRIVE_FOLDER_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
      ...(appProperties ? { appProperties } : {}),
    }),
  });
  if (!response.ok) return driveError(response, "No fue posible crear la carpeta documental en Google Drive.");
  const payload = (await response.json()) as { id?: string };
  if (!payload.id) throw new Error("Google Drive no devolvió el identificador de la carpeta creada.");
  return payload.id;
}

async function getOrCreateFolder(
  name: string,
  parentId?: string,
  appProperty?: [string, string],
) {
  const cacheKey = `${parentId || "root"}:${name}:${appProperty?.join("=") || ""}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;
  const existing = await findFolder(name, parentId, appProperty);
  const folderId = existing || await createFolder(
    name,
    parentId,
    appProperty ? { [appProperty[0]]: appProperty[1] } : undefined,
  );
  folderCache.set(cacheKey, folderId);
  return folderId;
}

async function evidenceFolder(input: {
  eventoId: string;
  consecutivo: string;
  eventoNombre: string;
  fechaInicio: Date;
  section: "Participantes" | "Evidencia general";
}) {
  const config = configuration();
  const rootId = config.rootFolderId || await getOrCreateFolder(
    ROOT_FOLDER_NAME,
    undefined,
    ["transservicesEvidenceRoot", "true"],
  );
  const dateParts = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(input.fechaInicio);
  const year = dateParts.find((part) => part.type === "year")?.value || String(input.fechaInicio.getUTCFullYear());
  const monthNumber = dateParts.find((part) => part.type === "month")?.value || "01";
  const monthText = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "long" })
    .format(input.fechaInicio);
  const yearFolder = await getOrCreateFolder(year, rootId);
  const monthFolder = await getOrCreateFolder(
    readableName(`${monthNumber} - ${monthText}`, monthNumber),
    yearFolder,
  );
  const eventFolder = await getOrCreateFolder(
    readableName(`${input.consecutivo} - ${input.eventoNombre}`, input.consecutivo),
    monthFolder,
    ["eventoId", input.eventoId],
  );
  return getOrCreateFolder(input.section, eventFolder);
}

export async function uploadEventEvidenceToDrive(input: {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  eventoId: string;
  consecutivo: string;
  eventoNombre: string;
  fechaInicio: Date;
  participantId?: string;
  registroCodigo?: string | null;
}) {
  const folderId = await evidenceFolder({
    ...input,
    section: input.participantId ? "Participantes" : "Evidencia general",
  });
  const metadata = {
    name: readableName(input.fileName, `evidencia-${randomUUID()}.webp`),
    parents: [folderId],
    appProperties: {
      origen: "erp-transservices",
      eventoId: input.eventoId,
      ...(input.participantId ? { participanteId: input.participantId } : {}),
      ...(input.registroCodigo ? { registroCodigo: input.registroCodigo } : {}),
    },
  };
  const boundary = `transservices_${randomUUID().replaceAll("-", "")}`;
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([prefix, Buffer.from(input.bytes), suffix]);
  const response = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,createdTime,md5Checksum`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!response.ok) return driveError(response, "No fue posible guardar la evidencia en Google Drive.");
  const file = (await response.json()) as DriveFileMetadata;
  if (!file.id) throw new Error("Google Drive no devolvió el identificador del archivo.");
  return {
    id: file.id,
    uri: driveStorageUri(file.id),
    name: file.name,
    mimeType: file.mimeType,
    size: Number(file.size || input.bytes.byteLength),
    webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    md5Checksum: file.md5Checksum || null,
  };
}

export function driveStorageUri(fileId: string) {
  return `drive://${fileId}`;
}

export function parseDriveStorageUri(uri: string | null | undefined) {
  if (!uri?.startsWith("drive://")) return null;
  const fileId = uri.slice("drive://".length);
  return /^[A-Za-z0-9_-]{10,}$/.test(fileId) ? fileId : null;
}

export function extractGoogleDriveFileId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)drive\.google\.com$/i.test(parsed.hostname)) return null;
    const pathMatch = parsed.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    const id = pathMatch?.[1] || parsed.searchParams.get("id");
    return id && /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function getDriveFile(fileId: string) {
  const metadataResponse = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink,createdTime,md5Checksum`,
  );
  if (!metadataResponse.ok) return driveError(metadataResponse, "No fue posible consultar la evidencia en Google Drive.");
  const metadata = (await metadataResponse.json()) as DriveFileMetadata;
  const contentResponse = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
  );
  if (!contentResponse.ok) return driveError(contentResponse, "No fue posible descargar la evidencia de Google Drive.");
  return { metadata, response: contentResponse };
}

export async function deleteDriveFile(fileId: string) {
  const response = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    return driveError(response, "No fue posible retirar la evidencia de Google Drive.");
  }
}
