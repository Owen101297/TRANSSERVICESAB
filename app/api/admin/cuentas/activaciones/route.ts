import { getRolPrincipal } from "@/lib/session";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import {
  ACTIVATION_HOURS_DEFAULT,
  activationStatus,
  buildActivationMessage,
  createActivationToken,
} from "@/lib/account-activation";
import { prisma } from "@/lib/prisma";
import { resolvePublicOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff(["administrativo"]);
  if (auth.response) return auth.response;

  const personas = await prisma.persona.findMany({
    include: {
      cuentaAcceso: true,
      enlacesActivacion: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  return NextResponse.json({
    success: true,
    personas: personas.map((persona) => {
      const latest = persona.enlacesActivacion[0] || null;
      return {
        id: persona.id,
        nombre: `${persona.nombres} ${persona.apellidos}`.trim(),
        documento: persona.numeroDocumento,
        email: persona.email,
        perfiles: persona.perfiles,
        rolAcceso: getRolPrincipal(persona.perfiles, persona.rolAcceso),
        estadoLaboral: persona.estado,
        cuenta: persona.cuentaAcceso
          ? {
              estado: persona.cuentaAcceso.estado,
              ultimoAccesoAt: persona.cuentaAcceso.ultimoAccesoAt,
              intentosFallidos: persona.cuentaAcceso.intentosFallidos,
              bloqueadaHasta: persona.cuentaAcceso.bloqueadaHasta,
              motivoBloqueo: persona.cuentaAcceso.motivoBloqueo,
            }
          : {
              estado: "pendiente",
              ultimoAccesoAt: null,
              intentosFallidos: 0,
              bloqueadaHasta: null,
              motivoBloqueo: null,
            },
        esUsuarioActual: persona.id === auth.session.id,
        ultimoEnlace: latest
          ? {
              id: latest.id,
              estado: activationStatus(latest),
              expiraAt: latest.expiraAt,
              entregadoAt: latest.entregadoAt,
              abiertoAt: latest.abiertoAt,
              usadoAt: latest.usadoAt,
            }
          : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await requireStaff(["administrativo"]);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const requestedIds: unknown[] = Array.isArray(body.personaIds) ? body.personaIds : [];
  const personaIds: string[] = [...new Set(requestedIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  ))];
  if (personaIds.length === 0 || personaIds.length > 100) {
    return NextResponse.json({ error: "Selecciona entre 1 y 100 personas." }, { status: 400 });
  }
  if (personaIds.includes(auth.session.id)) {
    return NextResponse.json(
      { error: "No puedes restablecer tu propia cuenta desde una sesión activa." },
      { status: 409 },
    );
  }

  const hours = Math.max(1, Math.min(168, Number(body.expirationHours) || ACTIVATION_HOURS_DEFAULT));
  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
    include: { cuentaAcceso: true },
  });
  if (personas.length !== personaIds.length) {
    return NextResponse.json({ error: "Una o más personas no existen." }, { status: 404 });
  }
  if (personas.some((persona) => ["inactivo", "retirado"].includes(persona.estado))) {
    return NextResponse.json({ error: "No se pueden activar personas inactivas o retiradas." }, { status: 409 });
  }
  if (personas.some((persona) => ["bloqueada", "suspendida"].includes(persona.cuentaAcceso?.estado || ""))) {
    return NextResponse.json({ error: "No se pueden generar enlaces para cuentas bloqueadas o suspendidas." }, { status: 409 });
  }

  const origin = resolvePublicOrigin(req);
  const expiraAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const rawTokens = new Map<string, string>();

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const persona of personas) {
      await tx.enlaceActivacion.updateMany({
        where: { personaId: persona.id, usadoAt: null, revocadoAt: null },
        data: { revocadoAt: new Date() },
      });
      const { token, tokenHash } = createActivationToken();
      rawTokens.set(persona.id, token);
      const tipoAcceso = getRolPrincipal(persona.perfiles, persona.rolAcceso) === "administrativo"
        ? "erp"
        : "portal";
      await tx.persona.update({
        where: { id: persona.id },
        data: tipoAcceso === "erp"
          ? { passwordHash: null, pin: null, mustChangePassword: false }
          : { pin: null, mustChangePassword: false },
      });
      const link = await tx.enlaceActivacion.create({
        data: {
          personaId: persona.id,
          tokenHash,
          tipoAcceso,
          expiraAt,
          creadoPorId: auth.session.id,
          creadoPorNombre: auth.session.nombre,
        },
      });
      await tx.cuentaAcceso.upsert({
        where: { personaId: persona.id },
        create: { personaId: persona.id, estado: "pendiente" },
        update: {
          estado: "pendiente",
          intentosFallidos: 0,
          bloqueadaHasta: null,
          bloqueadaPorId: null,
          bloqueadaPorNombre: null,
          motivoBloqueo: null,
          sessionVersion: { increment: 1 },
        },
      });
      results.push({ persona, tipoAcceso, link });
    }
    return results;
  });

  const activaciones = await Promise.all(created.map(async ({ persona, tipoAcceso, link: record }) => {
    const token = rawTokens.get(persona.id)!;
    const link = `${origin}/activar/${token}`;
    const name = `${persona.nombres} ${persona.apellidos}`.trim();
    return {
      id: record.id,
      personaId: persona.id,
      nombre: name,
      tipoAcceso,
      expiraAt,
      link,
      message: buildActivationMessage({ name, accessType: tipoAcceso, link, expiresAt: expiraAt }),
      qrDataUrl: await QRCode.toDataURL(link, { width: 320, margin: 2, errorCorrectionLevel: "M" }),
    };
  }));

  await recordAudit({
    action: "CREATE",
    entityType: "EnlaceActivacion",
    metadata: {
      operation: "ACCOUNT_ACCESS_RESET",
      personaIds,
      count: activaciones.length,
      expirationHours: hours,
      sessionsRevoked: true,
      previousCredentialsRevoked: true,
    },
    actor: auth.session,
  });
  return NextResponse.json({ success: true, activaciones }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireStaff(["administrativo"]);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action;
  if (!id || !["delivered", "revoke"].includes(action)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  const before = await prisma.enlaceActivacion.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Enlace no encontrado." }, { status: 404 });
  if (before.usadoAt) return NextResponse.json({ error: "La cuenta ya fue activada." }, { status: 409 });

  const updated = await prisma.enlaceActivacion.update({
    where: { id },
    data: action === "revoke"
      ? { revocadoAt: new Date() }
      : { entregadoAt: before.entregadoAt || new Date(), medioEntrega: String(body.medium || "manual").slice(0, 30) },
  });
  await recordAudit({
    action: "UPDATE",
    entityType: "EnlaceActivacion",
    entityId: id,
    before,
    after: updated,
    metadata: { operation: action },
    actor: auth.session,
  });
  return NextResponse.json({ success: true, estado: activationStatus(updated) });
}
