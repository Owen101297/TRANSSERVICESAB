import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, AUTH_COOKIE_NAME } from "@/lib/auth";

export function middleware(req: any) {
  const { pathname } = req.nextUrl;

  // Ignorar assets internos, healthcheck, api de autenticación y archivos estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/apps") || // Endpoints públicos de apps
    pathname.includes(".") // .ico, .png, .svg, .js, .css
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? decodeSession(token) : null;

  // 1. Si está en /login y ya tiene sesión activa
  if (pathname === "/login") {
    if (session) {
      if (session.rolPrincipal === "conductor") {
        return NextResponse.redirect(new URL("/portal-conductor", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 2. Si no tiene sesión activa
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Si es un Conductor intentando acceder al ERP Administrativo
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
