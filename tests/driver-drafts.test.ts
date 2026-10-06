import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("los borradores de viajes conservan la identidad y no se envían con otra cuenta", async () => {
  const source = readFileSync(new URL("../public/apps/viajes/js/api-client.js", import.meta.url), "utf8");
  const original = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
  const storage = new Map<string, string>();
  const identity = { id: "driver-a", documento: "DOC-A", nombre: "Prueba", rol: "conductor", placa: "ABC123" };
  Object.assign(globalThis, {
    window: { TransServicesReady: Promise.resolve(identity), addEventListener() {} },
    localStorage: { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) },
  });
  try {
    const client = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
    globalThis.fetch = async () => { throw new TypeError("Sin red"); };
    const pending = await client.createViaje({ conductorId: "forged", conductorDocumento: "forged", placa: "ABC123" });
    assert.equal(pending.offline, true);
    let queue = JSON.parse(storage.get("ts_viajes_offline_queue")!);
    assert.equal(queue[0].payload.conductorId, identity.id);
    assert.equal(queue[0].payload.conductorDocumento, identity.documento);
    queue.push({ payload: { conductorId: "driver-b", conductorDocumento: "DOC-B" } });
    storage.set("ts_viajes_offline_queue", JSON.stringify(queue));
    let sent = 0;
    globalThis.fetch = async (url, options) => {
      if (String(url).includes("contexto")) return Response.json({ success: true, usuario: identity });
      assert.equal(JSON.parse(String(options?.body)).conductorId, identity.id);
      sent++;
      return Response.json({ success: true });
    };
    await client.syncOfflineViajes();
    assert.equal(sent, 1);
    queue = JSON.parse(storage.get("ts_viajes_offline_queue")!);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].payload.conductorId, "driver-b");
    globalThis.fetch = async () => Response.json({ error: "No autorizado" }, { status: 403 });
    await assert.rejects(client.createViaje({ placa: "ABC123" }), /No autorizado/);
    assert.equal(JSON.parse(storage.get("ts_viajes_offline_queue")!).length, 1);
  } finally { Object.assign(globalThis, original); }
});
