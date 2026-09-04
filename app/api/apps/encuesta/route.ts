import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── GET: Obtener encuestas y estadísticas agregadas (NPS, promedios) ──
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // YYYY-MM
    const tipo = searchParams.get("tipo");
    const placa = searchParams.get("placa");
    const conductor = searchParams.get("conductor");

    const where: any = {};

    if (mes) {
      where.fecha = { startsWith: mes };
    }

    if (tipo && tipo !== "todos") {
      where.tipoEncuesta = tipo;
    }

    if (placa) {
      where.placa = { contains: placa.toUpperCase(), mode: "insensitive" };
    }

    if (conductor) {
      where.conductorNombre = { contains: conductor, mode: "insensitive" };
    }

    const registros = await (prisma as any).encuestaRespuesta.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });

    const total = registros.length;

    // Calcular promedios de calificación
    let sumOverall = 0;
    let sumLimpieza = 0;
    let sumAtencion = 0;
    let sumPuntualidad = 0;
    let sumConfort = 0;
    let recomendariaSiCount = 0;

    registros.forEach((r: any) => {
      sumOverall += Number(r.calificacionGeneral || 5);
      sumLimpieza += Number(r.limpiezaVehiculo || 5);
      sumAtencion += Number(r.atencionConductor || 5);
      sumPuntualidad += Number(r.puntualidad || 5);
      sumConfort += Number(r.seguridadConfort || 5);
      if (r.seriaRecomendado === "SI") {
        recomendariaSiCount++;
      }
    });

    const avgOverall = total > 0 ? Number((sumOverall / total).toFixed(2)) : 5.0;
    const avgLimpieza = total > 0 ? Number((sumLimpieza / total).toFixed(2)) : 5.0;
    const avgAtencion = total > 0 ? Number((sumAtencion / total).toFixed(2)) : 5.0;
    const avgPuntualidad = total > 0 ? Number((sumPuntualidad / total).toFixed(2)) : 5.0;
    const avgConfort = total > 0 ? Number((sumConfort / total).toFixed(2)) : 5.0;
    const pctRecomendacion = total > 0 ? Math.round((recomendariaSiCount / total) * 100) : 100;

    const vehiculosEvaluados = new Set(registros.map((r: any) => r.placa).filter(Boolean)).size;

    return NextResponse.json({
      success: true,
      registros,
      stats: {
        total,
        avgOverall,
        avgLimpieza,
        avgAtencion,
        avgPuntualidad,
        avgConfort,
        pctRecomendacion,
        vehiculosEvaluados,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/apps/encuesta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener encuestas" },
      { status: 500 }
    );
  }
}

// ── POST: Guardar nueva respuesta de encuesta ──
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tipoEncuesta = "satisfaccion_servicio",
      titulo = "Encuesta de Percepción y Satisfacción",
      fecha,
      hora,
      placa,
      tipoVehiculo,
      conductorNombre,
      conductorDocumento,
      nombreEncuestado,
      emailEncuestado,
      empresaCliente = "TRANS SERVICES A&B",
      calificacionGeneral = 5.0,
      limpiezaVehiculo = 5.0,
      atencionConductor = 5.0,
      puntualidad = 5.0,
      seguridadConfort = 5.0,
      seriaRecomendado = "SI",
      preguntasDetalle = [],
      comentarios,
      firma,
      canal = "qr_movil",
    } = body;

    const now = new Date();
    const cleanFecha = fecha || now.toISOString().split("T")[0];
    const cleanHora = hora || now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    const nuevaEncuesta = await (prisma as any).encuestaRespuesta.create({
      data: {
        tipoEncuesta,
        titulo,
        fecha: cleanFecha,
        hora: cleanHora,
        placa: placa ? placa.trim().toUpperCase() : null,
        tipoVehiculo: tipoVehiculo || null,
        conductorNombre: conductorNombre ? conductorNombre.trim() : null,
        conductorDocumento: conductorDocumento ? conductorDocumento.trim() : null,
        nombreEncuestado: nombreEncuestado ? nombreEncuestado.trim() : "Anónimo / Pasajero",
        emailEncuestado: emailEncuestado ? emailEncuestado.trim() : null,
        empresaCliente: empresaCliente || "TRANS SERVICES A&B",
        calificacionGeneral: Number(calificacionGeneral) || 5.0,
        limpiezaVehiculo: Number(limpiezaVehiculo) || 5.0,
        atencionConductor: Number(atencionConductor) || 5.0,
        puntualidad: Number(puntualidad) || 5.0,
        seguridadConfort: Number(seguridadConfort) || 5.0,
        seriaRecomendado: seriaRecomendado || "SI",
        preguntasDetalle: preguntasDetalle || [],
        comentarios: comentarios ? comentarios.trim() : null,
        firma: firma || null,
        canal,
        estado: "completada",
      },
    });

    return NextResponse.json({
      success: true,
      data: nuevaEncuesta,
      message: "Encuesta guardada con éxito.",
    });
  } catch (error: any) {
    console.error("Error en POST /api/apps/encuesta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar la encuesta" },
      { status: 500 }
    );
  }
}

// ── DELETE: Eliminar respuesta de encuesta ──
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido para eliminar" }, { status: 400 });
    }

    await (prisma as any).encuestaRespuesta.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Encuesta eliminada correctamente.",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/apps/encuesta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la encuesta" },
      { status: 500 }
    );
  }
}
