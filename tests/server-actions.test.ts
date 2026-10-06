import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { encodeSession } from "../lib/session.ts";

test("las acciones comprueban sesión, rol, identidad y alcance dentro del servidor", async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousDatabase = process.env.DATABASE_URL;
  process.env.SESSION_SECRET = "phase-one-test-secret-with-at-least-32-characters";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  const driver = { id: "driver", documento: "test-driver", nombre: "Conductor de prueba", perfiles: ["conductor"], rolPrincipal: "conductor" as const, sessionVersion: 1 };
  const calls: { name: string; args: any }[] = [];
  const state: any = { token: null, profiles: ["conductor"], assigned: true, shift: true };
  const writes = () => calls.filter((c) => /create|update|transaction/i.test(c.name));
  const query = (name: string, result: (args: any) => any) => async (args: any) => { calls.push({ name, args }); return result(args); };
  state.prisma = {
    persona: { findUnique: query("persona.findUnique", () => ({ estado: "activo", perfiles: state.profiles, cuentaAcceso: { estado: "activa", sessionVersion: 1 } })) },
    asignacion: { findFirst: query("asignacion.findFirst", () => state.assigned ? { id: "assignment" } : null) },
    turnoDespacho: { findFirst: query("turno.findFirst", () => state.shift ? { id: "shift" } : null) },
    vehiculo: { findUnique: query("vehiculo.findUnique", () => ({ id: "vehicle" })) },
    inspeccionPreoperacional: {
      count: query("preop.count", () => 0), findMany: query("preop.findMany", () => []),
      create: query("preop.create", (args) => ({ ...args.data, id: "inspection", createdAt: new Date() })),
    },
    viaje: { findMany: query("viaje.findMany", () => []), findFirst: query("viaje.findFirst", () => null) },
    auditLog: { create: query("audit.create", () => ({})) },
    $transaction: async (fn: (client: any) => unknown) => { calls.push({ name: "transaction", args: {} }); return fn(state.prisma); },
  };
  (globalThis as any).erpActionTest = state;
  const directory = await mkdtemp(join(process.cwd(), "tests/.action-test-"));
  try {
    const bundle = await build({
      stdin: { contents: `export { getServerSession } from './lib/auth';
        export * from './lib/services/gps.service';
        export { createPreoperacionalDb, getPreoperacionalesDb } from './lib/services/preoperacional.service';
        export { getViajesDb, getViajeByIdDb } from './lib/services/operacion.service';`, resolveDir: process.cwd(), loader: "ts" },
      bundle: true, platform: "node", format: "esm", packages: "external", write: false,
      plugins: [{ name: "request-and-database-boundaries", setup(builder) {
        builder.onResolve({ filter: /^(server-only|next\/headers|next\/cache|@\/lib\/prisma|\.\/prisma)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents:
          args.path === "server-only" ? "export {};" :
          args.path === "next/cache" ? "export const revalidatePath = () => {};" :
          args.path === "next/headers" ? `export const cookies = async () => ({get: () => globalThis.erpActionTest.token ? {value: globalThis.erpActionTest.token} : undefined}); export const headers = async () => new Headers();` :
          "export const prisma = globalThis.erpActionTest.prisma;", loader: "js" }));
      } }],
    });
    const file = join(directory, "actions.mjs");
    await writeFile(file, bundle.outputFiles[0].text);
    const actions = await import(pathToFileURL(file).href);
    await assert.rejects(actions.marcarRetroalimentacionDb("event", "correo"), /No autenticado/);
    await assert.rejects(actions.createPreoperacionalDb({ placa: "TST123", checklist: {} }), /No autenticado/);
    await assert.rejects(actions.getViajesDb(), /No autenticado/);
    assert.equal(writes().length, 0);

    // Un token antiguo de administración no conserva privilegios si el perfil en DB cambió.
    state.token = await encodeSession({ ...driver, perfiles: ["administrativo"], rolPrincipal: "administrativo" });
    assert.equal((await actions.getServerSession()).rolPrincipal, "conductor");
    for (const name of ["getEventosGPSDb", "getEventosGPSConPaginacionDb", "getEventosNocturnosDb", "getResumenAlertasGPSDb", "getCalificacionesConductoresDb", "getCalificacionesMensualesDb"]) {
      await assert.rejects(actions[name](), /No autorizado/);
    }
    await assert.rejects(actions.marcarRetroalimentacionDb("event", "correo"), /No autorizado/);
    await assert.rejects(actions.registrarEventoGPSDb({ placa: "TST123", tipoEvento: "otro" }), /No autorizado/);
    await assert.rejects(actions.retroasignarEventosPlacaDb("TST123", "other", "Otro"), /No autorizado/);
    assert.equal(writes().length, 0);

    await actions.getPreoperacionalesDb({ conductorId: "other" });
    assert.equal(calls.find((c) => c.name === "preop.findMany")?.args.where.conductorId, driver.id);
    await actions.getViajesDb();
    assert.equal(calls.find((c) => c.name === "viaje.findMany")?.args.where.conductorId, driver.id);
    await actions.getViajeByIdDb("other-trip");
    assert.equal(calls.find((c) => c.name === "viaje.findFirst")?.args.where.conductorId, driver.id);

    state.assigned = false;
    await assert.rejects(actions.createPreoperacionalDb({ placa: "TST123", checklist: {} }), /No autorizado/);
    assert.equal(writes().length, 0);
    state.assigned = true;
    state.shift = false;
    await assert.rejects(actions.createPreoperacionalDb({ placa: "TST123", checklist: {} }), /abrir la jornada/);
    assert.equal(writes().length, 0);
    state.shift = true;
    await actions.createPreoperacionalDb({ placa: "TST123", checklist: {}, conductorId: "other", conductorNombre: "Otro", conductorDocumento: "other-document" });
    const inspection = calls.find((c) => c.name === "preop.create")?.args.data;
    assert.equal(inspection.conductorId, driver.id);
    assert.equal(inspection.conductorNombre, driver.nombre);
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
    delete (globalThis as any).erpActionTest;
    await rm(directory, { recursive: true, force: true });
  }
});
