import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit";
import { hashActivationToken, maskedDocument } from "@/lib/account-activation";
import { hashPassword, isStrongPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/session";
import { getRolPrincipal } from "@/lib/session";

export const dynamic = "force-dynamic";

async function findActivation(token: string) {
  return prisma.enlaceActivacion.findUnique({
    where: { tokenHash: hashActivationToken(token) },
    include: { persona: { include: { cuentaAcceso: true } } },
  });
}

function invalidReason(activation: Awaited<ReturnType<typeof findActivation>>) {
  if (!activation) return "Este enlace no es válido.";
  if (activation.revocadoAt) return "Este enlace fue revocado.";
  if (activation.usadoAt) return "Este enlace ya fue utilizado.";
  if (activation.expiraAt <= new Date()) return "Este enlace venció. Solicita uno nuevo al administrador.";
  if (["inactivo", "retirado"].includes(activation.persona.estado)) return "Esta persona no tiene acceso habilitado.";
  if (["bloqueada", "suspendida"].includes(activation.persona.cuentaAcceso?.estado || "")) return "Esta cuenta está bloqueada.";
  return null;
}

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const activation = await findActivation(token);
  const error = invalidReason(activation);
  if (error || !activation) return NextResponse.json({ valid: false, error }, { status: 410 });

  if (!activation.abiertoAt) {
    await prisma.enlaceActivacion.update({ where: { id: activation.id }, data: { abiertoAt: new Date() } });
  }
  return NextResponse.json({
    valid: true,
    person: {
      name: `${activation.persona.nombres} ${activation.persona.apellidos}`.trim(),
      document: maskedDocument(activation.persona.numeroDocumento),
      accessType: activation.tipoAcceso,
    },
    expiresAt: activation.expiraAt,
  });
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const limit = consumeRateLimit(`activation:${clientIp}:${hashActivationToken(token).slice(0, 16)}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta nuevamente más tarde." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const confirmation = typeof body.confirmation === "string" ? body.confirmation : "";
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "La clave debe tener entre 8 y 72 caracteres e incluir letra, número y símbolo." }, { status: 400 });
  }
  if (password !== confirmation) {
    return NextResponse.json({ error: "Las claves no coinciden." }, { status: 400 });
  }

  const activation = await findActivation(token);
  const error = invalidReason(activation);
  if (error || !activation) return NextResponse.json({ error }, { status: 410 });
  const passwordHash = await hashPassword(password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.enlaceActivacion.updateMany({
      where: { id: activation.id, usadoAt: null, revocadoAt: null, expiraAt: { gt: now } },
      data: { usadoAt: now, abiertoAt: activation.abiertoAt || now },
    });
    if (claimed.count !== 1) throw new Error("El enlace ya no está disponible.");
    await tx.persona.update({
      where: { id: activation.personaId },
      data: activation.tipoAcceso === "erp"
        ? { passwordHash, mustChangePassword: false }
        : { pin: passwordHash, mustChangePassword: false },
    });
    await tx.cuentaAcceso.upsert({
      where: { personaId: activation.personaId },
      create: { personaId: activation.personaId, estado: "activa", activadaAt: now },
      update: {
        estado: "activa",
        activadaAt: now,
        intentosFallidos: 0,
        bloqueadaHasta: null,
        bloqueadaPorId: null,
        bloqueadaPorNombre: null,
        motivoBloqueo: null,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.enlaceActivacion.updateMany({
      where: { personaId: activation.personaId, id: { not: activation.id }, usadoAt: null, revocadoAt: null },
      data: { revocadoAt: now },
    });
  });

  const actor: SessionUser = {
    id: activation.persona.id,
    documento: activation.persona.numeroDocumento,
    nombre: `${activation.persona.nombres} ${activation.persona.apellidos}`.trim(),
    email: activation.persona.email,
    perfiles: activation.persona.perfiles,
    rolPrincipal: getRolPrincipal(activation.persona.perfiles),
  };
  await recordAudit({
    action: "PASSWORD_CHANGE",
    entityType: "Persona",
    entityId: activation.personaId,
    metadata: { operation: "ACCOUNT_ACTIVATION", activationId: activation.id, accessType: activation.tipoAcceso },
    actor,
  });
  return NextResponse.json({ success: true, redirectUrl: "/login?activated=1" });
}
