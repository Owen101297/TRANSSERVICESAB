import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const ACTIVATION_HOURS_DEFAULT = 72;

export function createActivationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashActivationToken(token) };
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function activationStatus(link: {
  entregadoAt: Date | null;
  abiertoAt: Date | null;
  usadoAt: Date | null;
  revocadoAt: Date | null;
  expiraAt: Date;
}) {
  if (link.revocadoAt) return "revocado";
  if (link.usadoAt) return "activado";
  if (link.expiraAt <= new Date()) return "vencido";
  if (link.abiertoAt) return "abierto";
  if (link.entregadoAt) return "entregado";
  return "generado";
}

export function maskedDocument(value: string) {
  if (value.length <= 4) return `***${value.slice(-1)}`;
  return `${value.slice(0, 2)}${"*".repeat(Math.max(3, value.length - 4))}${value.slice(-2)}`;
}

export function buildActivationMessage(input: {
  name: string;
  accessType: string;
  link: string;
  expiresAt: Date;
}) {
  const destination = input.accessType === "erp" ? "ERP" : "Portal del Conductor";
  const expires = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(input.expiresAt);
  return `Hola, ${input.name}. Trans Services A&B te ha creado acceso al ${destination}. Abre el siguiente enlace y crea tu clave personal. El enlace es individual, funciona una sola vez y vence el ${expires}. No lo compartas con otras personas: ${input.link}`;
}
