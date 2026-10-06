import { NextResponse } from "next/server";
import {
  actionRequiresReason,
  canApplyAccountAction,
  enabledAccountState,
  isAccountAction,
  isAccountState,
} from "@/lib/account-lifecycle";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const auth = await requireStaff(["administrativo"]);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const personaId = typeof body.personaId === "string" ? body.personaId.trim() : "";
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!personaId || !isAccountAction(action)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  if (personaId === auth.session.id) {
    return NextResponse.json(
      { error: "No puedes bloquear, suspender ni invalidar tu propia sesión administrativa." },
      { status: 409 },
    );
  }
  if (actionRequiresReason(action) && (reason.length < 5 || reason.length > 300)) {
    return NextResponse.json(
      { error: "Registra un motivo claro de entre 5 y 300 caracteres." },
      { status: 400 },
    );
  }

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      estado: true,
      pin: true,
      passwordHash: true,
      cuentaAcceso: true,
      cuentaGoogle: { select: { estado: true } },
    },
  });
  if (!persona) {
    return NextResponse.json({ error: "La persona no existe." }, { status: 404 });
  }

  const currentState = persona.cuentaAcceso?.estado ?? "pendiente";
  if (!isAccountState(currentState) || !canApplyAccountAction(currentState, action)) {
    return NextResponse.json(
      { error: `La acción no es válida para una cuenta en estado ${currentState}.` },
      { status: 409 },
    );
  }
  if (action === "reactivate" && ["inactivo", "retirado"].includes(persona.estado)) {
    return NextResponse.json(
      { error: "Primero debes reactivar la vinculación de la persona." },
      { status: 409 },
    );
  }

  const now = new Date();
  const hasCredential = Boolean(persona.passwordHash || persona.pin || persona.cuentaGoogle?.estado === "aprobada");
  const nextState =
    action === "block"
      ? "bloqueada"
      : action === "suspend"
        ? "suspendida"
        : action === "unlock" || action === "reactivate"
          ? enabledAccountState(hasCredential)
          : currentState;

  const after = await prisma.$transaction(async (tx) => {
    if (action === "block" || action === "suspend") {
      await tx.enlaceActivacion.updateMany({
        where: { personaId, usadoAt: null, revocadoAt: null },
        data: { revocadoAt: now },
      });
    }

    return tx.cuentaAcceso.upsert({
      where: { personaId },
      create: {
        personaId,
        estado: nextState,
        bloqueadaPorId: action === "block" || action === "suspend" ? auth.session.id : null,
        bloqueadaPorNombre: action === "block" || action === "suspend" ? auth.session.nombre : null,
        motivoBloqueo: action === "block" || action === "suspend" ? reason : null,
      },
      update: {
        estado: nextState,
        intentosFallidos: action === "revoke_sessions" ? undefined : 0,
        bloqueadaHasta: null,
        bloqueadaPorId: action === "block" || action === "suspend" ? auth.session.id : null,
        bloqueadaPorNombre: action === "block" || action === "suspend" ? auth.session.nombre : null,
        motivoBloqueo: action === "block" || action === "suspend" ? reason : null,
        sessionVersion: { increment: 1 },
      },
    });
  });

  await recordAudit({
    action: action === "revoke_sessions" ? "SESSION_REVOKE" : "STATUS_CHANGE",
    entityType: "CuentaAcceso",
    entityId: after.id,
    before: persona.cuentaAcceso,
    after,
    metadata: {
      operation: action,
      personaId,
      personaNombre: `${persona.nombres} ${persona.apellidos}`.trim(),
      reason: reason || undefined,
      sessionsRevoked: true,
    },
    actor: auth.session,
  });

  return NextResponse.json({
    success: true,
    cuenta: {
      estado: after.estado,
      intentosFallidos: after.intentosFallidos,
      bloqueadaHasta: after.bloqueadaHasta,
      motivoBloqueo: after.motivoBloqueo,
    },
  });
}
