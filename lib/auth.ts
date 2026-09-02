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
    return decodeSession(token);
  } catch {
    return null;
  }
}
