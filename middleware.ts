import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, AUTH_COOKIE_NAME } from "@/lib/session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Ignorar endpoints de API, healthcheck, assets y archivos estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/apps/shared") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? decodeSession(token) : null;

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
      pathname === "/portal-conductor" ||
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
