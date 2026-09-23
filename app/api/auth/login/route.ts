import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encodeSession, getRolPrincipal, AUTH_COOKIE_NAME } from "@/lib/auth";
import { hashPassword, isPasswordHash, isStrongPassword, verifyPassword } from "@/lib/password";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";

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
          asignaciones: {
            where: { estado: "activa" },
            take: 1,
          },
        },
      });

      if (!persona) {
        return NextResponse.json(
          { success: false, error: "Conductor no encontrado. Verifica tu número de documento." },
          { status: 404 }
        );
      }

      // Validar PIN (si la persona no tiene PIN configurado, el PIN por defecto es 1234 o los últimos 4 dígitos)
      const expectedPin = persona.pin;
      if (!(await verifyPassword(inputPin, expectedPin))) {
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
        rolPrincipal: "conductor" as const,
        placaAsignada,
        mustChangePassword,
      };

      const token = await encodeSession(user);
      clearRateLimit(rateLimitKey);

      const response = NextResponse.json({
        success: true,
        user,
        redirectUrl: mustChangePassword ? "/cambiar-clave" : "/portal-conductor",
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
    });

    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Usuario administrativo no encontrado." },
        { status: 404 }
      );
    }

    // Validar clave (soporta PIN o default 1234)
    const validPass = persona.passwordHash || persona.pin;
    if (!(await verifyPassword(inputPassword, validPass))) {
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

    const rolPrincipal = getRolPrincipal(persona.perfiles);
    const user = {
      id: persona.id,
      documento: persona.numeroDocumento,
      nombre: `${persona.nombres} ${persona.apellidos}`.trim(),
      email: persona.email,
      perfiles: persona.perfiles,
      rolPrincipal,
      placaAsignada: null,
      mustChangePassword,
    };

    const token = await encodeSession(user);
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
