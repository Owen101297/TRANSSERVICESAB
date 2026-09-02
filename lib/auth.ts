import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  documento: string;
  nombre: string;
  email?: string;
  perfiles: string[];
  rolPrincipal: "conductor" | "coordinador" | "hseq" | "administrativo";
  placaAsignada?: string | null;
}

const COOKIE_NAME = "transservices_session";

export function getRolPrincipal(perfiles: string[] = []): "conductor" | "coordinador" | "hseq" | "administrativo" {
  if (perfiles.includes("administrativo") || perfiles.includes("admin")) return "administrativo";
  if (perfiles.includes("hseq") || perfiles.includes("supervisor")) return "hseq";
  if (perfiles.includes("coordinador") || perfiles.includes("operaciones")) return "coordinador";
  return "conductor";
}

/**
 * Codifica una sesión en formato Base64 (compatible con Edge Runtime y Node)
 */
export function encodeSession(user: SessionUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 días de validez
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Decodifica y valida una sesión
 */
export function decodeSession(token: string): SessionUser | null {
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.exp && parsed.exp < Date.now())) {
      return null;
    }
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión actual desde las Cookies de Next.js (Server Components / Server Actions / Route Handlers)
 */
export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return decodeSession(token);
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
