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
import { calcularScoreConductor } from "@/lib/utils/gps-scoring";

// Almacén en memoria como fallback si la base de datos no estuviera disponible
let inMemoryEventosGPS: EventoGPS[] = [];

/**
 * Consulta todos los eventos GPS reales con filtros
 */
export async function getEventosGPSDb(filtros?: {
  placa?: string;
  conductorId?: string;
  prioridad?: PrioridadEventoGPS;
  tipoEvento?: TipoEventoGPS;
  limite?: number;
}): Promise<EventoGPS[]> {
  try {
    const whereClause: any = {};
    if (filtros?.placa) whereClause.placa = { contains: filtros.placa.trim(), mode: "insensitive" };
    if (filtros?.conductorId) whereClause.conductorId = filtros.conductorId;
    if (filtros?.prioridad) whereClause.prioridad = filtros.prioridad;
    if (filtros?.tipoEvento) whereClause.tipoEvento = filtros.tipoEvento;

    const dbRecords = await (prisma as any).eventoGPS.findMany({
      where: whereClause,
      orderBy: { fechaHora: "desc" },
      take: filtros?.limite || 100,
    });

    if (dbRecords && dbRecords.length > 0) {
      return dbRecords.map((r: any) => ({
        id: r.id,
        placa: r.placa,
        fechaHora: r.fechaHora ? new Date(r.fechaHora).toISOString() : new Date().toISOString(),
        tipoEvento: r.tipoEvento as TipoEventoGPS,
        prioridad: r.prioridad as PrioridadEventoGPS,
        descripcion: r.descripcion,
        velocidad: r.velocidad ?? undefined,
        limiteVelocidad: r.limiteVelocidad ?? undefined,
        odometro: r.odometro ?? undefined,
        latitud: r.latitud ?? undefined,
        longitud: r.longitud ?? undefined,
        ubicacion: r.ubicacion ?? undefined,
        conductorId: r.conductorId ?? undefined,
        conductorNombre: r.conductorNombre ?? undefined,
        conductorTelefono: r.conductorTelefono ?? undefined,
        conductorEmail: r.conductorEmail ?? undefined,
        estadoRetroalimentacion: (r.estadoRetroalimentacion || "pendiente") as EstadoRetroalimentacion,
        fechaRetroalimentacion: r.fechaRetroalimentacion ? new Date(r.fechaRetroalimentacion).toISOString() : undefined,
        observacionesGestion: r.observacionesGestion ?? undefined,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Aviso: Consultando fallback en memoria para eventos GPS:", err);
  }

  // Fallback en memoria
  let list = [...inMemoryEventosGPS];
  if (filtros?.placa) {
    list = list.filter((e) => e.placa.toLowerCase().includes(filtros.placa!.toLowerCase()));
  }
  if (filtros?.conductorId) {
    list = list.filter((e) => e.conductorId === filtros.conductorId);
  }
  if (filtros?.prioridad) {
    list = list.filter((e) => e.prioridad === filtros.prioridad);
  }
  if (filtros?.tipoEvento) {
    list = list.filter((e) => e.tipoEvento === filtros.tipoEvento);
  }

  return list.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
}

/**
 * Normaliza el tipo de evento de Satelcopro
 */
export function normalizarTipoEventoSatelcopro(rawTipo: string): TipoEventoGPS {
  const t = (rawTipo || "").toLowerCase().trim();
  if (t.includes("overspeed") || t.includes("velocid") || t.includes("speed")) return "exceso_velocidad";
  if (t.includes("frenad") || t.includes("brak")) return "frenada_brusca";
  if (t.includes("aceler") || t.includes("accel")) return "acelerada_brusca";
  if (t.includes("giro") || t.includes("turn") || t.includes("corner")) return "giro_brusco";
  if (t.includes("panic") || t.includes("sos") || t.includes("alarma")) return "panico";
  if (t.includes("desconex") || t.includes("bater") || t.includes("power")) return "desconexion";
  if (t.includes("apagad") || t.includes("off")) return "apagado";
  if (t.includes("encendid") || t.includes("on")) return "encendido";
  if (t.includes("ralenti") || t.includes("idle") || t.includes("parada")) return "ralenti";
  if (t.includes("geocerca") || t.includes("fence")) return "salida_geocerca";
  return "otro";
}

/**
 * Normaliza la prioridad de Satelcopro
 */
export function normalizarPrioridadSatelcopro(rawPrioridad?: string, tipo?: TipoEventoGPS): PrioridadEventoGPS {
  const p = (rawPrioridad || "").toLowerCase().trim();
  if (p === "alta" || p === "critica" || p === "high" || p === "critical") return "alta";
  if (p === "media" || p === "medium") return "media";
  if (p === "baja" || p === "informativa" || p === "low" || p === "info") return "baja";

  // Si no viene prioridad explícita, deducir por tipo de evento
  if (tipo === "exceso_velocidad" || tipo === "panico" || tipo === "desconexion") return "alta";
  if (tipo === "frenada_brusca" || tipo === "acelerada_brusca" || tipo === "giro_brusco" || tipo === "salida_geocerca") return "media";
  return "baja";
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
    const cleanPlaca = rawEvent.placa.trim().toUpperCase();
    const tipoEvento = normalizarTipoEventoSatelcopro(rawEvent.tipoEvento);
    const prioridad = normalizarPrioridadSatelcopro(rawEvent.prioridad, tipoEvento);

    // 1. Resolución de Conductor:
    let conductorId: string | undefined;
    let conductorNombre: string | undefined;
    let conductorTelefono: string | undefined;
    let conductorEmail: string | undefined;

    const personas = await getPersonasDb();

    // Caso A: n8n envía el nombre del conductor (ej. "JORGE VARGAS" o "GUR610 - JORGE VARGAS")
    if (rawEvent.conductor && rawEvent.conductor.trim().length > 0) {
      let rawName = rawEvent.conductor.trim();
      if (rawName.includes("-")) {
        const parts = rawName.split("-");
        rawName = parts[parts.length - 1].trim();
      }
      conductorNombre = rawName;

      // Buscar si existe en la base de datos de Personas
      const q = rawName.toLowerCase();
      const matchPersona = personas.find((p) => {
        const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
        return full.includes(q) || q.includes(p.nombres.toLowerCase()) || q.includes(p.apellidos.toLowerCase());
      });

      if (matchPersona) {
        conductorId = matchPersona.id;
        conductorNombre = `${matchPersona.nombres} ${matchPersona.apellidos}`;
        conductorTelefono = matchPersona.telefono;
        conductorEmail = matchPersona.email;
      }
    }

    // Caso B: Si no vino conductor o no se halló, resolver por Asignación activa de esa placa
    if (!conductorId) {
      const asignaciones = await getAsignacionesDb();
      const asignacionActiva = asignaciones.find(
        (a) => a.placa.toUpperCase() === cleanPlaca && a.estado === "activa"
      );

      if (asignacionActiva) {
        conductorId = asignacionActiva.conductorId;
        conductorNombre = asignacionActiva.conductorNombre;
        const matchConductor = personas.find((p) => p.id === conductorId);
        if (matchConductor) {
          conductorTelefono = matchConductor.telefono;
          conductorEmail = matchConductor.email;
        }
      }
    }

    const fechaHoraDate = rawEvent.fechaHora ? new Date(rawEvent.fechaHora) : new Date();

    const eventoData = {
      placa: cleanPlaca,
      fechaHora: fechaHoraDate,
      tipoEvento,
      prioridad,
      descripcion: rawEvent.descripcion || `Evento ${tipoEvento} registrado en vehículo ${cleanPlaca}`,
      velocidad: typeof rawEvent.velocidad === "number" ? rawEvent.velocidad : undefined,
      limiteVelocidad: typeof rawEvent.limiteVelocidad === "number" ? rawEvent.limiteVelocidad : undefined,
      odometro: typeof rawEvent.odometro === "number" ? rawEvent.odometro : undefined,
      latitud: typeof rawEvent.latitud === "number" ? rawEvent.latitud : undefined,
      longitud: typeof rawEvent.longitud === "number" ? rawEvent.longitud : undefined,
      ubicacion: rawEvent.ubicacion || (rawEvent.latitud ? `${rawEvent.latitud.toFixed(4)}, ${rawEvent.longitud?.toFixed(4)}` : "En ruta"),
      conductorId: conductorId || undefined,
      conductorNombre: conductorNombre || "Sin conductor asignado",
      conductorTelefono: conductorTelefono || undefined,
      conductorEmail: conductorEmail || undefined,
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
        ...eventoData,
        fechaHora: fechaHoraDate.toISOString(),
        tipoEvento: tipoEvento as TipoEventoGPS,
        prioridad: prioridad as PrioridadEventoGPS,
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
    } catch (e) {
      const idx = inMemoryEventosGPS.findIndex((x) => x.id === eventoId);
      if (idx >= 0) {
        inMemoryEventosGPS[idx] = {
          ...inMemoryEventosGPS[idx],
          estadoRetroalimentacion,
          fechaRetroalimentacion: fechaRetroalimentacion.toISOString(),
          observacionesGestion: obs,
        };
      }
    }

    revalidatePath("/gps");
    const refreshed = await getEventosGPSDb();
    return { success: true, refreshedEventos: refreshed };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar estado de retroalimentación." };
  }
}

/**
 * Obtiene la calificación mensual (Driver Safety Score) de todos los conductores reales
 */
export async function getCalificacionesMensualesDb(
  mes: string = new Date().toISOString().slice(0, 7)
): Promise<CalificacionConductorMensual[]> {
  const personas = await getPersonasDb();
  const conductores = personas.filter((p) => p.perfiles.includes("conductor"));
  const eventos = await getEventosGPSDb();

  // Filtrar eventos del mes solicitado
  const eventosMes = eventos.filter((e) => e.fechaHora.startsWith(mes));

  const scores: CalificacionConductorMensual[] = conductores.map((c) => {
    return calcularScoreConductor(c, eventosMes, mes);
  });

  // Ordenar por puntaje más alto (Ranking de Honor)
  scores.sort((a, b) => b.puntajeTotal - a.puntajeTotal);

  // Asignar posición de ranking
  scores.forEach((s, idx) => {
    s.posicionRanking = idx + 1;
  });

  return scores;
}

/**
 * Obtiene resumen estadístico del centro de alertas de telemetría en tiempo real
 */
export async function getResumenAlertasGPSDb() {
  const eventos = await getEventosGPSDb();

  const totalEventos = eventos.length;
  const criticos = eventos.filter((e) => e.prioridad === "alta").length;
  const pendientesRetroalimentacion = eventos.filter(
    (e) => e.estadoRetroalimentacion === "pendiente" && e.prioridad !== "baja"
  ).length;

  // Agrupar reincidencias por placa (≥ 2 eventos no informativos)
  const reincidenciasPorPlaca: Record<string, number> = {};
  for (const e of eventos) {
    if (e.prioridad !== "baja") {
      reincidenciasPorPlaca[e.placa] = (reincidenciasPorPlaca[e.placa] || 0) + 1;
    }
  }

  const placasReincidentes = Object.entries(reincidenciasPorPlaca)
    .filter(([_, count]) => count >= 2)
    .map(([placa, count]) => ({ placa, count }));

  return {
    totalEventos,
    criticos,
    pendientesRetroalimentacion,
    vehiculosReincidentes: placasReincidentes.length,
    placasReincidentes,
  };
}
