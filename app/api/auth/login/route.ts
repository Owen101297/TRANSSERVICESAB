import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encodeSession, getRolPrincipal, AUTH_COOKIE_NAME } from "@/lib/auth";
import { hashPassword, isPasswordHash, isStrongPassword, verifyPassword } from "@/lib/password";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function accountAccessError(personaId: string, account?: { estado: string; bloqueadaHasta: Date | null } | null) {
  if (account?.estado === "suspendida") return "Esta cuenta está suspendida. Contacta al administrador.";
  if (account?.estado === "pendiente") return "Debes activar o restablecer tu acceso con el enlace enviado por el administrador.";
  if (account?.estado === "bloqueada" && (!account.bloqueadaHasta || account.bloqueadaHasta > new Date())) {
    return "Cuenta bloqueada. Intenta más tarde o contacta al administrador.";
  }
  if (account?.estado === "bloqueada" && account.bloqueadaHasta && account.bloqueadaHasta <= new Date()) {
    await prisma.cuentaAcceso.update({
      where: { personaId },
      data: {
        estado: "activa",
        intentosFallidos: 0,
        bloqueadaHasta: null,
        bloqueadaPorId: null,
        bloqueadaPorNombre: null,
        motivoBloqueo: null,
      },
    });
  }
  return null;
}

async function registerFailedAttempt(personaId: string, currentAttempts = 0) {
  const account = await prisma.cuentaAcceso.upsert({
    where: { personaId },
    create: {
      personaId,
      estado: currentAttempts + 1 >= MAX_FAILED_ATTEMPTS ? "bloqueada" : "pendiente",
      intentosFallidos: currentAttempts + 1,
      bloqueadaHasta: currentAttempts + 1 >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
    },
    update: {
      intentosFallidos: { increment: 1 },
    },
  });
  if (account.intentosFallidos >= MAX_FAILED_ATTEMPTS && account.estado !== "bloqueada") {
    await prisma.cuentaAcceso.update({
      where: { personaId },
      data: { estado: "bloqueada", bloqueadaHasta: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) },
    });
  }
}

async function registerSuccessfulAccess(personaId: string) {
  await prisma.cuentaAcceso.upsert({
    where: { personaId },
    create: { personaId, estado: "activa", activadaAt: new Date(), ultimoAccesoAt: new Date() },
    update: { estado: "activa", intentosFallidos: 0, bloqueadaHasta: null, ultimoAccesoAt: new Date() },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, documento, pin, email, password } = body;
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const identifier = String(email || documento || "anonymous").trim().toLowerCase();
    const rateLimitKey = `${clientIp}:${identifier}`;
    const rateLimit = consumeRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Demasiados intentos. Intenta más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    // -------------------------------------------------------------
    // 1. INGRESO DE CONDUCTOR (Cédula + PIN)
    // -------------------------------------------------------------
    if (type === "conductor" || (!email && documento)) {
      const cleanDoc = (documento || "").toString().trim();
      const inputPin = (pin || "").toString().trim();

      if (!cleanDoc || !inputPin) {
        return NextResponse.json(
          { success: false, error: "Ingresa tu número de cédula y PIN." },
          { status: 400 }
        );
      }

      // Buscar persona en la base de datos de manera flexible
      const persona = await prisma.persona.findFirst({
        where: {
          OR: [
            { numeroDocumento: cleanDoc },
            { id: cleanDoc },
            { email: { contains: cleanDoc, mode: "insensitive" } },
          ],
        },
        include: {
          cuentaAcceso: true,
          asignaciones: {
            where: { estado: "activa" },
            take: 1,
          },
        },
      });

      if (!persona) {
        return NextResponse.json(
          { success: false, error: "Credenciales incorrectas." },
          { status: 401 }
        );
      }

      if (["inactivo", "retirado"].includes(persona.estado)) {
        return NextResponse.json({ success: false, error: "Esta persona no tiene acceso habilitado." }, { status: 403 });
      }

      const accessError = await accountAccessError(persona.id, persona.cuentaAcceso);
      if (accessError) {
        return NextResponse.json({ success: false, error: accessError }, { status: 423 });
      }

      // Validar PIN (si la persona no tiene PIN configurado, el PIN por defecto es 1234 o los últimos 4 dígitos)
      const expectedPin = persona.pin || persona.passwordHash;
      if (!(await verifyPassword(inputPin, expectedPin))) {
        await registerFailedAttempt(persona.id, persona.cuentaAcceso?.intentosFallidos || 0);
        return NextResponse.json(
          { success: false, error: "Credenciales incorrectas." },
          { status: 401 }
        );
      }

      const mustChangePassword =
        persona.mustChangePassword ||
        !isPasswordHash(expectedPin) ||
        !isStrongPassword(inputPin);
      if (!isPasswordHash(expectedPin)) {
        await prisma.persona.update({
          where: { id: persona.id },
          data: { pin: await hashPassword(inputPin), mustChangePassword: true },
        });
      }

      const placaAsignada = persona.asignaciones[0]?.placa || null;
      const user = {
        id: persona.id,
        documento: persona.numeroDocumento,
        nombre: `${persona.nombres} ${persona.apellidos}`.trim(),
        email: persona.email,
        perfiles: persona.perfiles,
        rolPrincipal: getRolPrincipal(persona.perfiles, persona.rolAcceso),
        placaAsignada,
        mustChangePassword,
        sessionVersion: persona.cuentaAcceso?.sessionVersion ?? 1,
      };

      const token = await encodeSession(user);
      await registerSuccessfulAccess(persona.id);
      await recordAudit({ action: "LOGIN", entityType: "Persona", entityId: persona.id, metadata: { accessType: "portal" }, actor: user });
      clearRateLimit(rateLimitKey);

      const response = NextResponse.json({
        success: true,
        user,
        redirectUrl: mustChangePassword ? "/cambiar-clave" : user.rolPrincipal === "conductor" ? "/portal-conductor" : "/",
      });

      // Guardar cookie HTTP-Only segura por 7 días
      response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return response;
    }

    // -------------------------------------------------------------
    // 2. INGRESO ADMINISTRATIVO / COORDINACIÓN / HSE
    // -------------------------------------------------------------
    const inputIdentifier = (email || documento || "").toString().trim().toLowerCase();
    const inputPassword = (password || pin || "").toString().trim();

    if (!inputIdentifier || !inputPassword) {
      return NextResponse.json(
        { success: false, error: "Ingresa tu usuario/correo y contraseña." },
        { status: 400 }
      );
    }

    // Buscar en la base de datos por email o número de documento
    const persona = await prisma.persona.findFirst({
      where: {
        OR: [{ email: inputIdentifier }, { numeroDocumento: inputIdentifier }],
      },
      include: { cuentaAcceso: true },
    });

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    if (["inactivo", "retirado"].includes(persona.estado)) {
      return NextResponse.json({ success: false, error: "Esta persona no tiene acceso habilitado." }, { status: 403 });
    }

    const accessError = await accountAccessError(persona.id, persona.cuentaAcceso);
    if (accessError) {
      return NextResponse.json({ success: false, error: accessError }, { status: 423 });
    }

    // Validar clave (soporta PIN o default 1234)
    const validPass = persona.passwordHash || persona.pin;
    if (!(await verifyPassword(inputPassword, validPass))) {
      await registerFailedAttempt(persona.id, persona.cuentaAcceso?.intentosFallidos || 0);
      return NextResponse.json(
        { success: false, error: "Contraseña incorrecta." },
        { status: 401 }
      );
    }

    const mustChangePassword =
      persona.mustChangePassword ||
      !isPasswordHash(validPass) ||
      !isStrongPassword(inputPassword);
    if (!isPasswordHash(validPass)) {
      await prisma.persona.update({
        where: { id: persona.id },
        data: { passwordHash: await hashPassword(inputPassword), mustChangePassword: true },
      });
    }

    const rolPrincipal = getRolPrincipal(persona.perfiles, persona.rolAcceso);
    const user = {
      id: persona.id,
      documento: persona.numeroDocumento,
      nombre: `${persona.nombres} ${persona.apellidos}`.trim(),
      email: persona.email,
      perfiles: persona.perfiles,
      rolPrincipal,
      placaAsignada: null,
      mustChangePassword,
      sessionVersion: persona.cuentaAcceso?.sessionVersion ?? 1,
    };

    const token = await encodeSession(user);
    await registerSuccessfulAccess(persona.id);
    await recordAudit({ action: "LOGIN", entityType: "Persona", entityId: persona.id, metadata: { accessType: "erp" }, actor: user });
    clearRateLimit(rateLimitKey);
    const redirectUrl = mustChangePassword
      ? "/cambiar-clave"
      : rolPrincipal === "conductor"
        ? "/portal-conductor"
        : "/";

    const response = NextResponse.json({
      success: true,
      user,
      redirectUrl,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar el inicio de sesión." },
      { status: 500 }
    );
  }
}
