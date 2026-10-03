import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SessionUser } from "@/lib/session";

export const DECLARACION_ASISTENCIA_DEFAULT =
  "Confirmo que participé en esta actividad, recibí el contenido indicado y que los datos suministrados son correctos.";

const MAX_SIGNATURE_BYTES = 500 * 1024;

export const EVENTO_ESTADOS = [
  "borrador",
  "pendiente_aprobacion",
  "programado",
  "en_curso",
  "pendiente_revision",
  "cerrado",
  "cancelado",
] as const;

export const RESULTADOS_DEFINITIVOS = [
  "presente",
  "tardanza",
  "participacion_parcial",
  "ausencia_justificada",
  "ausencia_no_justificada",
  "no_aplica",
  "anulado",
] as const;

export function esAdministradorAsistencia(session: SessionUser): boolean {
  return session.rolPrincipal === "administrativo" || session.rolPrincipal === "hseq";
}

export function crearConsecutivoEvento(fecha = new Date()): string {
  const year = fecha.getUTCFullYear();
  const stamp = fecha
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(4, 16);
  return `EV-${year}-${stamp}`;
}

export function crearTokenRegistro(): string {
  return randomBytes(24).toString("base64url");
}

export function crearCodigoRegistro(fecha = new Date()): string {
  return `ASI-${fecha.getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

type EvidenceTokenPayload = {
  eventoId: string;
  participanteId: string;
  exp: number;
};

function evidenceTokenSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("No está configurada la clave de seguridad para emitir evidencias.");
  }
  return secret;
}

export function crearTokenEvidencia(
  input: { eventoId: string; participanteId: string },
  ttlSeconds = 45 * 60,
) {
  const payload: EvidenceTokenPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", evidenceTokenSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function validarTokenEvidencia(token: unknown): EvidenceTokenPayload {
  if (typeof token !== "string") throw new Error("La autorización de la evidencia no es válida.");
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("La autorización de la evidencia no es válida.");
  const expected = createHmac("sha256", evidenceTokenSecret()).update(encoded).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    throw new Error("La autorización de la evidencia no es válida.");
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("La autorización de la evidencia no es válida.");
  }
  let payload: EvidenceTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as EvidenceTokenPayload;
  } catch {
    throw new Error("La autorización de la evidencia no es válida.");
  }
  if (!payload.eventoId || !payload.participanteId || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("La autorización de la evidencia venció. Abre nuevamente el enlace de asistencia.");
  }
  return payload;
}

export function validarFirmaManuscrita(value: unknown): { dataUrl: string; hash: string } {
  if (typeof value !== "string" || !value.startsWith("data:image/png;base64,")) {
    throw new Error("La firma manuscrita es obligatoria y debe realizarse en el recuadro.");
  }
  const encoded = value.slice("data:image/png;base64,".length);
  if (!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
    throw new Error("La firma manuscrita no tiene un formato válido.");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 100 || bytes.length > MAX_SIGNATURE_BYTES) {
    throw new Error("La firma manuscrita está vacía o supera el tamaño permitido.");
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!pngSignature.every((byte, index) => bytes[index] === byte)) {
    throw new Error("La firma manuscrita no corresponde a una imagen PNG válida.");
  }
  return {
    dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function documentosSugeridos(tipo: string, caracter: string) {
  const documentos = [
    {
      codigo: "TH-FOR-03",
      nombre: "Registro de asistencia",
      version: "03",
      tipo: "formato",
      obligatorio: true,
    },
  ];

  const formativos = new Set([
    "charla_formativa",
    "capacitacion",
    "induccion",
    "reinduccion",
    "entrenamiento_practico",
  ]);
  if (caracter === "formativo" || formativos.has(tipo)) {
    documentos.push({
      codigo: "TH-FOR-04",
      nombre: "Registro de capacitación",
      version: "02",
      tipo: "formato",
      obligatorio: true,
    });
  }
  return documentos;
}

export function textoRequerido(value: unknown, field: string, max = 300): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} es obligatorio.`);
  }
  return value.trim().slice(0, max);
}

export function textoOpcional(value: unknown, max = 1000): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, max);
}

export function fechaValida(value: unknown, field: string): Date {
  const fecha = new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(fecha.getTime())) throw new Error(`${field} no es válida.`);
  return fecha;
}
