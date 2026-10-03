export const MATERIAL_ORIGINS = ["empresa", "facilitador_externo", "no_aplica"] as const;
export const VALIDATION_TYPES = ["solo_asistencia", "formulario_enviado", "formulario_aprobado"] as const;
export const EVIDENCE_TYPES = ["individual", "general", "ambas", "no_aplica"] as const;

export type MaterialOrigin = (typeof MATERIAL_ORIGINS)[number];
export type ValidationType = (typeof VALIDATION_TYPES)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

function parseChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === "string" && choices.includes(value as T) ? value as T : fallback;
}

export function parseMaterialOrigin(value: unknown, fallback: MaterialOrigin = "no_aplica") {
  return parseChoice(value, MATERIAL_ORIGINS, fallback);
}

export function parseValidationType(value: unknown, fallback: ValidationType = "solo_asistencia") {
  return parseChoice(value, VALIDATION_TYPES, fallback);
}

export function parseEvidenceType(value: unknown, fallback: EvidenceType = "no_aplica") {
  return parseChoice(value, EVIDENCE_TYPES, fallback);
}

export function requiresIndividualEvidence(value: string) {
  return value === "individual" || value === "ambas";
}

export function requiresGeneralEvidence(value: string) {
  return value === "general" || value === "ambas";
}

export function requiresFormValidation(value: string) {
  return value === "formulario_enviado" || value === "formulario_aprobado";
}

export function validHttpsUrl(value: unknown, label: string, required = false) {
  const raw = typeof value === "string" ? value.trim().slice(0, 1000) : "";
  if (!raw) {
    if (required) throw new Error(`${label} es obligatorio.`);
    return null;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label} debe ser una dirección HTTPS válida.`);
  }
}

export function normalizeDocument(value: unknown) {
  return typeof value === "string" ? value.replace(/[.\s-]/g, "").trim().toUpperCase().slice(0, 40) : "";
}
