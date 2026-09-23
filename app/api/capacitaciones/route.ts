import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import {
  fechaFinCapacitacion,
  procesoEventoDesdeCapacitacion,
  tipoEventoDesdeCapacitacion,
} from "@/lib/capacitacion-evento";
import { crearConsecutivoEvento } from "@/lib/eventos-asistencia";

export const dynamic = "force-dynamic";

// ── GET: Obtener capacitaciones con estadísticas y asistencias ──
export async function GET(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo"); // pesv, sg-sst, etc.
    const categoria = searchParams.get("categoria"); // charla_semanal, etc.
    const estado = searchParams.get("estado");
    const search = searchParams.get("search");

    const where: any = auth.session.rolPrincipal === "conductor"
      ? { estado: { in: ["programada", "realizada"] } }
      : {};

    if (tipo && tipo !== "todos") {
      where.tipo = tipo;
    }

    if (categoria && categoria !== "todas") {
      where.categoria = categoria;
    }

    if (estado && estado !== "todos") {
      where.estado = estado;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { facilitador: { contains: search, mode: "insensitive" } },
        { objetivo: { contains: search, mode: "insensitive" } },
      ];
    }

    const capacitaciones = await prisma.capacitacion.findMany({
      where,
      include: {
        asistencias: {
          ...(auth.session.rolPrincipal === "conductor"
            ? { where: { personaId: auth.session.id } }
            : {}),
          orderBy: { fecha: "desc" },
        },
      },
      orderBy: { fecha: "desc" },
    });

    // Calcular KPIs
    const totalCount = capacitaciones.length;
    const totalPesv = capacitaciones.filter((c) => c.tipo === "pesv").length;
    const totalSgsst = capacitaciones.filter((c) => c.tipo === "sg-sst").length;
    const totalCharlas = capacitaciones.filter((c) => c.categoria === "charla_semanal").length;
    
    let totalAsistenciasAcumuladas = 0;
    capacitaciones.forEach((c) => {
      totalAsistenciasAcumuladas += c.asistencias.length;
    });

    return NextResponse.json({
      success: true,
      capacitaciones: capacitaciones.map((c) => ({
        ...c,
        asistentesReales: c.asistencias.length,
      })),
      stats: {
        totalCount,
        totalPesv,
        totalSgsst,
        totalCharlas,
        totalAsistenciasAcumuladas,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/capacitaciones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar capacitaciones" },
      { status: 500 }
    );
  }
}

// ── POST: Crear una nueva capacitación o charla con material ──
export async function POST(req: Request) {
  const auth = await requireStaff(["hseq", "administrativo"]);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const {
      nombre,
      tipo = "pesv",
      programa = "Plan de Capacitacion PESV (Paso 9/18)",
      categoria = "charla_semanal",
      fecha,
      duracionHoras = 0.25,
      facilitador = "Coordinador HSEQ / PESV",
      objetivo,
      lugar = "Plataforma Digital / Portal Conductor",
      materialTipo = "texto",
      materialUrl,
      materialContenido,
      preguntas = [],
      requiereSelfie = true,
      requiereFirma = true,
      asistentesEsperados = 10,
    } = body;

    if (!nombre || !fecha) {
      return NextResponse.json(
        { success: false, error: "El nombre y la fecha son obligatorios." },
        { status: 400 }
      );
    }

    const fechaProgramada = new Date(fecha);
    if (Number.isNaN(fechaProgramada.getTime())) {
      return NextResponse.json(
        { success: false, error: "La fecha de la capacitación no es válida." },
        { status: 400 }
      );
    }
    const horas = Math.max(0.25, parseFloat(String(duracionHoras)) || 0.25);
    const created = await prisma.$transaction(async (tx) => {
      const evento = await tx.eventoAsistencia.create({
        data: {
          consecutivo: crearConsecutivoEvento(),
          nombre: nombre.trim(),
          tipo: tipoEventoDesdeCapacitacion(categoria),
          caracter: "formativo",
          proceso: procesoEventoDesdeCapacitacion(tipo),
          objetivo: objetivo?.trim() || "Fortalecer las competencias definidas en el plan de formación.",
          fechaInicio: fechaProgramada,
          fechaFin: fechaFinCapacitacion(fechaProgramada, horas),
          modalidad: String(lugar || "").toLowerCase().match(/virtual|digital/) ? "virtual" : "presencial",
          lugar: lugar?.trim() || "Por definir",
          responsableId: auth.session.id,
          responsableNombre: auth.session.nombre,
          facilitadorTipo: "interno",
          facilitadorNombre: facilitador?.trim() || auth.session.nombre,
          estado: "programado",
          requiereFirma: Boolean(requiereFirma),
          requiereFoto: Boolean(requiereSelfie),
          requiereEvaluacion: Array.isArray(preguntas) && preguntas.length > 0,
          notaMinima: Array.isArray(preguntas) && preguntas.length > 0 ? 80 : null,
          contenido: materialContenido?.trim() || null,
          materialUrl: materialUrl?.trim() || null,
          creadoPorId: auth.session.id,
          creadoPorNombre: auth.session.nombre,
          aprobadoPorId: auth.session.id,
          aprobadoPorNombre: auth.session.nombre,
          aprobadoAt: new Date(),
          documentos: {
            create: [
              { codigo: "TH-FOR-03", nombre: "Registro de asistencia", version: "03" },
              { codigo: "TH-FOR-04", nombre: "Registro de capacitación", version: "02" },
            ],
          },
        },
      });
      return tx.capacitacion.create({
        data: {
        nombre: nombre.trim(),
        tipo,
        programa,
        categoria,
        fecha: fechaProgramada,
        duracionHoras: horas,
        facilitador: facilitador?.trim(),
        objetivo: objetivo?.trim(),
        lugar: lugar?.trim(),
        materialTipo,
        materialUrl: materialUrl?.trim() || null,
        materialContenido: materialContenido?.trim() || null,
        preguntas: preguntas || [],
        requiereSelfie: Boolean(requiereSelfie),
        requiereFirma: Boolean(requiereFirma),
        asistentesEsperados: parseInt(String(asistentesEsperados), 10) || 0,
        estado: "programada",
        eventoId: evento.id,
      },
      });
    });
    await recordAudit({ action: "CREATE", entityType: "Capacitacion", entityId: created.id, after: created, actor: auth.session });

    return NextResponse.json({
      success: true,
      capacitacion: created,
    });
  } catch (error: any) {
    console.error("Error en POST /api/capacitaciones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la capacitación" },
      { status: 500 }
    );
  }
}

// ── PATCH: Actualizar estado de capacitación ──
export async function PATCH(req: Request) {
  const auth = await requireStaff(["hseq", "administrativo"]);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const { id, estado, nombre, objetivo, materialUrl, materialContenido } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para actualizar" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (estado) data.estado = estado;
    if (nombre) data.nombre = nombre;
    if (objetivo !== undefined) data.objetivo = objetivo;
    if (materialUrl !== undefined) data.materialUrl = materialUrl;
    if (materialContenido !== undefined) data.materialContenido = materialContenido;

    const before = await prisma.capacitacion.findUnique({ where: { id }, include: { evento: true } });
    if (!before) {
      return NextResponse.json({ success: false, error: "Capacitación no encontrada." }, { status: 404 });
    }
    if (estado && before.eventoId) {
      return NextResponse.json(
        { success: false, error: "El estado se administra desde el expediente del evento para conservar el flujo de aprobación." },
        { status: 409 }
      );
    }
    const updated = await prisma.$transaction(async (tx) => {
      const capacitacion = await tx.capacitacion.update({ where: { id }, data });
      if (before.eventoId) {
        await tx.eventoAsistencia.update({
          where: { id: before.eventoId },
          data: {
            ...(nombre ? { nombre } : {}),
            ...(objetivo !== undefined ? { objetivo: objetivo || "Sin objetivo registrado" } : {}),
            ...(materialUrl !== undefined ? { materialUrl } : {}),
            ...(materialContenido !== undefined ? { contenido: materialContenido } : {}),
          },
        });
      }
      return capacitacion;
    });
    await recordAudit({ action: "UPDATE", entityType: "Capacitacion", entityId: id, before, after: updated, actor: auth.session });

    return NextResponse.json({
      success: true,
      capacitacion: updated,
    });
  } catch (error: any) {
    console.error("Error en PATCH /api/capacitaciones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar capacitación" },
      { status: 500 }
    );
  }
}

// ── DELETE: Eliminar capacitación ──
export async function DELETE(req: Request) {
  const auth = await requireStaff(["hseq", "administrativo"]);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para eliminar" },
        { status: 400 }
      );
    }

    const before = await prisma.capacitacion.findUnique({
      where: { id },
      include: { _count: { select: { asistencias: true } } },
    });
    if (!before) {
      return NextResponse.json({ success: false, error: "Capacitación no encontrada." }, { status: 404 });
    }
    if (before._count.asistencias > 0) {
      return NextResponse.json(
        { success: false, error: "La capacitación tiene asistencias y no puede eliminarse. Cámbiala a cancelada para conservar la trazabilidad." },
        { status: 409 }
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.capacitacion.delete({ where: { id } });
      if (before.eventoId) {
        await tx.eventoAsistencia.update({ where: { id: before.eventoId }, data: { estado: "cancelado" } });
      }
    });
    await recordAudit({ action: "DELETE", entityType: "Capacitacion", entityId: id, before, actor: auth.session });

    return NextResponse.json({
      success: true,
      message: "Capacitación eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/capacitaciones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar capacitación" },
      { status: 500 }
    );
  }
}
