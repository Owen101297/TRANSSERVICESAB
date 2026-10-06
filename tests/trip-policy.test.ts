import assert from "node:assert/strict";
import test from "node:test";
import { applyTripPolicy, TripPolicyError } from "../lib/trip-policy.ts";
import type { SessionUser } from "../lib/session.ts";
import { createViaje, updateViaje } from "../public/apps/viajes/js/api-client.js";

const driver: SessionUser = { id: "driver", nombre: "Conductor de prueba", documento: "test-driver", perfiles: ["conductor"], rolPrincipal: "conductor" };
const hseq = { ...driver, id: "hseq", perfiles: ["hseq"], rolPrincipal: "hseq" as const };
const admin = { ...driver, id: "admin", perfiles: ["administrativo"], rolPrincipal: "administrativo" as const };
const coordinator = { ...driver, id: "coordinator", perfiles: ["coordinador"], rolPrincipal: "coordinador" as const };
const low = { rDistancia: 1, rClima: 2, rVehiculos: 1, rVia: 1, rCom: 0, rFatiga: 1, rHora: 1 };
const medium = { ...low, rDistancia: 8, rClima: 4, rHora: 4 };
const high = { ...medium, rClima: 8, rFatiga: 6 };
const pending = (riskInputs = high) => ({ conductorId: driver.id, estado: "Pendiente HSE", riskInputs });
const fails = (fn: () => unknown, status: number) => assert.throws(fn, (e) => e instanceof TripPolicyError && e.status === status);

test("el servidor calcula el riesgo y no acepta el score o nivel declarados", () => {
  const result = applyTripPolicy(driver, { riskInputs: high, riskScore: 0, riskLevel: "BAJO" });
  assert.equal(result.riskScore, 28);
  assert.equal(result.estado, "Pendiente HSE");
  assert.equal(result.riskLevel, "ALTO (CRÍTICO)");
  fails(() => applyTripPolicy(driver, { riskInputs: high, estado: "Autorizado" }), 409);
});

test("los factores ausentes, inválidos o fuera de catálogo se rechazan", () => {
  for (const inputs of [{}, { ...low, rHora: -1 }, { ...low, rHora: "1" }, null, []]) {
    fails(() => applyTripPolicy(driver, { riskInputs: inputs }), 400);
  }
});

test("el conductor solo puede operar sus viajes y no puede aportar firmas de HSEQ o gerencia", () => {
  fails(() => applyTripPolicy(driver, { estado: "finalizado" }, { ...pending(), conductorId: "other" }), 403);
  for (const role of ["hse", "gerencia"]) {
    for (const payload of [{ signatures: { [role]: "forged" } }, { signatures: { [role]: "forged" }, estado: "Autorizado" }]) {
      fails(() => applyTripPolicy(driver, payload, pending()), 403);
      fails(() => applyTripPolicy(driver, { ...payload, riskInputs: high }), 403);
    }
  }
  fails(() => applyTripPolicy(coordinator, { signatures: { hse: "forged" } }, pending()), 403);
});

test("HSEQ autoriza riesgo medio; riesgo alto exige perfil administrativo", () => {
  const approved = applyTripPolicy(hseq, { estado: "Autorizado", signatures: { hse: "signature" } }, pending(medium));
  assert.equal(approved.riskScore, 19);
  assert.equal(approved.estado, "Autorizado");
  fails(() => applyTripPolicy(hseq, { estado: "Autorizado", signatures: { hse: "signature" } }, pending()), 409);
  fails(() => applyTripPolicy(hseq, { estado: "Autorizado", signatures: { gerencia: "signature" } }, pending()), 403);
  assert.equal(applyTripPolicy(admin, { estado: "Autorizado", signatures: { gerencia: "signature" } }, pending()).estado, "Autorizado");
});

test("la identidad y fecha del firmante vienen del servidor", () => {
  const now = new Date("2026-10-06T05:00:00Z");
  const result = applyTripPolicy(admin, { signatures: { gerencia: "signature", gerencia_fecha: "fake" } }, pending(), now);
  assert.equal(result.signatures.gerencia_actor_id, admin.id);
  assert.equal(result.signatures.gerencia_actor_rol, "administrativo");
  assert.equal(result.signatures.gerencia_fecha, now.toISOString());
  fails(() => applyTripPolicy(driver, { signatures: { gerencia_actor_id: admin.id } }, pending()), 403);
});

test("una firma histórica sin actor verificado no permite finalizar un viaje de alto riesgo", () => {
  fails(() => applyTripPolicy(driver, { estado: "finalizado" }, { ...pending(), estado: "Autorizado", signatures: { gerencia: "legacy" } }), 409);
});

test("cambiar los factores invalida la autorización, conservando la firma anterior", () => {
  const approved = applyTripPolicy(hseq, { estado: "Autorizado", signatures: { hse: "signature" } }, pending(medium));
  const changed = applyTripPolicy(driver, { riskInputs: high }, { conductorId: driver.id, ...approved });
  assert.equal(changed.estado, "Pendiente HSE");
  assert.equal(changed.signatures.hse, "signature");
  fails(() => applyTripPolicy(driver, { riskInputs: high, estado: "finalizado" }, { conductorId: driver.id, ...approved }), 409);
});

test("un conductor puede cerrar su viaje autorizado sin sobrescribir firmas", () => {
  const approved = applyTripPolicy(admin, { estado: "Autorizado", signatures: { gerencia: "signature" } }, pending());
  const result = applyTripPolicy(driver, { estado: "Finalizado", signatures: approved.signatures, riskInputs: { kmLlegada: 120 } }, { conductorId: driver.id, ...approved });
  assert.equal(result.estado, "finalizado");
  assert.deepEqual(result.signatures, approved.signatures);
});

test("los viajes nuevos no nacen cerrados y los ya cerrados no se reabren", () => {
  fails(() => applyTripPolicy(driver, { riskInputs: low, estado: "Finalizado" }), 409);
  fails(() => applyTripPolicy(driver, { estado: "Autorizado" }, { ...pending(low), estado: "finalizado" }), 409);
  fails(() => applyTripPolicy(admin, { estado: "Inventado" }, pending(low)), 400);
  fails(() => applyTripPolicy(admin, { estado: "finalizado" }, { ...pending(low), estado: "programado" }), 409);
});

test("las actualizaciones de cliente rechazadas no se presentan como éxito offline", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  try {
    await assert.rejects(createViaje({ riskInputs: high }), /No autorizado/);
    await assert.rejects(updateViaje("trip", { estado: "Autorizado" }), /No autorizado/);
  } finally { globalThis.fetch = original; }
});

test("el cliente envía todos los factores de riesgo del formulario", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.riskInputs, high);
    return new Response(JSON.stringify({ id: "trip" }), { status: 200 });
  };
  try { await createViaje({ riskInputs: high, riskScore: 28 }); }
  finally { globalThis.fetch = original; }
});
