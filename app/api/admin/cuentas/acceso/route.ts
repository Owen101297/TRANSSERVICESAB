import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
export async function PATCH(req: Request) {
  const auth = await requireStaff(["administrativo"]); if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (typeof body.personaId !== "string" || !["administrativo", "conductor"].includes(body.rolAcceso)) return NextResponse.json({ error: "Selecciona persona y uno de los dos roles." }, { status: 400 });
  if (body.personaId === auth.session.id && body.rolAcceso !== "administrativo") return NextResponse.json({ error: "No puedes retirar tu propio acceso administrativo." }, { status: 409 });
  try {
    await prisma.$transaction(async tx => {
      const before = await tx.persona.findUniqueOrThrow({ where: { id: body.personaId }, select: { id: true, rolAcceso: true } });
      const after = await tx.persona.update({ where: { id: body.personaId }, data: { rolAcceso: body.rolAcceso }, select: { id: true, rolAcceso: true } });
      await tx.cuentaAcceso.updateMany({ where: { personaId: body.personaId }, data: { sessionVersion: { increment: 1 } } });
      await recordAudit({ action: "UPDATE", entityType: "Persona", entityId: before.id, before, after, actor: auth.session, metadata: { operation: "access_role_change", sessionsRevoked: true } }, tx);
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "No se guardó el rol. Actualiza e intenta nuevamente." }, { status: 409 }); }
}
