import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_FLOW_COOKIE, readGoogleFlow, exchangeGoogleCode } from "@/lib/google-login";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, encodeSession, getRolPrincipal } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { resolvePublicOrigin } from "@/lib/request-origin";
export async function GET(req: NextRequest) {
  const origin = resolvePublicOrigin(req);
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/api/auth/google" });
    response.cookies.set(AUTH_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  try {
    const flowCookie = req.cookies.get(GOOGLE_FLOW_COOKIE)?.value;
    const state = req.nextUrl.searchParams.get("state"); const code = req.nextUrl.searchParams.get("code");
    if (!flowCookie || !state || !code || req.nextUrl.searchParams.has("error")) return finish("/login?google=cancelado");
    const flow = await readGoogleFlow(flowCookie, state);
    const identity = await exchangeGoogleCode(code, flow);
    // Nunca vincular por email: una identidad nueva siempre requiere aprobación expresa.
    const google = await prisma.cuentaGoogle.upsert({ where: { subject: identity.subject }, create: identity, update: { email: identity.email, nombre: identity.nombre }, include: { persona: { include: { cuentaAcceso: true } } } });
    if (google.estado !== "aprobada" || !google.persona) return finish(`/login?google=${google.estado === "pendiente" ? "pendiente" : "denegado"}`);
    const person = google.persona;
    if (["inactivo", "retirado"].includes(person.estado) || person.cuentaAcceso?.estado !== "activa") return finish("/login?google=denegado");
    const session = { id: person.id, documento: person.numeroDocumento, nombre: `${person.nombres} ${person.apellidos}`.trim(), email: person.email, perfiles: person.perfiles, rolPrincipal: getRolPrincipal(person.perfiles, person.rolAcceso), sessionVersion: person.cuentaAcceso.sessionVersion, mustChangePassword: false, authProvider: "google" as const, googleAccountId: google.id };
    const token = await encodeSession(session);
    await prisma.cuentaAcceso.update({ where: { personaId: person.id }, data: { ultimoAccesoAt: new Date(), intentosFallidos: 0, bloqueadaHasta: null } });
    await recordAudit({ action: "LOGIN", entityType: "Persona", entityId: person.id, actor: session, metadata: { provider: "google" } });
    const response = finish(session.rolPrincipal === "conductor" ? "/portal-conductor" : "/");
    response.cookies.set(AUTH_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
    return response;
  } catch {
    return finish("/login?google=error");
  }
}
