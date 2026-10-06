import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { SignJWT, generateKeyPair } from "jose";
import { getRolPrincipal } from "../lib/session.ts";
test("solo hay dos roles efectivos y se conservan perfiles laborales históricos", () => {
  for (const role of ["hseq", "supervisor", "coordinador", "operaciones", "administrativo", "admin"]) assert.equal(getRolPrincipal([role]), "administrativo");
  assert.equal(getRolPrincipal(["conductor"]), "conductor");
  assert.equal(getRolPrincipal(["hseq"], "conductor"), "conductor");
  assert.equal(getRolPrincipal(["conductor"], "administrativo"), "administrativo");
});
test("OAuth verifica estado, nonce, firma, audiencia, emisor y correo antes de aceptar identidad", async () => {
  const keys = ["SESSION_SECRET", "GOOGLE_LOGIN_CLIENT_ID", "GOOGLE_LOGIN_CLIENT_SECRET", "PUBLIC_APP_URL"];
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { SESSION_SECRET: "test-google-secret-of-more-than-32-characters", GOOGLE_LOGIN_CLIENT_ID: "test-client", GOOGLE_LOGIN_CLIENT_SECRET: "test-client-secret", PUBLIC_APP_URL: "https://erp-staging.owenai.uk" });
  const directory = await mkdtemp(join(process.cwd(), "tests/.google-test-"));
  try {
    const bundle = await build({ entryPoints: ["lib/google-login.ts"], bundle: true, platform: "node", format: "esm", packages: "external", write: false, plugins: [{ name: "server-only-test", setup(builder) { builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "empty" })); builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};" })); } }] });
    const file = join(directory, "google.mjs"); await writeFile(file, bundle.outputFiles[0].text);
    const google = await import(pathToFileURL(file).href);
    const started = await google.beginGoogleFlow(); const params = started.url.searchParams;
    assert.equal(params.get("scope"), "openid email profile"); assert.equal(params.get("code_challenge_method"), "S256");
    const flow = await google.readGoogleFlow(started.cookie, params.get("state"));
    await assert.rejects(google.readGoogleFlow(started.cookie, "forged"));
    await assert.rejects(google.readGoogleFlow(started.cookie + "tampered", params.get("state")));
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = (claims = {}, audience = "test-client", issuer = "https://accounts.google.com", expires = "5m") => new SignJWT({ nonce: flow.nonce, email: "verified@example.invalid", email_verified: true, ...claims }).setProtectedHeader({ alg: "RS256" }).setSubject("google-test-subject").setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expires).sign(privateKey);
    assert.equal((await google.verifyGoogleIdToken(await token(), flow.nonce, publicKey)).subject, "google-test-subject");
    await assert.rejects(google.verifyGoogleIdToken(await token({ nonce: "wrong" }), flow.nonce, publicKey));
    await assert.rejects(google.verifyGoogleIdToken(await token({ email_verified: false }), flow.nonce, publicKey));
    await assert.rejects(google.verifyGoogleIdToken(await token({}, "another-client"), flow.nonce, publicKey));
    await assert.rejects(google.verifyGoogleIdToken(await token({}, "test-client", "https://forged.invalid"), flow.nonce, publicKey));
    await assert.rejects(google.verifyGoogleIdToken(await token({}, "test-client", "https://accounts.google.com", "-1s"), flow.nonce, publicKey));
    const other = await generateKeyPair("RS256");
    await assert.rejects(google.verifyGoogleIdToken(await token(), flow.nonce, other.publicKey));
  } finally { for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } await rm(directory, { recursive: true, force: true }); }
});
