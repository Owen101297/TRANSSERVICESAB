import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

if (process.env.ERP_OPERATIONAL_STAGING_TEST !== '1' || process.env.PUBLIC_APP_URL !== 'https://erp-staging.owenai.uk') throw new Error('Requiere staging y habilitación explícita.');
const prisma = new PrismaClient();
const prefix = `operational-${randomUUID()}`;
const ids = ['admin', 'driver', 'other'].map(role => `${prefix}-${role}`);
const vehicleIds = [prefix+'-vehicle-a', prefix+'-vehicle-b'];
const plates = vehicleIds.map(() => 'Q'+randomUUID().replaceAll('-', '').slice(0, 5).toUpperCase());
const roles = {};
const cookies = {};
let checks = 0;
const risk = { rDistancia: 1, rClima: 2, rVehiculos: 1, rVia: 1, rCom: 0, rFatiga: 1, rHora: 1 };
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1EAAAAASUVORK5CYII=';
function token(actor) {
  const payload = Buffer.from(JSON.stringify({ ...actor, sessionVersion: 1, exp: Date.now()+600000 })).toString('base64url');
  return 'transservices_session='+payload+'.'+createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
}
async function request(role, method, path, body, expected=200) {
  const response = await fetch('http://127.0.0.1:3000'+path, { method, headers: { 'Content-Type': 'application/json', ...(cookies[role] ? { Cookie: cookies[role] } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual' });
  const data = await response.json();
  assert.equal(response.status, expected, method+' '+path+': '+JSON.stringify(data)); checks++;
  return { data, response };
}
const payload = plate => ({ placa: plate, conductorId: ids[2], conductorNombre: 'Identidad ajena', conductorDocumento: ids[2], odometroInicial: 100, fotoOdometroUrl: photo, fotoVehiculoUrl: photo });
try {
  for (const [index, role] of ['admin','driver','other'].entries()) {
    const profile = role === 'admin' ? 'administrativo' : 'conductor';
    const person = await prisma.persona.create({ data: { id: ids[index], nombres: 'Prueba', apellidos: role, numeroDocumento: ids[index], telefono: '', email: `${prefix}-${role}@example.invalid`, perfiles: [profile], fotoIniciales: 'QA', cuentaAcceso: { create: { estado: role === 'driver' ? 'pendiente' : 'activa' } } } });
    roles[role] = { id: person.id, documento: person.numeroDocumento, nombre: `${person.nombres} ${person.apellidos}`, perfiles: [profile], rolPrincipal: profile };
    if (role !== 'driver') cookies[role] = token(roles[role]);
  }
  for (const [index, id] of vehicleIds.entries()) await prisma.vehiculo.create({ data: { id, placa: index ? `${plates[index].slice(0,3)}-${plates[index].slice(3)}` : plates[index], marca: 'Prueba', modelo: 'Prueba', anio: 2026, capacidad: 1, tipo: 'automovil', contratistaNombre: '' } });
  await request(null, 'GET', '/api/portal-conductor/cambiar-vehiculo', undefined, 401);
  const activation = await request('admin', 'POST', '/api/admin/cuentas/activaciones', { personaIds: [ids[1]] }, 201);
  const activationToken = new URL(activation.data.activaciones[0].link).pathname.split('/').pop();
  await request(null, 'POST', '/api/auth/activate/'+activationToken, { password: 'PruebaOperativa2026!', confirmation: 'PruebaOperativa2026!' });
  const login = await request(null, 'POST', '/api/auth/login', { type: 'conductor', documento: ids[1], pin: 'PruebaOperativa2026!' });
  cookies.driver = login.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('driver', 'GET', '/api/portal-conductor/contexto')).data.asignacion, null);
  await request('driver', 'POST', '/api/portal-conductor/cambiar-vehiculo', { placa: plates[0], conductorId: ids[2] });
  assert.equal((await prisma.asignacion.findFirstOrThrow({ where: { placa: plates[0], estado: 'activa' } })).conductorId, ids[1]); checks++;
  const beforeAdminSelection = await prisma.asignacion.findFirstOrThrow({ where: { placa: plates[0], estado: 'activa' } });
  const adminSelection = await request('admin', 'POST', '/api/portal-conductor/cambiar-vehiculo', { placa: plates[0] });
  cookies.admin = adminSelection.response.headers.get('set-cookie').split(';')[0];
  const adminContext = (await request('admin', 'GET', '/api/portal-conductor/contexto')).data;
  assert.equal(adminContext.vehiculoActual.placa, plates[0]); assert.equal(adminContext.asignacion, null); assert.equal(adminContext.seleccionAdministrativa, true); checks++;
  assert.equal((await prisma.asignacion.findUniqueOrThrow({ where: { id: beforeAdminSelection.id } })).estado, 'activa'); checks++;
  assert.equal(await prisma.asignacion.count({ where: { conductorId: ids[0] } }), 0); checks++;
  assert.equal((await request('driver', 'GET', '/api/portal-conductor/contexto')).data.vehiculoActual.placa, plates[0]); checks++;
  await request('other', 'POST', '/api/portal-conductor/cambiar-vehiculo', { placa: plates[0] }, 400);
  await request('driver', 'POST', '/api/apps/viajes', { placa: plates[0], riskInputs: risk }, 409);
  const shift = await request('driver', 'POST', '/api/portal-conductor/turno', payload(plates[0]));
  assert.equal(shift.data.turno.conductorId, ids[1]); checks++;
  await request('driver', 'POST', '/api/portal-conductor/turno', payload(plates[0]), 409);
  await request('driver', 'POST', '/api/apps/preoperacional', { placa: plates[0], checklist: {} }, 400);
  const definitions = readFileSync('/app/lib/types/preoperacional.ts', 'utf8');
  const checklist = Object.fromEntries([...definitions.matchAll(/\{ id: "([a-g]_[^"]+)"/g)].map(match => [match[1], 'C']));
  assert.equal(Object.keys(checklist).length, 34);
  const inspection = await request('driver', 'POST', '/api/apps/preoperacional', { placa: plates[0], checklist, signature: photo, observaciones: 'Prueba aislada' });
  assert.equal((await prisma.inspeccionPreoperacional.findUniqueOrThrow({ where: { id: inspection.data.data.id } })).checklist._evidencia.firmaConductor, photo); checks++;
  await request('driver', 'POST', '/api/apps/viajes', { placa: plates[0], origen: 'Origen de prueba', destino: 'Destino de prueba', riskInputs: risk });
  await request('driver', 'POST', '/api/apps/preoperacional', { placa: plates[0], checklist: { ...checklist, a_llantas: 'NC' } });
  const context = (await request('driver', 'GET', '/api/portal-conductor/contexto')).data;
  assert.equal(context.jornada.preoperacional.estadoConcepto, 'no_apto');
  await request('driver', 'POST', '/api/apps/viajes', { placa: plates[0], riskInputs: risk }, 409);
  await request('driver', 'POST', '/api/portal-conductor/cambiar-vehiculo', { placa: plates[1] });
  const changed = (await request('driver', 'GET', '/api/portal-conductor/contexto')).data;
  assert.equal(changed.jornada.preoperacional, null); assert.equal(changed.jornada.turno, null); checks++;
  assert.equal((await prisma.asignacion.findFirstOrThrow({ where: { placa: plates[0], conductorId: ids[1] } })).estado, 'finalizada'); checks++;
  await request('driver', 'POST', '/api/portal-conductor/turno', payload(plates[1]));
  await request('driver', 'POST', '/api/apps/preoperacional', { placa: plates[1], checklist });
  for (const app of ['lavado','aseo','extintor','botiquin','encuesta']) {
    const result = await request('driver', 'POST', '/api/apps/'+app, { placa: plates[1], conductorId: ids[2], conductorNombre: 'Identidad ajena', conductorDocumento: ids[2], valor: 5000, empresa: 'Prueba', checklist: [{ item: 'Prueba', estado: 'SI' }], firmaConductor: photo, firmaUrl: photo, calificacionGeneral: 4, limpiezaVehiculo: 4, atencionConductor: 4, puntualidad: 4, seguridadConfort: 4, seriaRecomendado: 'SI' });
    assert.equal((result.data.data || result.data.registro).conductorDocumento, ids[1]); checks++;
  }
  await request('driver', 'POST', '/api/apps/encuesta', { placa: plates[1] }, 400);
  const history = (await request('driver', 'GET', '/api/portal-conductor/historial')).data;
  assert.equal(history.jornadas.length, 2); assert.equal(history.apps.length, 5); checks++;
  assert.equal((await request('other', 'GET', '/api/portal-conductor/historial')).data.jornadas.length, 0); checks++;
  const currentShift = (await request('driver', 'GET', '/api/portal-conductor/contexto')).data.jornada.turno;
  await request('other', 'PATCH', '/api/portal-conductor/turno', { id: currentShift.id, odometroFinal: 120, fotoOdometroFinalUrl: photo }, 403);
  await request('driver', 'PATCH', '/api/portal-conductor/turno', { id: currentShift.id, odometroFinal: 50, fotoOdometroFinalUrl: photo }, 400);
  const ownTrip = await prisma.viaje.findFirstOrThrow({ where: { conductorId: ids[1] } });
  await prisma.viaje.update({ where: { id: ownTrip.id }, data: { estado: 'en_curso' } });
  await request('driver', 'PATCH', '/api/portal-conductor/turno', { id: currentShift.id, odometroFinal: 120, fotoOdometroFinalUrl: photo }, 409);
  await prisma.viaje.update({ where: { id: ownTrip.id }, data: { estado: 'cerrado' } });
  await request('driver', 'PATCH', '/api/portal-conductor/turno', { id: currentShift.id, odometroFinal: 120, fotoOdometroFinalUrl: photo });
  await request('driver', 'PATCH', '/api/portal-conductor/turno', { id: currentShift.id, odometroFinal: 120, fotoOdometroFinalUrl: photo }, 409);
  assert.equal((await prisma.vehiculo.findUniqueOrThrow({ where: { id: vehicleIds[1] } })).odometroActual, 120); checks++;
  assert.equal((await request('driver', 'GET', '/api/portal-conductor/contexto')).data.jornada.turno, null); checks++;
  await request('driver', 'POST', '/api/apps/viajes', { placa: plates[1], riskInputs: risk }, 409);
  console.log(JSON.stringify({ passed: true, checks, journey: 'activación, login, selección propia, apertura, inspección, no apto, cambio de vehículo y cinco apps' }));
} finally {
  // Solo datos sintéticos creados con los identificadores únicos de esta ejecución.
  await prisma.$transaction(async tx => {
    await tx.novedadViaje.deleteMany({ where: { viaje: { conductorId: { in: ids } } } });
    await tx.viaje.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.hallazgoHseq.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.inspeccionPreoperacional.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.turnoDespacho.deleteMany({ where: { conductorId: { in: ids } } });
    for (const model of ['controlLavado','controlAseo','controlExtintor','controlBotiquin','encuestaRespuesta']) await tx[model].deleteMany({ where: { conductorDocumento: { in: ids } } });
    await tx.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await tx.asignacion.deleteMany({ where: { conductorId: { in: ids } } });
    await tx.vehiculo.deleteMany({ where: { id: { in: vehicleIds } } });
    await tx.persona.deleteMany({ where: { id: { in: ids } } });
  });
  await prisma.$disconnect();
}
