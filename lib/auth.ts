import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { decodeSession, AUTH_COOKIE_NAME, SessionUser, getRolPrincipal } from "./session";

export * from "./session";

/**
 * Obtiene la sesión actual desde las Cookies de Next.js (Server Components / Server Actions / Route Handlers)
 */
export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await decodeSession(token);
    if (!session) return null;

    const persona = await prisma.persona.findUnique({
      where: { id: session.id },
      select: {
        estado: true,
        perfiles: true,
        cuentaAcceso: { select: { estado: true, sessionVersion: true } },
      },
    });
    if (!persona || ["inactivo", "retirado"].includes(persona.estado)) return null;
    if (!persona.cuentaAcceso || persona.cuentaAcceso.estado !== "activa") return null;

    const tokenVersion = session.sessionVersion ?? 1;
    if (tokenVersion !== persona.cuentaAcceso.sessionVersion) return null;

    return {
      ...session,
      perfiles: persona.perfiles,
      rolPrincipal: getRolPrincipal(persona.perfiles),
      sessionVersion: persona.cuentaAcceso.sessionVersion,
    };
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
