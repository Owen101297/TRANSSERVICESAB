import type { SessionUser } from "./session";
import { FACTORES_RIESGO_VIAJE, calcularScoreRiesgo } from "./types/viaje-form.ts";

type JsonObject = Record<string, any>;
export interface TripSnapshot {
  conductorId: string;
  estado: string;
  riskInputs?: unknown;
  riskScore?: number | null;
  signatures?: unknown;
}

export class TripPolicyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "TripPolicyError";
  }
}

export function jsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TripPolicyError("Se esperaba un objeto JSON.", 400);
  }
  return value as JsonObject;
}

export function tripState(value: unknown): string {
  const states: Record<string, string> = {
    programado: "programado", pendiente: "Pendiente", "pendiente hse": "Pendiente HSE",
    autorizado: "Autorizado", en_curso: "en_curso", finalizado: "finalizado", con_novedad: "con_novedad",
  };
  const state = states[String(value).trim().toLowerCase()];
  if (!state) throw new TripPolicyError("Estado de viaje inválido.", 400);
  return state;
}

export function assertTripOwner(session: SessionUser, trip: Pick<TripSnapshot, "conductorId">) {
  if (session.rolPrincipal === "conductor" && trip.conductorId !== session.id) {
    throw new TripPolicyError("No autorizado para este viaje.", 403);
  }
}

function evaluateRisk(inputs: JsonObject) {
  const factors: Record<string, number> = {};
  for (const factor of FACTORES_RIESGO_VIAJE) {
    const value = inputs[factor.id];
    if (typeof value !== "number" || !factor.opciones.some((option) => option.valor === value)) {
      throw new TripPolicyError("Completa la evaluación de riesgo con valores válidos.", 400);
    }
    factors[factor.id] = value;
  }
  return { ...calcularScoreRiesgo(factors), key: JSON.stringify(factors) };
}

const signatureRoles = ["conductor", "hse", "gerencia"] as const;
const signatureFields = signatureRoles.flatMap((role) => [role, `${role}_fecha`, `${role}_actor_id`, `${role}_actor_rol`, `${role}_risk_key`]);

function mergeSignatures(session: SessionUser, input: unknown, current: JsonObject, riskKey: string, now: Date) {
  const requested = input === undefined ? {} : jsonObject(input);
  const merged = { ...current };
  for (const [key, value] of Object.entries(requested)) {
    if (!signatureFields.includes(key)) throw new TripPolicyError("Campo de firma inválido.", 400);
    if (key.endsWith("_actor_id") || key.endsWith("_actor_rol") || key.endsWith("_risk_key")) {
      if (value !== current[key]) throw new TripPolicyError("La identidad del firmante se registra en el servidor.", 403);
    }
  }
  for (const role of signatureRoles) {
    if (!(role in requested)) continue;
    // Las pantallas antiguas reenvían firmas existentes; conservarlas no concede autorización nueva.
    if (requested[role] === current[role] && current[`${role}_risk_key`] === riskKey) continue;
    if (role === "hse" && !["hseq", "administrativo"].includes(session.rolPrincipal)) {
      throw new TripPolicyError("Solo HSEQ o administración puede firmar la autorización HSEQ.", 403);
    }
    if (role === "gerencia" && session.rolPrincipal !== "administrativo") {
      throw new TripPolicyError("La autorización gerencial requiere el perfil administrativo.", 403);
    }
    if (typeof requested[role] !== "string" || !requested[role].trim()) {
      throw new TripPolicyError("La firma no puede estar vacía.", 400);
    }
    merged[role] = requested[role];
    merged[`${role}_fecha`] = now.toISOString();
    merged[`${role}_actor_id`] = session.id;
    merged[`${role}_actor_rol`] = session.rolPrincipal;
    merged[`${role}_risk_key`] = riskKey;
  }
  return merged;
}

function hasApproval(signatures: JsonObject, role: "hse" | "gerencia", riskKey: string) {
  const allowed = role === "gerencia" ? ["administrativo"] : ["hseq", "administrativo"];
  return Boolean(signatures[role] && signatures[`${role}_actor_id`] &&
    allowed.includes(signatures[`${role}_actor_rol`]) && signatures[`${role}_risk_key`] === riskKey);
}

/** Única política de escritura para API y acciones: nunca confiar en estado, score o actor del cliente. */
export function applyTripPolicy(
  session: SessionUser,
  input: JsonObject,
  existing?: TripSnapshot,
  now = new Date(),
) {
  if (existing) {
    assertTripOwner(session, existing);
    if (tripState(existing.estado) === "finalizado") {
      throw new TripPolicyError("El viaje ya está cerrado; no se puede sobrescribir.", 409);
    }
  }
  const previousInputs = existing?.riskInputs ? jsonObject(existing.riskInputs) : {};
  const incomingInputs = input.riskInputs ?? input.risk_inputs;
  const riskInputs = { ...previousInputs, ...(incomingInputs === undefined ? {} : jsonObject(incomingInputs)) };
  const risk = evaluateRisk(riskInputs);
  const signatures = mergeSignatures(session, input.signatures,
    existing?.signatures ? jsonObject(existing.signatures) : {}, risk.key, now);
  const approved = risk.score <= 15 || hasApproval(signatures, "gerencia", risk.key) ||
    (risk.score <= 23 && hasApproval(signatures, "hse", risk.key));
  const requestedState = input.estado === undefined ? undefined : tripState(input.estado);
  const currentState = existing ? tripState(existing.estado) : undefined;
  let state = requestedState ?? currentState ?? (approved ? "Autorizado" : "Pendiente HSE");

  if (!existing && ["finalizado", "con_novedad"].includes(state)) {
    throw new TripPolicyError("Un viaje nuevo no puede registrarse como cerrado o con novedades.", 409);
  }
  if (["Autorizado", "en_curso", "con_novedad", "finalizado"].includes(state) && !approved) {
    if (requestedState) throw new TripPolicyError("El riesgo del viaje requiere autorización vigente.", 409);
    state = "Pendiente HSE";
  }
  if (state === "finalizado" && !["Autorizado", "en_curso", "con_novedad"].includes(currentState || "")) {
    throw new TripPolicyError("El viaje debe estar autorizado o en curso antes de finalizar.", 409);
  }
  if (state === "con_novedad" && !["Autorizado", "en_curso", "con_novedad"].includes(currentState || "")) {
    throw new TripPolicyError("No se pueden registrar novedades de un viaje pendiente de autorización.", 409);
  }
  if (currentState && ["en_curso", "con_novedad"].includes(currentState) && ["programado", "Pendiente", "Pendiente HSE"].includes(state) && approved) {
    throw new TripPolicyError("No se puede devolver un viaje activo a programación.", 409);
  }
  return { estado: state, riskScore: risk.score, riskLevel: risk.etiqueta, riskInputs, signatures };
}
