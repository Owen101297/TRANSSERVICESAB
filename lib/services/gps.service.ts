"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  EventoGPS,
  TipoEventoGPS,
  PrioridadEventoGPS,
  EstadoRetroalimentacion,
  CalificacionConductorMensual,
} from "@/lib/types/gps";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import {
  calcularScoreConductor,
  normalizarTipoEventoSatelcopro,
  normalizarPrioridadSatelcopro,
} from "@/lib/utils/gps-scoring";

// Almacén en memoria como fallback en caso de indisponibilidad temporal
let inMemoryEventosGPS: EventoGPS[] = [];

/**
 * Consulta todos los eventos GPS reales con filtros (compatible con versión previa)
 */
export async function getEventosGPSDb(filtros?: {
  placa?: string;
  conductorId?: string;
  prioridad?: PrioridadEventoGPS;
  tipoEvento?: TipoEventoGPS;
  limite?: number;
  offset?: number;
  rango?: "hoy" | "24h" | "7d" | "mes" | "todos" | "personalizado";
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<EventoGPS[]> {
  const res = await getEventosGPSConPaginacionDb(filtros);
  return res.eventos;
}

/**
 * Consulta eventos GPS con soporte para paginación y filtros temporales
 */
export async function getEventosGPSConPaginacionDb(filtros?: {
  placa?: string;
  conductorId?: string;
  prioridad?: PrioridadEventoGPS | "todas";
  tipoEvento?: TipoEventoGPS | "todos";
  limite?: number;
  offset?: number;
  rango?: "hoy" | "24h" | "7d" | "mes" | "todos" | "personalizado";
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<{ eventos: EventoGPS[]; totalCount: number }> {
  try {
    const whereClause: any = {};
    if (filtros?.placa) whereClause.placa = { contains: filtros.placa.trim(), mode: "insensitive" };
    if (filtros?.conductorId) whereClause.conductorId = filtros.conductorId;
    if (filtros?.prioridad && filtros.prioridad !== "todas") whereClause.prioridad = filtros.prioridad;
    if (filtros?.tipoEvento && filtros.tipoEvento !== "todos") whereClause.tipoEvento = filtros.tipoEvento;

    // Filtros de fecha inteligente
    const now = new Date();
    if (filtros?.rango === "hoy") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      whereClause.fechaHora = { gte: startOfDay };
    } else if (filtros?.rango === "24h") {
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      whereClause.fechaHora = { gte: last24h };
    } else if (filtros?.rango === "7d") {
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      whereClause.fechaHora = { gte: last7d };
    } else if (filtros?.rango === "mes") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      whereClause.fechaHora = { gte: startOfMonth };
    } else if (filtros?.rango === "personalizado" && (filtros.fechaDesde || filtros.fechaHasta)) {
      whereClause.fechaHora = {};
      if (filtros.fechaDesde) whereClause.fechaHora.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) {
        const hastaDate = new Date(filtros.fechaHasta);
        hastaDate.setHours(23, 59, 59, 999);
        whereClause.fechaHora.lte = hastaDate;
      }
    }

    const limit = filtros?.limite !== undefined ? filtros.limite : 20;
    const skip = filtros?.offset || 0;

    const [totalCount, dbRecords] = await Promise.all([
      (prisma as any).eventoGPS.count({ where: whereClause }),
      (prisma as any).eventoGPS.findMany({
        where: whereClause,
        orderBy: { fechaHora: "desc" },
        take: limit,
        skip: skip,
      }),
    ]);

    if (Array.isArray(dbRecords)) {
      const formatted = dbRecords.map((r: any) => ({
        id: r.id,
        placa: r.placa,
        fechaHora: r.fechaHora ? new Date(r.fechaHora).toISOString() : new Date().toISOString(),
        tipoEvento: r.tipoEvento as TipoEventoGPS,
        prioridad: r.prioridad as PrioridadEventoGPS,
        descripcion: r.descripcion || `Evento ${r.tipoEvento} en ${r.placa}`,
        velocidad: r.velocidad !== null && r.velocidad !== undefined ? Number(r.velocidad) : undefined,
        limiteVelocidad: r.limiteVelocidad !== null && r.limiteVelocidad !== undefined ? Number(r.limiteVelocidad) : undefined,
        odometro: r.odometro !== null && r.odometro !== undefined ? Number(r.odometro) : undefined,
        latitud: r.latitud !== null && r.latitud !== undefined ? Number(r.latitud) : undefined,
        longitud: r.longitud !== null && r.longitud !== undefined ? Number(r.longitud) : undefined,
        ubicacion: r.ubicacion || undefined,
        conductorId: r.conductorId || undefined,
        conductorNombre: r.conductorNombre || undefined,
        conductorTelefono: r.conductorTelefono || undefined,
        conductorEmail: r.conductorEmail || undefined,
        estadoRetroalimentacion: (r.estadoRetroalimentacion || "pendiente") as EstadoRetroalimentacion,
        fechaRetroalimentacion: r.fechaRetroalimentacion ? new Date(r.fechaRetroalimentacion).toISOString() : undefined,
        observacionesGestion: r.observacionesGestion || undefined,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));

      return { eventos: formatted, totalCount };
    }

    return { eventos: [], totalCount: 0 };
  } catch (err) {
    console.warn("Aviso: Consultando fallback para eventos GPS:", err);
    return { eventos: inMemoryEventosGPS.slice(0, 20), totalCount: inMemoryEventosGPS.length };
  }
}

/**
 * Registra un evento GPS real proveniente de Satelcopro / n8n
 */
export async function registrarEventoGPSDb(rawEvent: {
  placa: string;
  fechaHora?: string;
  tipoEvento: string;
  prioridad?: string;
  descripcion?: string;
  velocidad?: number;
  limiteVelocidad?: number;
  odometro?: number;
  latitud?: number;
  longitud?: number;
  ubicacion?: string;
  conductor?: string | null;
}): Promise<{ success: boolean; eventoId?: string; error?: string }> {
  try {
    const rawPlacaClean = rawEvent.placa.trim().toUpperCase();
    const cleanPlaca = rawPlacaClean.replace(/[^A-Z0-9]/g, "");
    const hyphenPlaca = cleanPlaca.length === 6 ? `${cleanPlaca.slice(0, 3)}-${cleanPlaca.slice(3)}` : cleanPlaca;
    const tipoEvento = normalizarTipoEventoSatelcopro(rawEvent.tipoEvento);
    const prioridad = normalizarPrioridadSatelcopro(rawEvent.prioridad, tipoEvento);

    // 1. Trazabilidad Temporal Estricta:
    // Determinar la fecha/hora exacta del evento para imputación justa
    const fechaHoraDate = rawEvent.fechaHora ? new Date(rawEvent.fechaHora) : new Date();
    const eventTime = isNaN(fechaHoraDate.getTime()) ? new Date() : fechaHoraDate;

    let conductorId: string | null = null;
    let conductorNombre: string = "Sin conductor asignado";
    let conductorTelefono: string | null = null;
    let conductorEmail: string | null = null;

    // Buscar en la base de datos de Asignaciones si el vehículo tenía un conductor oficial en eventTime
    // Buscando con y sin guion (ej. "NSY352", "NSY-352")
    try {
      const asignacion = await (prisma as any).asignacion.findFirst({
        where: {
          OR: [
            { placa: { equals: cleanPlaca, mode: "insensitive" } },
            { placa: { equals: hyphenPlaca, mode: "insensitive" } },
            { placa: { equals: rawPlacaClean, mode: "insensitive" } },
            { placa: { contains: cleanPlaca, mode: "insensitive" } },
          ],
          fechaInicio: { lte: eventTime },
          estado: { in: ["activa", "finalizada"] },
        },
        orderBy: { fechaInicio: "desc" },
        include: {
          conductor: true,
        },
      });

      if (asignacion && (!asignacion.fechaFin || new Date(asignacion.fechaFin) >= eventTime)) {
        conductorId = asignacion.conductorId;
        conductorNombre = asignacion.conductorNombre;
        if (asignacion.conductor) {
          conductorTelefono = asignacion.conductor.telefono || null;
          conductorEmail = asignacion.conductor.email || null;
        }
      }
    } catch (dbErr) {
      // Fallback a asignaciones en memoria si DB directa falla
      const asignaciones = await getAsignacionesDb();
      const match = asignaciones.find((a) => {
        const normA = (a.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (normA !== cleanPlaca) return false;
        const inicio = new Date(a.fechaInicio).getTime();
        const fin = a.fechaFin ? new Date(a.fechaFin).getTime() : Infinity;
        const t = eventTime.getTime();
        return t >= inicio && t <= fin && (a.estado === "activa" || a.estado === "finalizada");
      });

      if (match) {
        conductorId = match.conductorId;
        conductorNombre = match.conductorNombre;
        const personas = await getPersonasDb();
        const p = personas.find((x) => x.id === conductorId);
        if (p) {
          conductorTelefono = p.telefono || null;
          conductorEmail = p.email || null;
        }
      }
    }

    const eventoData = {
      placa: hyphenPlaca,
      fechaHora: eventTime,
      tipoEvento,
      prioridad,
      descripcion: rawEvent.descripcion || `Evento ${tipoEvento} registrado en vehículo ${cleanPlaca}`,
      velocidad: rawEvent.velocidad !== undefined ? Number(rawEvent.velocidad) : null,
      limiteVelocidad: rawEvent.limiteVelocidad !== undefined ? Number(rawEvent.limiteVelocidad) : null,
      odometro: rawEvent.odometro !== undefined ? Number(rawEvent.odometro) : null,
      latitud: rawEvent.latitud !== undefined ? Number(rawEvent.latitud) : null,
      longitud: rawEvent.longitud !== undefined ? Number(rawEvent.longitud) : null,
      ubicacion: rawEvent.ubicacion || (rawEvent.latitud ? `${rawEvent.latitud.toFixed(4)}, ${rawEvent.longitud?.toFixed(4)}` : "En ruta"),
      conductorId: conductorId || null,
      conductorNombre: conductorNombre,
      conductorTelefono: conductorTelefono || null,
      conductorEmail: conductorEmail || null,
      estadoRetroalimentacion: "pendiente",
    };

    let createdId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    try {
      const created = await (prisma as any).eventoGPS.create({
        data: eventoData,
      });
      createdId = created.id;
    } catch (dbErr) {
      console.warn("Guardando en memoria fallback por error de DB:", dbErr);
      inMemoryEventosGPS.unshift({
        id: createdId,
        placa: eventoData.placa,
        fechaHora: eventTime.toISOString(),
        tipoEvento: tipoEvento as TipoEventoGPS,
        prioridad: prioridad as PrioridadEventoGPS,
        descripcion: eventoData.descripcion,
        velocidad: eventoData.velocidad ?? undefined,
        limiteVelocidad: eventoData.limiteVelocidad ?? undefined,
        odometro: eventoData.odometro ?? undefined,
        latitud: eventoData.latitud ?? undefined,
        longitud: eventoData.longitud ?? undefined,
        ubicacion: eventoData.ubicacion,
        conductorId: conductorId ?? undefined,
        conductorNombre: eventoData.conductorNombre,
        conductorTelefono: conductorTelefono ?? undefined,
        conductorEmail: conductorEmail ?? undefined,
        estadoRetroalimentacion: "pendiente",
        createdAt: new Date().toISOString(),
      });
    }

    revalidatePath("/gps");
    revalidatePath("/dashboard");
    revalidatePath("/flota");

    return { success: true, eventoId: createdId };
  } catch (error: any) {
    console.error("Error al registrar evento GPS:", error);
    return { success: false, error: error.message || "Error al procesar evento de telemetría." };
  }
}

/**
 * Marca una retroalimentación como enviada al conductor
 */
export async function marcarRetroalimentacionDb(
  eventoId: string,
  canal: "whatsapp" | "correo",
  observaciones?: string
) {
  try {
    const estadoRetroalimentacion = canal === "whatsapp" ? "enviada_whatsapp" : "enviada_correo";
    const fechaRetroalimentacion = new Date();
    const obs = observaciones || `Notificado vía ${canal.toUpperCase()} al conductor.`;

    try {
      await (prisma as any).eventoGPS.update({
        where: { id: eventoId },
        data: {
          estadoRetroalimentacion,
          fechaRetroalimentacion,
          observacionesGestion: obs,
        },
      });
    } catch (err) {
      const idx = inMemoryEventosGPS.findIndex((e) => e.id === eventoId);
      if (idx >= 0) {
        inMemoryEventosGPS[idx].estadoRetroalimentacion = estadoRetroalimentacion as EstadoRetroalimentacion;
        inMemoryEventosGPS[idx].fechaRetroalimentacion = fechaRetroalimentacion.toISOString();
        inMemoryEventosGPS[idx].observacionesGestion = obs;
      }
    }

    revalidatePath("/gps");
    revalidatePath("/dashboard");

    const refreshedEventos = await getEventosGPSDb();
    return { success: true, refreshedEventos };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar estado de retroalimentación." };
  }
}

/**
 * Resumen de métricas de telemetría
 */
export async function getResumenAlertasGPSDb() {
  const eventos = await getEventosGPSDb();

  const totalEventos = eventos.length;
  const criticos = eventos.filter((e) => e.prioridad === "alta").length;
  const pendientesRetroalimentacion = eventos.filter(
    (e) => e.estadoRetroalimentacion === "pendiente" && e.prioridad !== "baja"
  ).length;

  const vehiculosConEventos: Record<string, number> = {};
  eventos.forEach((e) => {
    vehiculosConEventos[e.placa] = (vehiculosConEventos[e.placa] || 0) + 1;
  });

  const reincidentes = Object.entries(vehiculosConEventos).filter(([_, count]) => count >= 2);

  return {
    totalEventos,
    criticos,
    pendientesRetroalimentacion,
    vehiculosReincidentes: reincidentes.length,
    placasReincidentes: reincidentes.map(([placa, count]) => ({ placa, count })),
  };
}

/**
 * Obtiene el ranking mensual de calificaciones de conductores
 */
export async function getCalificacionesConductoresDb(
  mes: string = new Date().toISOString().slice(0, 7)
): Promise<CalificacionConductorMensual[]> {
  const personas = await getPersonasDb();
  const conductores = personas.filter((p) => p.perfiles?.includes("conductor"));
  const eventos = await getEventosGPSDb();

  const mesEventos = eventos.filter((e) => e.fechaHora.startsWith(mes));

  return conductores
    .map((c) => calcularScoreConductor(c, mesEventos, mes))
    .sort((a, b) => b.puntajeTotal - a.puntajeTotal);
}

// Alias de exportación para compatibilidad
export const getCalificacionesMensualesDb = getCalificacionesConductoresDb;

