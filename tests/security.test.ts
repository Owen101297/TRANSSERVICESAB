import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { hashPassword, isPasswordHash, isStrongPassword, verifyPassword } from "../lib/password.ts";
import { decodeSession, encodeSession, type SessionUser } from "../lib/session.ts";
import { conductorIdentityFromSession, normalizeVehiclePlate } from "../lib/portal-validation.ts";
import { isValidWebhookApiKey } from "../lib/webhook-auth.ts";
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
