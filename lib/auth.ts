import { cookies } from "next/headers";
import { decodeSession, AUTH_COOKIE_NAME, SessionUser } from "./session";

export * from "./session";

/**
 * Obtiene la sesión actual desde las Cookies de Next.js (Server Components / Server Actions / Route Handlers)
 */
export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await decodeSession(token);
  } catch {
    return null;
  }
}

export async function requireServerSession(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) throw new Error("No autenticado.");
  return session;
}

export async function requireStaffSession(
  allowedRoles: SessionUser["rolPrincipal"][] = [
    "coordinador",
    "hseq",
    "administrativo",
  ]
): Promise<SessionUser> {
  const session = await requireServerSession();
  if (!allowedRoles.includes(session.rolPrincipal)) {
    throw new Error("No autorizado.");
  }
  return session;
}

export async function requireSelfOrStaff(personaId: string): Promise<SessionUser> {
  const session = await requireServerSession();
  if (session.rolPrincipal === "conductor" && session.id !== personaId) {
    throw new Error("No autorizado.");
  }
  return session;
}
