import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Ejecución explícita dentro del contenedor de staging. Nunca usar datos reales ni producción.
if (process.env.ERP_PHASE1_STAGING_TEST !== "1" || process.env.PUBLIC_APP_URL !== "https://erp-staging.owenai.uk") {
  throw new Error("Esta prueba requiere staging y habilitación explícita.");
}
const prisma = new PrismaClient();
const prefix = `phase1-${randomUUID()}`;
const ids = ["driver", "other", "hseq", "admin"].map((role) => `${prefix}-${role}`);
const plate = `Q${randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`;
const low = { rDistancia: 1, rClima: 2, rVehiculos: 1, rVia: 1, rCom: 0, rFatiga: 1, rHora: 1 };
const medium = { ...low, rDistancia: 8, rClima: 4, rHora: 4 };
const high = { ...medium, rClima: 8, rFatiga: 6 };
const actors = {};
const tripIds = [];
let checks = 0;
function cookie(actor) {
  const payload = Buffer.from(JSON.stringify({ ...actor, exp: Date.now() + 600_000, sessionVersion: 1 })).toString("base64url");
  return `transservices_session=${payload}.${createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url")}`;
}
async function request(role, method, path, body, expected) {
  const response = await fetch(`http://127.0.0.1:3000${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(role ? { Cookie: cookie(actors[role]) } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}
const payload = (riskInputs) => ({ conductorId: actors.other.id, conductorNombre: "Identidad suministrada incorrecta", placa: plate,
  origen: "Origen de prueba", destino: "Destino de prueba", riskInputs, riskScore: 0, riskLevel: "BAJO" });
async function create(riskInputs) {
  const result = await request("driver", "POST", "/api/apps/viajes", payload(riskInputs), 200);
  tripIds.push(result.id);
  assert.equal(result.viaje.conductorId, actors.driver.id);
  return result;
}
async function unchanged(id, attempt) {
  const before = await prisma.viaje.findUniqueOrThrow({ where: { id } });
  await attempt();
  assert.deepEqual(await prisma.viaje.findUniqueOrThrow({ where: { id } }), before);
  checks++;
}
try {
  for (const [index, role] of ["driver", "other", "hseq", "admin"].entries()) {
    const profile = role === "admin" ? "administrativo" : role === "hseq" ? "hseq" : "conductor";
    const person = await prisma.persona.create({ data: { id: ids[index], nombres: "Prueba", apellidos: role,
      numeroDocumento: ids[index], telefono: "0000000000", email: `${role}@example.invalid`,
      perfiles: [profile], fotoIniciales: "QA", cuentaAcceso: { create: { estado: "activa" } } } });
    actors[role] = { id: person.id, documento: person.numeroDocumento, nombre: `${person.nombres} ${person.apellidos}`,
      perfiles: [profile], rolPrincipal: profile };
  }
  await prisma.vehiculo.create({ data: { id: prefix, placa: plate, marca: "Prueba", modelo: "Prueba", anio: 2026,
    capacidad: 1, tipo: "automovil", contratistaNombre: "Prueba aislada" } });
  await prisma.asignacion.create({ data: { id: prefix, conductorId: actors.driver.id, conductorNombre: actors.driver.nombre,
    vehiculoId: prefix, placa: plate, contratistaNombre: "Prueba aislada", tipoAsignacion: "fija", autorizacionOperativa: true, fechaInicio: new Date() } });
  await prisma.turnoDespacho.create({ data: { conductorId: actors.driver.id, conductorNombre: actors.driver.nombre,
    conductorDocumento: actors.driver.documento, placa: plate, vehiculoId: prefix, fecha: new Date(), hora: "12:00", odometroInicial: 100,
    fotoOdometroUrl: "https://example.invalid/test.jpg", fotoVehiculoUrl: "https://example.invalid/test.jpg" } });
  await prisma.inspeccionPreoperacional.create({ data: { conductorId: actors.driver.id, conductorNombre: actors.driver.nombre,
    vehiculoId: prefix, placa: plate, fecha: new Date(), checklist: {}, estadoConcepto: "apto" } });
  await request(null, "POST", "/api/apps/viajes", payload(high), 401);
  await request("driver", "POST", "/api/apps/viajes", { ...payload(high), signatures: { hse: "forged" } }, 403);
  await request("driver", "POST", "/api/apps/viajes", { ...payload(high), estado: "Autorizado" }, 409);
  await request("other", "POST", "/api/apps/viajes", payload(low), 403);
  const trip = await create(high);
  assert.equal(trip.viaje.riskScore, 28);
  assert.equal(trip.viaje.estado, "Pendiente HSE");
  for (const method of ["PUT", "PATCH"]) {
    await unchanged(trip.id, () => request("driver", method, `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado", signatures: { hse: "forged" } }, 403));
    await unchanged(trip.id, () => request("driver", method, `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado", signatures: { gerencia: "forged" } }, 403));
    await unchanged(trip.id, () => request("driver", method, `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado" }, 409));
    await unchanged(trip.id, () => request("other", method, `/api/apps/viajes?id=${trip.id}`, { estado: "finalizado" }, 403));
  }
  await unchanged(trip.id, () => request("hseq", "PUT", `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado", signatures: { hse: "staff-signature" } }, 409));
  await request("admin", "PUT", `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado", signatures: { gerencia: "admin-signature", gerencia_fecha: "fake" } }, 200);
  const approved = await prisma.viaje.findUniqueOrThrow({ where: { id: trip.id } });
  assert.equal(approved.signatures.gerencia_actor_id, actors.admin.id);
  assert.notEqual(approved.signatures.gerencia_fecha, "fake");
  const changed = await request("driver", "PUT", `/api/apps/viajes?id=${trip.id}`, { riskInputs: { rCom: 2 } }, 200);
  assert.equal(changed.viaje.estado, "Pendiente HSE");
  assert.equal(changed.viaje.signatures.gerencia, "admin-signature");
  await unchanged(trip.id, () => request("driver", "PATCH", `/api/apps/viajes?id=${trip.id}`, {}, 409));
  await request("admin", "PUT", `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado", signatures: { gerencia: "admin-signature" } }, 200);
  await request("driver", "PATCH", `/api/apps/viajes?id=${trip.id}`, {}, 200);
  const closed = await prisma.viaje.findUniqueOrThrow({ where: { id: trip.id } });
  assert.equal(closed.estado, "finalizado");
  assert.ok(closed.fechaLlegadaReal);
  await unchanged(trip.id, () => request("admin", "PUT", `/api/apps/viajes?id=${trip.id}`, { estado: "Autorizado" }, 409));

  const mediumTrip = await create(medium);
  await request("hseq", "PUT", `/api/apps/viajes?id=${mediumTrip.id}`, { estado: "Autorizado", signatures: { hse: "hseq-signature" } }, 200);
  await request("driver", "PUT", `/api/apps/viajes?id=${mediumTrip.id}`, { estado: "Finalizado", kmLlegada: 120 }, 200);
  await request("driver", "POST", "/api/apps/preoperacional", { placa: plate, checklist: {} }, 400);
  await request("driver", "GET", "/api/gps/eventos", undefined, 403);
  await prisma.persona.update({ where: { id: actors.admin.id }, data: { perfiles: ["conductor"] } });
  await request("admin", "GET", "/api/gps/eventos", undefined, 403);
  const audits = await prisma.auditLog.count({ where: { actorId: { in: ids }, entityType: "Viaje" } });
  assert.ok(audits >= 8);
  console.log(JSON.stringify({ passed: true, checks, persistentTripsChecked: tripIds.length, auditRecords: audits }));
} finally {
  // Borrar exclusivamente las filas sintéticas de esta ejecución; jamás datos ajenos.
  await prisma.$transaction(async (tx) => {
    await tx.novedadViaje.deleteMany({ where: { viajeId: { in: tripIds } } });
    await tx.viaje.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await tx.inspeccionPreoperacional.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.turnoDespacho.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.asignacion.deleteMany({ where: { id: prefix } });
    await tx.vehiculo.deleteMany({ where: { id: prefix } });
    await tx.persona.deleteMany({ where: { id: { in: ids } } });
  });
  await prisma.$disconnect();
}
