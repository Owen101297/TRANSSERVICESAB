import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { esAdministradorAsistencia, fechaValida, textoOpcional, textoRequerido } from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TIPOS = ["descanso", "vacaciones", "incapacidad", "licencia_remunerada", "licencia_no_remunerada", "permiso", "comision", "suspension", "retiro"];

export async function GET(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const novedades = await prisma.novedadPersonal.findMany({
    where: estado && estado !== "todas" ? { estado } : undefined,
    include: { persona: { select: { nombres: true, apellidos: true, numeroDocumento: true, perfiles: true } } },
    orderBy: { fechaInicio: "desc" },
    take: 300,
  });
  return NextResponse.json({ success: true, novedades, isAdmin: esAdministradorAsistencia(auth.session) });
}

export async function POST(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const tipo = textoRequerido(body.tipo, "El tipo", 60);
    if (!TIPOS.includes(tipo)) {
      return NextResponse.json({ success: false, error: "Tipo de novedad no válido." }, { status: 400 });
    }
    const persona = await prisma.persona.findUnique({ where: { id: textoRequerido(body.personaId, "La persona", 100) } });
    if (!persona) return NextResponse.json({ success: false, error: "Persona no encontrada." }, { status: 404 });
    const fechaInicio = fechaValida(body.fechaInicio, "La fecha inicial");
    const fechaFin = fechaValida(body.fechaFin, "La fecha final");
    if (fechaFin < fechaInicio) {
      return NextResponse.json({ success: false, error: "La fecha final no puede ser anterior a la inicial." }, { status: 400 });
    }
    const isAdmin = esAdministradorAsistencia(auth.session);
    const novedad = await prisma.novedadPersonal.create({
      data: {
        personaId: persona.id,
        tipo,
        fechaInicio,
        fechaFin,
        motivo: textoOpcional(body.motivo, 1200),
        soporteUrl: textoOpcional(body.soporteUrl, 1000),
        estado: isAdmin && body.aprobar === true ? "aprobada" : "pendiente",
        registradoPorId: auth.session.id,
        registradoPorNombre: auth.session.nombre,
        ...(isAdmin && body.aprobar === true
          ? { aprobadoPorId: auth.session.id, aprobadoPorNombre: auth.session.nombre, aprobadoAt: new Date() }
          : {}),
      },
      include: { persona: true },
    });
    if (novedad.estado === "aprobada") {
      await prisma.eventoParticipante.updateMany({
        where: {
          personaId: persona.id,
          resultadoDefinitivo: null,
          evento: { fechaInicio: { lte: fechaFin }, fechaFin: { gte: fechaInicio } },
        },
        data: { condicionLaboral: tipo },
      });
    }
    await recordAudit({ action: "CREATE", entityType: "NovedadPersonal", entityId: novedad.id, after: novedad, actor: auth.session });
    return NextResponse.json({ success: true, novedad }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible registrar la novedad.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  if (!esAdministradorAsistencia(auth.session)) {
    return NextResponse.json({ success: false, error: "Solo el administrador puede decidir novedades." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const id = textoRequerido(body.id, "El identificador", 100);
    const estado = textoRequerido(body.estado, "El estado", 30);
    if (!["aprobada", "rechazada", "anulada"].includes(estado)) {
      return NextResponse.json({ success: false, error: "Estado no válido." }, { status: 400 });
    }
    const before = await prisma.novedadPersonal.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ success: false, error: "Novedad no encontrada." }, { status: 404 });
    const novedad = await prisma.$transaction(async (tx) => {
      const updated = await tx.novedadPersonal.update({
        where: { id },
        data: {
          estado,
          aprobadoPorId: auth.session.id,
          aprobadoPorNombre: auth.session.nombre,
          aprobadoAt: new Date(),
          observaciones: textoOpcional(body.observaciones, 1200),
        },
      });
      if (estado === "aprobada") {
        await tx.eventoParticipante.updateMany({
          where: {
            personaId: updated.personaId,
            resultadoDefinitivo: null,
            evento: { fechaInicio: { lte: updated.fechaFin }, fechaFin: { gte: updated.fechaInicio } },
          },
          data: { condicionLaboral: updated.tipo },
        });
      }
      return updated;
    });
    await recordAudit({ action: "APPROVE", entityType: "NovedadPersonal", entityId: id, before, after: novedad, actor: auth.session });
    return NextResponse.json({ success: true, novedad });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible decidir la novedad.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
