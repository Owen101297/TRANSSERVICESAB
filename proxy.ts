import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, AUTH_COOKIE_NAME } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicApi =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/health" ||
    pathname === "/api/version" ||
    (pathname === "/api/gps/eventos" && req.method === "POST") ||
    (pathname === "/api/apps/asistencia/config" && req.method === "GET");

  // 1. Ignorar endpoints de API, healthcheck, assets, aplicaciones públicas y archivos estáticos
  if (
    pathname.startsWith("/_next") ||
    isPublicApi ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/apps") ||
    pathname === "/asistir" ||
    pathname === "/asistencia/registro" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await decodeSession(token) : null;

  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const isDriverApi =
      pathname.startsWith("/api/portal-conductor/") ||
      pathname.startsWith("/api/apps/") ||
      pathname === "/api/capacitaciones/asistir" ||
      (pathname === "/api/capacitaciones" && req.method === "GET");

    if (session.rolPrincipal === "conductor" && !isDriverApi) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.next();
  }

  // 2. Si está en /login y ya está autenticado
  if (pathname === "/login") {
    if (session) {
      if (session.rolPrincipal === "conductor") {
        return NextResponse.redirect(new URL("/portal-conductor", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 3. Si no tiene sesión activa
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Si es un Conductor intentando acceder al ERP Administrativo
  if (session.rolPrincipal === "conductor") {
    const allowedForDriver =
      pathname.startsWith("/portal-conductor") ||
      pathname.startsWith("/apps");

    if (!allowedForDriver) {
      return NextResponse.redirect(new URL("/portal-conductor", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
