import { NextRequest, NextResponse } from "next/server";
import { registrarEventoGPSDb, getEventosGPSDb } from "@/lib/services/gps.service";
import { TipoEventoGPS, PrioridadEventoGPS } from "@/lib/types/gps";

const VALID_API_KEY = process.env.GPS_WEBHOOK_API_KEY || "ts_gps_live_secret_key_ab2026";

/**
 * GET /api/gps/eventos
 * Health check y verificación de conectividad para n8n
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key");

  if (apiKey !== VALID_API_KEY) {
    return NextResponse.json(
      {
        error: "No autorizado. Se requiere cabecera 'x-api-key' válida.",
        gateway: "Trans Services Telematics Gateway v1.0",
      },
      { status: 401 }
    );
  }

  const eventos = await getEventosGPSDb();
  return NextResponse.json({
    status: "online",
    gateway: "Trans Services Telematics Gateway",
    totalEventos: eventos.length,
    timestamp: new Date().toISOString(),
  });
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
        { error: "Acceso no autorizado. API Key no válida." },
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

      // Normalizar tipo de evento
      let tipoEvento: TipoEventoGPS = "otro";
      const rawTipo = String(item.tipoEvento || item.tipo || item.event_type || "").toLowerCase();

      if (rawTipo.includes("velocid") || rawTipo.includes("speed")) {
        tipoEvento = "exceso_velocidad";
      } else if (rawTipo.includes("frena") || rawTipo.includes("brak")) {
        tipoEvento = "frenada_brusca";
      } else if (rawTipo.includes("aceler") || rawTipo.includes("accel")) {
        tipoEvento = "acelerada_brusca";
      } else if (rawTipo.includes("ralenti") || rawTipo.includes("idle") || rawTipo.includes("parada")) {
        tipoEvento = "ralenti";
      } else if (rawTipo.includes("panic") || rawTipo.includes("sos") || rawTipo.includes("alarma")) {
        tipoEvento = "panico";
      } else if (rawTipo.includes("desconex") || rawTipo.includes("bater") || rawTipo.includes("power")) {
        tipoEvento = "desconexion";
      } else if (rawTipo.includes("geocerca") || rawTipo.includes("fence")) {
        tipoEvento = "salida_geocerca";
      }

      const res = await registrarEventoGPSDb({
        placa: item.placa,
        fechaHora: item.fechaHora || item.timestamp || item.datetime || new Date().toISOString(),
        tipoEvento,
        prioridad: item.prioridad as PrioridadEventoGPS,
        descripcion: item.descripcion || item.mensaje,
        velocidad: Number(item.velocidad || item.speed) || undefined,
        limiteVelocidad: Number(item.limiteVelocidad || item.speed_limit) || undefined,
        odometro: Number(item.odometro || item.odometer) || undefined,
        latitud: Number(item.latitud || item.lat) || undefined,
        longitud: Number(item.longitud || item.lng || item.lon) || undefined,
        ubicacion: item.ubicacion || item.address,
      });

      if (res.success) {
        processedCount++;
      } else if (res.error) {
        errors.push(`Error en placa ${item.placa}: ${res.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Se procesaron y registraron ${processedCount} eventos de telemetría exitosamente.`,
      processedCount,
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
