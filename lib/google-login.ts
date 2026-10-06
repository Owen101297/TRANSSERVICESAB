import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

export const GOOGLE_FLOW_COOKIE = "transservices_google_flow";
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Sesión no configurada.");
  return new TextEncoder().encode(value);
}
export function googleConfigured() {
  return Boolean(process.env.GOOGLE_LOGIN_CLIENT_ID && process.env.GOOGLE_LOGIN_CLIENT_SECRET && process.env.PUBLIC_APP_URL);
}
export function googleRedirectUri() {
  if (!process.env.PUBLIC_APP_URL) throw new Error("Origen no configurado.");
  const origin = new URL(process.env.PUBLIC_APP_URL);
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") throw new Error("El acceso Google requiere HTTPS.");
  return new URL("/api/auth/google/callback", origin.origin).toString();
}
export async function beginGoogleFlow() {
  if (!googleConfigured()) throw new Error("Google pendiente de configuración.");
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const cookie = await new SignJWT({ state, nonce, verifier }).setProtectedHeader({ alg: "HS256" }).setIssuer("erp-google-flow").setAudience("erp-google-callback").setIssuedAt().setExpirationTime("10m").sign(secret());
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_LOGIN_CLIENT_ID!, redirect_uri: googleRedirectUri(), response_type: "code", scope: "openid email profile", state, nonce, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", prompt: "select_account" }).toString();
  return { cookie, url };
}
export async function readGoogleFlow(cookie: string, returnedState: string) {
  const { payload } = await jwtVerify(cookie, secret(), { algorithms: ["HS256"], issuer: "erp-google-flow", audience: "erp-google-callback" });
  if (typeof payload.state !== "string" || typeof payload.nonce !== "string" || typeof payload.verifier !== "string") throw new Error("Solicitud no válida.");
  const left = Buffer.from(payload.state); const right = Buffer.from(returnedState);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("Solicitud no válida.");
  return { nonce: payload.nonce, verifier: payload.verifier };
}
export function verifiedGoogleClaims(payload: Record<string, unknown>, nonce: string) {
  if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.sub !== "string" || !payload.sub || typeof payload.email !== "string" || !payload.email.includes("@")) throw new Error("Google no verificó la identidad.");
  return { subject: payload.sub, email: payload.email.toLowerCase(), nombre: typeof payload.name === "string" ? payload.name.slice(0, 200) : payload.email };
}
export async function exchangeGoogleCode(code: string, flow: { nonce: string; verifier: string }) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_LOGIN_CLIENT_ID!, client_secret: process.env.GOOGLE_LOGIN_CLIENT_SECRET!, redirect_uri: googleRedirectUri(), grant_type: "authorization_code", code_verifier: flow.verifier }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("No se pudo verificar Google.");
  const body = await response.json();
  if (typeof body.id_token !== "string") throw new Error("No se recibió identidad verificada.");
  return verifyGoogleIdToken(body.id_token, flow.nonce);
}
export async function verifyGoogleIdToken(token: string, nonce: string, key: Parameters<typeof jwtVerify>[1] = googleKeys) {
  const { payload } = await jwtVerify(token, key, { audience: process.env.GOOGLE_LOGIN_CLIENT_ID!, issuer: ["https://accounts.google.com", "accounts.google.com"], algorithms: ["RS256"], requiredClaims: ["exp", "iat", "sub", "nonce", "email", "email_verified"] });
  return verifiedGoogleClaims(payload, nonce);
}
