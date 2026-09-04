import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── GET: Obtener inspecciones de aseo y desinfección con KPIs ──
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // Formato: YYYY-MM
    const placa = searchParams.get("placa");
    const conductor = searchParams.get("conductor");
    const conforme = searchParams.get("conforme");

    const where: any = {};

    if (mes) {
      where.fecha = { startsWith: mes };
    }

    if (placa) {
      where.placa = { contains: placa.toUpperCase(), mode: "insensitive" };
    }

    if (conductor) {
      where.conductorNombre = { contains: conductor, mode: "insensitive" };
    }

    if (conforme !== null && conforme !== undefined && conforme !== "todos") {
      where.conforme = conforme === "true" || conforme === "1";
    }

    const registros = await prisma.controlAseo.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });

    // Calcular KPIs
    const total = registros.length;
    const conformesCount = registros.filter((r) => r.conforme).length;
    const noConformesCount = total - conformesCount;
    const porcentajeCumplimiento = total > 0 ? Math.round((conformesCount / total) * 100) : 100;
    const vehiculosUnicos = new Set(registros.map((r) => r.placa)).size;
    const aprobadosCount = registros.filter((r) => r.estadoAprobo).length;

    return NextResponse.json({
      success: true,
      registros,
      stats: {
        total,
        conformesCount,
        noConformesCount,
        porcentajeCumplimiento,
        vehiculosUnicos,
        aprobadosCount,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/apps/aseo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener registros de aseo" },
      { status: 500 }
    );
  }
}

// ── POST: Crear nueva inspección de aseo y desinfección ──
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fecha,
      hora,
      placa,
      tipoVehiculo = "Camioneta",
      conductorNombre,
      conductorDocumento,
      conductorId,
      responsableHseq = "Coordinador HSEQ / Conductor",
      kilometraje = 0,
      checklist = [],
      fotosEvidencia = [],
      observaciones,
      firmaConductor,
      firmaInspector,
      conforme = true,
    } = body;

    if (!placa || !conductorNombre) {
      return NextResponse.json(
        { success: false, error: "La placa y el nombre del conductor son obligatorios." },
        { status: 400 }
      );
    }

    const now = new Date();
    const cleanFecha = fecha || now.toISOString().split("T")[0];
    const cleanHora = hora || now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    // Determinar conformidad si algún item obligatorio del checklist está en 'NO'
    let isConforme = Boolean(conforme);
    if (Array.isArray(checklist) && checklist.length > 0) {
      const tieneNoConformidad = checklist.some((item: any) => item.estado === "NO");
      if (tieneNoConformidad) {
        isConforme = false;
      }
    }

    const created = await prisma.controlAseo.create({
      data: {
        fecha: cleanFecha,
        hora: cleanHora,
        placa: placa.toUpperCase().trim(),
        tipoVehiculo: tipoVehiculo || "Camioneta",
        conductorNombre: conductorNombre.trim(),
        conductorDocumento: conductorDocumento?.trim() || null,
        conductorId: conductorId || null,
        responsableHseq: responsableHseq?.trim() || "Coordinador HSEQ / Conductor",
        kilometraje: parseInt(String(kilometraje), 10) || 0,
        checklist: checklist || [],
        fotosEvidencia: fotosEvidencia || [],
        observaciones: observaciones?.trim() || null,
        firmaConductor: firmaConductor || null,
        firmaInspector: firmaInspector || null,
        conforme: isConforme,
        estadoReviso: false,
        estadoAprobo: false,
        timestamp: now,
      },
    });

    return NextResponse.json({
      success: true,
      registro: created,
      message: "Inspección de orden y aseo registrada exitosamente.",
    });
  } catch (error: any) {
    console.error("Error en POST /api/apps/aseo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar la inspección de aseo" },
      { status: 500 }
    );
  }
}

// ── PATCH: Actualizar estado de revisión/aprobación (Auditoría ERP) ──
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, estadoReviso, estadoAprobo, observaciones } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para actualizar" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (estadoReviso !== undefined) data.estadoReviso = Boolean(estadoReviso);
    if (estadoAprobo !== undefined) data.estadoAprobo = Boolean(estadoAprobo);
    if (observaciones !== undefined) data.observaciones = observaciones;

    const updated = await prisma.controlAseo.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      registro: updated,
    });
  } catch (error: any) {
    console.error("Error en PATCH /api/apps/aseo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar inspección" },
      { status: 500 }
    );
  }
}

// ── DELETE: Eliminar inspección ──
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

    await prisma.controlAseo.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Inspección eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/apps/aseo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar inspección" },
      { status: 500 }
    );
  }
}
