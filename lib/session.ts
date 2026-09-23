export interface SessionUser {
  id: string;
  documento: string;
  nombre: string;
  email?: string;
  perfiles: string[];
  rolPrincipal: "conductor" | "coordinador" | "hseq" | "administrativo";
  placaAsignada?: string | null;
  mustChangePassword?: boolean;
}

export const AUTH_COOKIE_NAME = "transservices_session";

const encoder = new TextEncoder();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "development-only-session-secret-change-me";
  }

  throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
}

function toBase64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function getRolPrincipal(perfiles: string[] = []): "conductor" | "coordinador" | "hseq" | "administrativo" {
  if (perfiles.includes("administrativo") || perfiles.includes("admin")) return "administrativo";
  if (perfiles.includes("hseq") || perfiles.includes("supervisor")) return "hseq";
  if (perfiles.includes("coordinador") || perfiles.includes("operaciones")) return "coordinador";
  return "conductor";
}

/**
 * Codifica una sesión de forma segura y 100% compatible con Edge Runtime y Node
 */
export async function encodeSession(user: SessionUser): Promise<string> {
  const payload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 días
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    encoder.encode(encodedPayload)
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Decodifica una sesión de forma segura
 */
export async function decodeSession(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const [encodedPayload, encodedSignature, ...rest] = token.split(".");
    if (!encodedPayload || !encodedSignature || rest.length > 0) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      fromBase64Url(encodedSignature).buffer as ArrayBuffer,
      encoder.encode(encodedPayload)
    );
    if (!valid) return null;
    const json = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const parsed = JSON.parse(json);
    if (!parsed || (parsed.exp && parsed.exp < Date.now())) {
      return null;
    }
    return parsed as SessionUser;
  } catch {
    return null;
  }
}
