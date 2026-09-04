import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── GET: Obtener inspecciones de botiquín con KPIs agregados ──
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

    const registros = await (prisma as any).controlBotiquin.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });

    // Calcular KPIs
    const total = registros.length;
    const conformesCount = registros.filter((r: any) => r.conforme).length;
    const noConformesCount = total - conformesCount;
    const porcentajeCumplimiento = total > 0 ? Math.round((conformesCount / total) * 100) : 100;
    const vehiculosUnicos = new Set(registros.map((r: any) => r.placa)).size;
    const aprobadosCount = registros.filter((r: any) => r.estadoAprobo).length;

    // Conteo global de items con novedades
    const totalItemsVencidos = registros.reduce((acc: number, r: any) => acc + (r.itemsVencidosCount || 0), 0);
    const totalItemsFaltantes = registros.reduce((acc: number, r: any) => acc + (r.itemsFaltantesCount || 0), 0);

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
        totalItemsVencidos,
        totalItemsFaltantes,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/apps/botiquin:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener registros de botiquines" },
      { status: 500 }
    );
  }
}

// ── POST: Crear nueva inspección de botiquín ──
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
      ubicacionBotiquin = "Cabina del vehículo",
      estadoGabinete = "BUENO",
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

    // Analizar el checklist para calcular items vencidos, faltantes y determinar conformidad
    let itemsVencidosCount = 0;
    let itemsFaltantesCount = 0;
    let isConforme = Boolean(conforme);

    if (estadoGabinete === "MALO") {
      isConforme = false;
    }

    if (Array.isArray(checklist) && checklist.length > 0) {
      checklist.forEach((item: any) => {
        const estado = (item.estado || "BUENO").toUpperCase();
        if (estado === "MALO" || estado === "NO_TIENE" || estado === "FALTANTE") {
          itemsFaltantesCount++;
          isConforme = false;
        }

        // Revisar vencimiento
        if (item.tieneVencimiento && item.fechaVencimiento) {
          if (item.fechaVencimiento <= cleanFecha) {
            itemsVencidosCount++;
            isConforme = false;
          }
        }
      });
    }

    const nuevoRegistro = await (prisma as any).controlBotiquin.create({
      data: {
        fecha: cleanFecha,
        hora: cleanHora,
        placa: placa.trim().toUpperCase(),
        tipoVehiculo,
        conductorNombre: conductorNombre.trim(),
        conductorDocumento: conductorDocumento ? conductorDocumento.trim() : null,
        conductorId: conductorId || null,
        responsableHseq,
        ubicacionBotiquin,
        estadoGabinete,
        checklist: checklist || [],
        fotosEvidencia: fotosEvidencia || [],
        observaciones: observaciones || null,
        firmaConductor: firmaConductor || null,
        firmaInspector: firmaInspector || null,
        conforme: isConforme,
        itemsVencidosCount,
        itemsFaltantesCount,
        estadoReviso: false,
        estadoAprobo: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: nuevoRegistro,
      message: "Inspección de botiquín registrada con éxito.",
    });
  } catch (error: any) {
    console.error("Error en POST /api/apps/botiquin:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar inspección de botiquín" },
      { status: 500 }
    );
  }
}

// ── PATCH: Actualizar estado de revisión / aprobación HSEQ ──
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, estadoReviso, estadoAprobo, responsableHseq, observaciones } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de inspección requerido" }, { status: 400 });
    }

    const updateData: any = {};
    if (estadoReviso !== undefined) updateData.estadoReviso = Boolean(estadoReviso);
    if (estadoAprobo !== undefined) updateData.estadoAprobo = Boolean(estadoAprobo);
    if (responsableHseq) updateData.responsableHseq = responsableHseq;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const actualizado = await (prisma as any).controlBotiquin.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: actualizado,
      message: "Inspección de botiquín actualizada.",
    });
  } catch (error: any) {
    console.error("Error en PATCH /api/apps/botiquin:", error);
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
      return NextResponse.json({ success: false, error: "ID requerido para eliminar" }, { status: 400 });
    }

    await (prisma as any).controlBotiquin.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Inspección de botiquín eliminada correctamente.",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/apps/botiquin:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar inspección" },
      { status: 500 }
    );
  }
}
