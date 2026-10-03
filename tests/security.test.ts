import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { hashPassword, isPasswordHash, isStrongPassword, verifyPassword } from "../lib/password.ts";
import { decodeSession, encodeSession, type SessionUser } from "../lib/session.ts";
import { conductorIdentityFromSession, normalizeVehiclePlate } from "../lib/portal-validation.ts";
import { isValidWebhookApiKey } from "../lib/webhook-auth.ts";
import { resolvePublicOrigin } from "../lib/request-origin.ts";
import {
  actionRequiresReason,
  canApplyAccountAction,
  enabledAccountState,
} from "../lib/account-lifecycle.ts";
import {
  buildDocumentAttachmentScope,
  detectDocumentMimeType,
  sanitizeDocumentName,
} from "../lib/storage/document-validation.ts";

process.env.SESSION_SECRET = "test-session-secret-with-more-than-32-characters";

const user: SessionUser = {
  id: "person-1",
  documento: "1000000000",
  nombre: "Usuario de prueba",
  perfiles: ["conductor"],
  rolPrincipal: "conductor",
};

test("las sesiones firmadas se verifican y rechazan alteraciones", async () => {
  const token = await encodeSession(user);
  assert.equal((await decodeSession(token))?.id, user.id);

  const [payload, signature] = token.split(".");
  const altered = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${signature}`;
  assert.equal(await decodeSession(altered), null);
});

test("las claves se almacenan con scrypt y se comparan correctamente", async () => {
  const hash = await hashPassword("una-clave-segura");
  assert.equal(isPasswordHash(hash), true);
  assert.equal(await verifyPassword("una-clave-segura", hash), true);
  assert.equal(await verifyPassword("incorrecta", hash), false);
});

test("la política rechaza claves heredadas débiles", () => {
  assert.equal(isStrongPassword("1234"), false);
  assert.equal(isStrongPassword("ClaveSegura9!"), true);
});

test("la validación documental usa la firma binaria y no solo la extensión", () => {
  assert.equal(detectDocumentMimeType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), "application/pdf");
  assert.equal(detectDocumentMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectDocumentMimeType(new TextEncoder().encode("contenido ejecutable")), null);
});

test("los nombres de documentos se normalizan antes de almacenarse", () => {
  assert.equal(sanitizeDocumentName("../../Cédula Final.PDF", "pdf"), "cedula-final.pdf");
});

test("el alcance documental vincula siempre archivo, tipo de entidad y propietario", () => {
  assert.deepEqual(buildDocumentAttachmentScope("persona", "person-1", "doc-1"), {
    entidadTipo: "persona",
    entidadId: "person-1",
    id: "doc-1",
  });
  assert.throws(() => buildDocumentAttachmentScope("vehiculo", "vehicle-1", "  "));
});

test("el portal ignora la identidad suministrada por un conductor", () => {
  assert.deepEqual(
    conductorIdentityFromSession(user, {
      id: "otra-persona",
      name: "Identidad manipulada",
      document: "9999999999",
    }),
    { id: user.id, name: user.nombre, document: user.documento },
  );
  assert.equal(normalizeVehiclePlate(" abc-123 "), "ABC123");
});

test("los webhooks comparan secretos de forma segura y rechazan claves ausentes", () => {
  assert.equal(isValidWebhookApiKey("clave-correcta", "clave-correcta"), true);
  assert.equal(isValidWebhookApiKey("clave-incorrecta", "clave-correcta"), false);
  assert.equal(isValidWebhookApiKey(null, "clave-correcta"), false);
  assert.equal(isValidWebhookApiKey("clave-correcta", undefined), false);
});

test("las API operativas restantes aplican autorización en el handler", () => {
  const protectedHandlers = [
    ["app/api/capacitaciones/route.ts", ["GET", "POST", "PATCH", "DELETE"]],
    ["app/api/capacitaciones/asistir/route.ts", ["POST"]],
    ["app/api/reportes/sisi-pesv/route.ts", ["GET"]],
    ["app/api/portal-conductor/cambiar-vehiculo/route.ts", ["GET", "POST"]],
    ["app/api/portal-conductor/turno/route.ts", ["GET", "POST"]],
    ["app/api/portal-conductor/contexto/route.ts", ["GET"]],
  ] as const;

  for (const [routeFile, methods] of protectedHandlers) {
    const source = readFileSync(join(process.cwd(), routeFile), "utf8");
    for (const method of methods) {
      const marker = `export async function ${method}`;
      const opening = source.indexOf(marker);
      assert.notEqual(opening, -1, `${routeFile} debe exponer ${method}`);
      assert.match(
        source.slice(opening, opening + 350),
        /requireApiSession\(|requireStaff\(/,
        `${routeFile} ${method} debe autorizar dentro del handler`,
      );
    }
  }
});

test("las pantallas Next del portal no usan localStorage como fuente de identidad", () => {
  const portalPages = [
    "app/portal-conductor/page.tsx",
    "app/portal-conductor/turno/page.tsx",
    "app/portal-conductor/preoperacional/page.tsx",
    "app/portal-conductor/capacitaciones/page.tsx",
  ];

  for (const page of portalPages) {
    const source = readFileSync(join(process.cwd(), page), "utf8");
    assert.doesNotMatch(
      source,
      /localStorage\.getItem\(["'](?:transservices_conductor|ab_driver_session)["']\)/,
      `${page} debe obtener identidad desde el servidor`,
    );
  }
});

test("todos los handlers de /api/apps exigen sesion o rol antes de procesar datos", () => {
  const routeFiles = [
    "aseo/route.ts",
    "asistencia/route.ts",
    "asistencia/config/route.ts",
    "botiquin/route.ts",
    "encuesta/route.ts",
    "extintor/route.ts",
    "lavado/route.ts",
    "preoperacional/route.ts",
    "registros/route.ts",
    "viajes/route.ts",
    "viajes/preoperacional/route.ts",
    "viajes/recursos/route.ts",
  ];

  for (const routeFile of routeFiles) {
    const source = readFileSync(join(process.cwd(), "app/api/apps", routeFile), "utf8");
    const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\([^)]*\) \{/g)];
    assert.ok(handlers.length > 0, `${routeFile} debe exponer al menos un handler`);

    for (const handler of handlers) {
      const opening = handler.index ?? 0;
      const authorizationPrefix = source.slice(opening, opening + 350);
      assert.match(
        authorizationPrefix,
        /requireApiSession\(|requireStaff\(/,
        `${routeFile} ${handler[1]} debe autenticar antes de procesar la solicitud`,
      );
    }
  }
});

test("la administración de activaciones exige rol administrativo y nunca persiste el token original", () => {
  const source = readFileSync(join(process.cwd(), "app/api/admin/cuentas/activaciones/route.ts"), "utf8");
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const activationModel = schema.match(/model EnlaceActivacion \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(source, /requireStaff\(\["administrativo"\]\)/);
  assert.match(source, /tokenHash/);
  assert.match(activationModel, /tokenHash\s+String\s+@unique/);
  assert.doesNotMatch(activationModel, /^\s*token\s+/m);
});

test("la activación pública valida vigencia, uso único y fortaleza de la clave", () => {
  const source = readFileSync(join(process.cwd(), "app/api/auth/activate/[token]/route.ts"), "utf8");
  assert.match(source, /hashActivationToken\(token\)/);
  assert.match(source, /expiraAt:\s*\{\s*gt:\s*now\s*\}/);
  assert.match(source, /usadoAt:\s*null/);
  assert.match(source, /isStrongPassword\(password\)/);
  assert.match(source, /updateMany\(/);
});

test("el ciclo administrativo de cuentas aplica transiciones explícitas", () => {
  assert.equal(canApplyAccountAction("activa", "block"), true);
  assert.equal(canApplyAccountAction("bloqueada", "unlock"), true);
  assert.equal(canApplyAccountAction("suspendida", "reactivate"), true);
  assert.equal(canApplyAccountAction("suspendida", "revoke_sessions"), false);
  assert.equal(canApplyAccountAction("activa", "reactivate"), false);
  assert.equal(actionRequiresReason("block"), true);
  assert.equal(actionRequiresReason("suspend"), true);
  assert.equal(actionRequiresReason("unlock"), false);
  assert.equal(enabledAccountState(true), "activa");
  assert.equal(enabledAccountState(false), "pendiente");
});

test("la revocación de sesiones se valida contra una versión persistida", () => {
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const auth = readFileSync(join(process.cwd(), "lib/auth.ts"), "utf8");
  const login = readFileSync(join(process.cwd(), "app/api/auth/login/route.ts"), "utf8");
  const lifecycle = readFileSync(join(process.cwd(), "app/api/admin/cuentas/estado/route.ts"), "utf8");

  assert.match(schema, /sessionVersion\s+Int\s+@default\(1\)/);
  assert.match(auth, /tokenVersion\s*!==\s*persona\.cuentaAcceso\.sessionVersion/);
  assert.match(login, /sessionVersion:\s*persona\.cuentaAcceso\?\.sessionVersion\s*\?\?\s*1/);
  assert.match(lifecycle, /requireStaff\(\["administrativo"\]\)/);
  assert.match(lifecycle, /personaId\s*===\s*auth\.session\.id/);
  assert.match(lifecycle, /sessionVersion:\s*\{\s*increment:\s*1\s*\}/);
});

test("los enlaces administrativos respetan el origen público del proxy", () => {
  const request = new Request("https://localhost:8080/api/admin/cuentas/activaciones", {
    headers: {
      "x-forwarded-host": "staging.example.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(resolvePublicOrigin(request), "https://staging.example.com");
});

test("el registro tokenizado de asistencia es público sin abrir las APIs administrativas", () => {
  const source = readFileSync(join(process.cwd(), "proxy.ts"), "utf8");
  const publicRoute = readFileSync(
    join(process.cwd(), "app/api/asistencia/publica/[token]/route.ts"),
    "utf8",
  );

  assert.match(source, /pathname\.startsWith\("\/api\/asistencia\/publica\/"\)/);
  assert.match(source, /pathname\.startsWith\("\/asistir\/"\)/);
  assert.doesNotMatch(source, /pathname\.startsWith\("\/api\/eventos-asistencia"\)/);
  assert.match(publicRoute, /tokenRegistro:\s*token/);
  assert.match(publicRoute, /consumeRateLimit\(/);
  assert.match(publicRoute, /validarFirmaManuscrita\(/);
});

test("la creación rápida de actividades conserva aprobación y reglas en el servidor", () => {
  const source = readFileSync(join(process.cwd(), "app/api/eventos-asistencia/route.ts"), "utf8");

  assert.match(source, /body\.aprobarAlCrear === true && esAdministradorAsistencia\(auth\.session\)/);
  assert.match(source, /estado: aprobarAlCrear \? "programado" : "borrador"/);
  assert.match(source, /objetivo: textoRequerido\(body\.objetivo \|\| objetivoSugerido/);
  assert.match(source, /requiereFirma: true/);
  assert.match(source, /requiereFoto: modalidad === "remota"/);
});

test("la interfaz de asistencia usa creación progresiva e inicio unificado", () => {
  const source = readFileSync(
    join(process.cwd(), "components/asistencia/EventosAsistenciaClient.tsx"),
    "utf8",
  );

  assert.match(source, /Agregar detalles opcionales/);
  assert.match(source, /Convocar personal ahora/);
  assert.match(source, /Crear y copiar enlace/);
  assert.match(source, /async function startAndOpenRegistration\(\)/);
  assert.match(source, /Iniciar y abrir registro/);
});

test("la evidencia remota se autoriza, valida y archiva fuera del ERP", () => {
  const publicEvidence = readFileSync(
    join(process.cwd(), "app/api/asistencia/publica/[token]/evidencia/route.ts"),
    "utf8",
  );
  const adminEvidence = readFileSync(
    join(process.cwd(), "app/api/eventos-asistencia/[id]/evidencias/route.ts"),
    "utf8",
  );
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

  assert.match(publicEvidence, /consumeRateLimit\(/);
  assert.match(publicEvidence, /validarTokenEvidencia\(/);
  assert.match(publicEvidence, /detectDocumentMimeType\(/);
  assert.match(publicEvidence, /uploadEventEvidenceToDrive\(/);
  assert.doesNotMatch(publicEvidence, /storeDocumentFile\(/);
  assert.match(adminEvidence, /uploadEventEvidenceToDrive\(/);
  assert.doesNotMatch(adminEvidence, /storeDocumentFile\(/);
  assert.match(schema, /driveFileId\s+String\?\s+@unique/);
  assert.match(schema, /participanteId\s+String\?/);
});

test("la modalidad remota exige material y ofrece collage y entrega controlada", () => {
  const api = readFileSync(join(process.cwd(), "app/api/eventos-asistencia/route.ts"), "utf8");
  const attendance = readFileSync(
    join(process.cwd(), "components/asistencia/RegistroAsistenciaClient.tsx"),
    "utf8",
  );

  assert.match(api, /modalidad === "remota" && !materialUrl/);
  assert.match(attendance, /generateEvidenceCollage\(/);
  assert.match(attendance, /Compartir por WhatsApp/);
  assert.match(attendance, /capture="user"/);
  assert.match(attendance, /La selfie original no se sube por separado/);
});
