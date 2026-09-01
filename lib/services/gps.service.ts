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

    if (Array.isArray(dbRecords)) {
      return dbRecords.map((r: any) => ({
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
    const validDate = isNaN(fechaHoraDate.getTime()) ? new Date() : fechaHoraDate;

    const eventoData = {
      placa: cleanPlaca,
      fechaHora: validDate,
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
      conductorNombre: conductorNombre || "Sin conductor asignado",
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
        fechaHora: validDate.toISOString(),
        tipoEvento: tipoEvento as TipoEventoGPS,
        prioridad: prioridad as PrioridadEventoGPS,
        descripcion: eventoData.descripcion,
        velocidad: eventoData.velocidad ?? undefined,
        limiteVelocidad: eventoData.limiteVelocidad ?? undefined,
        odometro: eventoData.odometro ?? undefined,
        latitud: eventoData.latitud ?? undefined,
        longitud: eventoData.longitud ?? undefined,
        ubicacion: eventoData.ubicacion,
        conductorId: conductorId,
        conductorNombre: eventoData.conductorNombre,
        conductorTelefono: conductorTelefono,
        conductorEmail: conductorEmail,
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

