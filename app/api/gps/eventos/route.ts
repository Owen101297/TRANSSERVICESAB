import { NextRequest, NextResponse } from "next/server";
import {
  registrarEventoGPSDb,
  getEventosGPSDb,
  getResumenAlertasGPSDb,
} from "@/lib/services/gps.service";
import { TipoEventoGPS, PrioridadEventoGPS } from "@/lib/types/gps";

const VALID_API_KEY = process.env.GPS_WEBHOOK_API_KEY || "ts_gps_live_secret_key_ab2026";

/**
 * GET /api/gps/eventos
 * Consulta de eventos reales y métricas de telemetría
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placa = searchParams.get("placa") || undefined;
    const tipoEvento = (searchParams.get("tipo") || searchParams.get("tipoEvento")) as TipoEventoGPS | undefined;
    const prioridad = (searchParams.get("prioridad") || searchParams.get("severidad")) as PrioridadEventoGPS | undefined;
    const limiteParam = searchParams.get("limite");
    const limite = limiteParam ? parseInt(limiteParam, 10) : 100;

    const eventos = await getEventosGPSDb({
      placa,
      tipoEvento,
      prioridad,
      limite,
    });

    const resumen = await getResumenAlertasGPSDb();

    return NextResponse.json({
      status: "online",
      gateway: "Trans Services Telematics Gateway",
      totalEventos: eventos.length,
      resumen,
      eventos,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al consultar eventos de telemetría." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gps/eventos
 * Endpoint Webhook receptor para n8n y Satelcopro
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key");

    if (apiKey !== VALID_API_KEY) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Cabecera 'x-api-key' no válida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON vacío o inválido." }, { status: 400 });
    }

    // Normalizar si es un array de eventos o un único evento
    const rawEvents = Array.isArray(body) ? body : [body];

    let processedCount = 0;
    const errors: string[] = [];

    for (const item of rawEvents) {
      if (!item.placa) {
        errors.push("Evento omitido: Falta el campo obligatorio 'placa'.");
        continue;
      }

      const res = await registrarEventoGPSDb({
        placa: item.placa,
        fechaHora: item.fechaHora || item.timestamp || item.datetime || new Date().toISOString(),
        tipoEvento: item.tipoEvento || item.tipo || item.event_type || "otro",
        prioridad: item.prioridad,
        descripcion: item.descripcion || item.mensaje,
        velocidad: typeof item.velocidad === "number" ? item.velocidad : Number(item.speed) || undefined,
        limiteVelocidad: typeof item.limiteVelocidad === "number" ? item.limiteVelocidad : Number(item.speed_limit) || undefined,
        odometro: typeof item.odometro === "number" ? item.odometro : Number(item.odometer) || undefined,
        latitud: typeof item.latitud === "number" ? item.latitud : Number(item.lat) || undefined,
        longitud: typeof item.longitud === "number" ? item.longitud : Number(item.lng || item.lon) || undefined,
        ubicacion: item.ubicacion || item.address,
        conductor: item.conductor || item.driver || null,
      });

      if (res.success) {
        processedCount++;
      } else if (res.error) {
        errors.push(`Error en placa ${item.placa}: ${res.error}`);
      }
    }

    const resumen = await getResumenAlertasGPSDb();

    return NextResponse.json({
      success: true,
      mensaje: `Se procesaron y registraron ${processedCount} eventos de telemetría exitosamente.`,
      processedCount,
      totalActual: resumen.totalEventos,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error en Webhook GPS:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor en endpoint de telemetría." },
      { status: 500 }
    );
  }
}
