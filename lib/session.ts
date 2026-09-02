export interface SessionUser {
  id: string;
  documento: string;
  nombre: string;
  email?: string;
  perfiles: string[];
  rolPrincipal: "conductor" | "coordinador" | "hseq" | "administrativo";
  placaAsignada?: string | null;
}

export const AUTH_COOKIE_NAME = "transservices_session";

export function getRolPrincipal(perfiles: string[] = []): "conductor" | "coordinador" | "hseq" | "administrativo" {
  if (perfiles.includes("administrativo") || perfiles.includes("admin")) return "administrativo";
  if (perfiles.includes("hseq") || perfiles.includes("supervisor")) return "hseq";
  if (perfiles.includes("coordinador") || perfiles.includes("operaciones")) return "coordinador";
  return "conductor";
}

/**
 * Codifica una sesión de forma segura y 100% compatible con Edge Runtime y Node
 */
export function encodeSession(user: SessionUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 días
  };
  const json = JSON.stringify(payload);
  if (typeof btoa !== "undefined") {
    return btoa(encodeURIComponent(json));
  }
  return Buffer.from(json).toString("base64");
}

/**
 * Decodifica una sesión de forma segura
 */
export function decodeSession(token: string): SessionUser | null {
  if (!token) return null;
  try {
    let json = "";
    if (typeof atob !== "undefined") {
      json = decodeURIComponent(atob(token));
    } else {
      json = Buffer.from(token, "base64").toString("utf-8");
    }
    const parsed = JSON.parse(json);
    if (!parsed || (parsed.exp && parsed.exp < Date.now())) {
      return null;
    }
    return parsed as SessionUser;
  } catch {
    return null;
  }
}
