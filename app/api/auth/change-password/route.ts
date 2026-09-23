import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { AUTH_COOKIE_NAME, encodeSession } from "@/lib/session";
import { hashPassword, isStrongPassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      { error: "La nueva clave debe tener entre 8 y 72 caracteres e incluir letra, número y símbolo." },
      { status: 400 }
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "La nueva clave debe ser diferente de la actual." },
      { status: 400 }
    );
  }

  const persona = await prisma.persona.findUnique({
    where: { id: auth.session.id },
    select: { pin: true, passwordHash: true },
  });
  if (!persona) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const stored =
    auth.session.rolPrincipal === "conductor"
      ? persona.pin
      : persona.passwordHash || persona.pin;
  if (!(await verifyPassword(currentPassword, stored))) {
    return NextResponse.json({ error: "La clave actual no es correcta." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.persona.update({
    where: { id: auth.session.id },
    data:
      auth.session.rolPrincipal === "conductor"
        ? { pin: passwordHash, mustChangePassword: false }
        : { passwordHash, mustChangePassword: false },
  });

  const session = { ...auth.session, mustChangePassword: false };
  const response = NextResponse.json({ success: true, user: session });
  response.cookies.set(AUTH_COOKIE_NAME, await encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
