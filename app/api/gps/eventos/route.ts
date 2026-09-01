import { NextRequest, NextResponse } from "next/server";
import {
  registrarEventoGPSDb,
  getEventosGPSDb,
  getResumenAlertasGPSDb,
} from "@/lib/services/gps.service";
import { TipoEventoGPS, PrioridadEventoGPS } from "@/lib/types/gps";

const VALID_API_KEY = process.env.GPS_WEBHOOK_API_KEY || "ts_gps_live_secret_key_ab2026";

/**
 * Función auxiliar para desempaquetar payloads provenientes de n8n / webhooks
 */
function extraerEventosPayload(body: any): any[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;

  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.json)) return body.json;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.events)) return body.events;
  if (Array.isArray(body.eventos)) return body.eventos;
  if (Array.isArray(body.body)) return body.body;

  if (body.json && typeof body.json === "object") return [body.json];
  if (body.data && typeof body.data === "object") return [body.data];

  return [body];
}

/**
 * Función auxiliar para parsear números con seguridad
 */
function parsearNumeroSeguro(val: any): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, "."));
  return isNaN(num) ? undefined : num;
}

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
 * Endpoint Webhook receptor universal para n8n y Satelcopro
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key");

    if (apiKey !== VALID_API_KEY) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Cabecera 'x-api-key' o parámetro 'api_key' no válido." },
        { status: 401 }
      );
    }

    const rawBody = await request.json();
    if (!rawBody) {
      return NextResponse.json({ error: "Cuerpo JSON vacío o inválido." }, { status: 400 });
    }

    const rawEvents = extraerEventosPayload(rawBody);

    let processedCount = 0;
    const errors: string[] = [];
    const insertedIds: string[] = [];

    for (const rawItem of rawEvents) {
      // Tolerar nombres de propiedades anidadas si n8n envía { json: {...} }
      const item = rawItem.json ? rawItem.json : rawItem;

      const rawPlaca = item.placa || item.license_plate || item.plate || item.vehiculo || item.vehicle || item.matricula;

      if (!rawPlaca) {
        errors.push("Evento omitido: Falta el campo de placa del vehículo.");
        continue;
      }

      const rawFecha = item.fechaHora || item.fecha || item.timestamp || item.datetime || item.event_time || item.date || item.hora;
      const rawTipo = item.tipoEvento || item.tipo || item.event_type || item.event || item.novedad || item.evento || "otro";
      const rawPrioridad = item.prioridad || item.priority || item.severity || item.severidad;
      const rawDescripcion = item.descripcion || item.description || item.mensaje || item.detail;
      const rawUbicacion = item.ubicacion || item.location || item.address || item.direccion || item.lugar;
      const rawConductor = item.conductor || item.driver || item.driver_name || item.chofer || null;

      const velocidad = parsearNumeroSeguro(item.velocidad ?? item.speed ?? item.vel);
      const limiteVelocidad = parsearNumeroSeguro(item.limiteVelocidad ?? item.speed_limit ?? item.limite);
      const odometro = parsearNumeroSeguro(item.odometro ?? item.odometer ?? item.km);
      const latitud = parsearNumeroSeguro(item.latitud ?? item.lat ?? item.latitude);
      const longitud = parsearNumeroSeguro(item.longitud ?? item.lng ?? item.lon ?? item.longitude);

      const res = await registrarEventoGPSDb({
        placa: String(rawPlaca),
        fechaHora: rawFecha ? String(rawFecha) : new Date().toISOString(),
        tipoEvento: String(rawTipo),
        prioridad: rawPrioridad ? String(rawPrioridad) : undefined,
        descripcion: rawDescripcion ? String(rawDescripcion) : undefined,
        velocidad,
        limiteVelocidad,
        odometro,
        latitud,
        longitud,
        ubicacion: rawUbicacion ? String(rawUbicacion) : undefined,
        conductor: rawConductor ? String(rawConductor) : null,
      });

      if (res.success) {
        processedCount++;
        if (res.eventoId) insertedIds.push(res.eventoId);
      } else if (res.error) {
        errors.push(`Error en placa ${rawPlaca}: ${res.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Se procesaron exitosamente ${processedCount} de ${rawEvents.length} eventos de telemetría.`,
      procesados: processedCount,
      totalRecibidos: rawEvents.length,
      insertedIds,
      errores: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error en POST /api/gps/eventos:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar lote de eventos de telemetría." },
      { status: 500 }
    );
  }
}
