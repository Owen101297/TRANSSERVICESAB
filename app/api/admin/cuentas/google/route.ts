import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getRolPrincipal } from "@/lib/session";
import { googleConfigured } from "@/lib/google-login";
import { recordAudit } from "@/lib/audit";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireStaff(["administrativo"]); if (auth.response) return auth.response;
  const [requests, people] = await Promise.all([
    prisma.cuentaGoogle.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, email: true, nombre: true, estado: true, personaId: true, aprobadaAt: true } }),
    prisma.persona.findMany({ orderBy: { nombres: "asc" }, select: { id: true, nombres: true, apellidos: true, numeroDocumento: true, perfiles: true, rolAcceso: true, estado: true } }),
  ]);
  return NextResponse.json({ configured: googleConfigured(), requests, people: people.map(person => ({ id: person.id, nombre: `${person.nombres} ${person.apellidos}`, documento: person.numeroDocumento, rolAcceso: getRolPrincipal(person.perfiles, person.rolAcceso), estado: person.estado, self: person.id === auth.session.id })) });
}
export async function PATCH(req: Request) {
  const auth = await requireStaff(["administrativo"]); if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !["approve", "reject", "revoke"].includes(body.action)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  if (body.action === "approve" && (typeof body.personaId !== "string" || !["administrativo", "conductor"].includes(body.rolAcceso))) return NextResponse.json({ error: "Vincula la persona y selecciona su rol." }, { status: 400 });
  if (body.action === "approve" && body.personaId === auth.session.id && body.rolAcceso !== "administrativo") return NextResponse.json({ error: "No puedes retirar tu propio acceso administrativo." }, { status: 409 });
  try {
    await prisma.$transaction(async tx => {
      const before = await tx.cuentaGoogle.findUniqueOrThrow({ where: { id: body.id } });
      if (body.action === "approve") {
        const person = await tx.persona.findUniqueOrThrow({ where: { id: body.personaId }, include: { cuentaAcceso: true } });
        if (["inactivo", "retirado"].includes(person.estado) || ["bloqueada", "suspendida"].includes(person.cuentaAcceso?.estado || "")) throw new Error("Primero habilita la cuenta de la persona.");
        if (before.personaId && before.personaId !== person.id) throw new Error("Esta identidad ya está vinculada a otra persona.");
        await tx.persona.update({ where: { id: person.id }, data: { rolAcceso: body.rolAcceso } });
        await tx.cuentaAcceso.upsert({ where: { personaId: person.id }, create: { personaId: person.id, estado: "activa", activadaAt: new Date() }, update: { estado: "activa", activadaAt: new Date(), sessionVersion: { increment: 1 } } });
      } else if (before.personaId) {
        await tx.cuentaAcceso.updateMany({ where: { personaId: before.personaId }, data: { sessionVersion: { increment: 1 } } });
      }
      const after = await tx.cuentaGoogle.update({ where: { id: before.id }, data: { estado: body.action === "approve" ? "aprobada" : body.action === "reject" ? "rechazada" : "revocada", ...(body.action === "approve" ? { personaId: body.personaId, aprobadaPorId: auth.session.id, aprobadaAt: new Date() } : {}) } });
      await recordAudit({ action: "STATUS_CHANGE", entityType: "CuentaGoogle", entityId: before.id, before: { estado: before.estado, personaId: before.personaId }, after: { estado: after.estado, personaId: after.personaId }, metadata: { operation: body.action, rolAcceso: body.rolAcceso }, actor: auth.session }, tx);
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "No se autorizó el cambio. Revisa el estado de la persona y si ya tiene otra cuenta Google vinculada." }, { status: 409 }); }
}
