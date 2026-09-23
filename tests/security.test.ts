import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, isPasswordHash, isStrongPassword, verifyPassword } from "../lib/password.ts";
import { decodeSession, encodeSession, type SessionUser } from "../lib/session.ts";

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
