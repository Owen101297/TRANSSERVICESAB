import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── GET: Obtener capacitaciones con estadísticas y asistencias ──
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo"); // pesv, sg-sst, etc.
    const categoria = searchParams.get("categoria"); // charla_semanal, etc.
    const estado = searchParams.get("estado");
    const search = searchParams.get("search");

    const where: any = {};

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

    const created = await prisma.capacitacion.create({
      data: {
        nombre: nombre.trim(),
        tipo,
        programa,
        categoria,
        fecha: new Date(fecha),
        duracionHoras: parseFloat(String(duracionHoras)),
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
      },
    });

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

    const updated = await prisma.capacitacion.update({
      where: { id },
      data,
    });

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
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para eliminar" },
        { status: 400 }
      );
    }

    await prisma.capacitacion.delete({
      where: { id },
    });

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
