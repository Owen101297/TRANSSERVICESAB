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

// Almacén en memoria para demostración y fallback
let localEventosGPSState: EventoGPS[] = [
  {
    id: "evt_1",
    placa: "WLM-789",
    fechaHora: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    tipoEvento: "exceso_velocidad",
    prioridad: "alta",
    descripcion: "Velocidad registrada: 88 km/h en tramo regulado a 60 km/h",
    velocidad: 88,
    limiteVelocidad: 60,
    odometro: 145230,
    ubicacion: "Vía Turbaco - Variante Cartagena km 12",
    conductorId: "p_1",
    conductorNombre: "Carlos Gómez",
    conductorTelefono: "3001234567",
    conductorEmail: "carlos.gomez@transservices.com",
    estadoRetroalimentacion: "pendiente",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt_2",
    placa: "WLM-789",
    fechaHora: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    tipoEvento: "frenada_brusca",
    prioridad: "media",
    descripcion: "Desaceleración intempestiva de -4.2 m/s²",
    velocidad: 42,
    odometro: 145210,
    ubicacion: "Av. Pedro de Heredia, Sector Pie de la Popa",
    conductorId: "p_1",
    conductorNombre: "Carlos Gómez",
    conductorTelefono: "3001234567",
    conductorEmail: "carlos.gomez@transservices.com",
    estadoRetroalimentacion: "pendiente",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt_3",
    placa: "WLM-789",
    fechaHora: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    tipoEvento: "acelerada_brusca",
    prioridad: "media",
    descripcion: "Aceleración intempestiva de 3.8 m/s²",
    velocidad: 55,
    odometro: 145180,
    ubicacion: "Salida Zona Industrial Mamonal",
    conductorId: "p_1",
    conductorNombre: "Carlos Gómez",
    conductorTelefono: "3001234567",
    conductorEmail: "carlos.gomez@transservices.com",
    estadoRetroalimentacion: "pendiente",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt_4",
    placa: "TLK-456",
    fechaHora: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    tipoEvento: "exceso_velocidad",
    prioridad: "alta",
    descripcion: "Velocidad registrada: 82 km/h en tramo urbano",
    velocidad: 82,
    limiteVelocidad: 60,
    odometro: 89450,
    ubicacion: "Corredor de Carga km 4",
    conductorId: "p_2",
    conductorNombre: "María Elena Morales",
    conductorTelefono: "3129876543",
    conductorEmail: "maria.morales@transservices.com",
    estadoRetroalimentacion: "enviada_whatsapp",
    fechaRetroalimentacion: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    observacionesGestion: "Notificado vía WhatsApp. Conductora confirmó compromiso.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt_5",
    placa: "SZO-123",
    fechaHora: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    tipoEvento: "ralenti",
    prioridad: "baja",
    descripcion: "Motor encendido en estacionamiento por 24 minutos continuo",
    velocidad: 0,
    odometro: 210340,
    ubicacion: "Parqueadero Planta Argos Mamonal",
    conductorId: "p_3",
    conductorNombre: "Andrés Felipe Ruiz",
    conductorTelefono: "3154567890",
    conductorEmail: "andres.ruiz@transservices.com",
    estadoRetroalimentacion: "pendiente",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt_6",
    placa: "TLK-456",
    fechaHora: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    tipoEvento: "frenada_brusca",
    prioridad: "media",
    descripcion: "Frenada preventiva en reductor de velocidad",
    velocidad: 35,
    odometro: 89390,
    ubicacion: "Anillo Vial Cartagena - Barranquilla",
    conductorId: "p_2",
    conductorNombre: "María Elena Morales",
    conductorTelefono: "3129876543",
    conductorEmail: "maria.morales@transservices.com",
    estadoRetroalimentacion: "pendiente",
    createdAt: new Date().toISOString(),
  },
];

/**
 * Consulta todos los eventos GPS con filtros
 */
export async function getEventosGPSDb(filtros?: {
  placa?: string;
  conductorId?: string;
  prioridad?: PrioridadEventoGPS;
  tipoEvento?: TipoEventoGPS;
}): Promise<EventoGPS[]> {
  let list = [...localEventosGPSState];

  if (filtros?.placa) {
    list = list.filter((e) => e.placa.toLowerCase() === filtros.placa?.toLowerCase());
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

  // Ordenar de más reciente a más antiguo
  return list.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
}

/**
 * Registra un evento GPS proveniente de Satelcopro / n8n
 */
export async function registrarEventoGPSDb(rawEvent: {
  placa: string;
  fechaHora?: string;
  tipoEvento: TipoEventoGPS;
  prioridad?: PrioridadEventoGPS;
  descripcion?: string;
  velocidad?: number;
  limiteVelocidad?: number;
  odometro?: number;
  latitud?: number;
  longitud?: number;
  ubicacion?: string;
}): Promise<{ success: boolean; eventoId?: string; error?: string }> {
  try {
    const cleanPlaca = rawEvent.placa.trim().toUpperCase();

    // 1. Asignar severidad por defecto si no viene
    let prioridad: PrioridadEventoGPS = rawEvent.prioridad || "media";
    if (rawEvent.tipoEvento === "exceso_velocidad" || rawEvent.tipoEvento === "panico" || rawEvent.tipoEvento === "desconexion") {
      prioridad = "alta";
    }

    // 2. Asociar automáticamente el conductor activo en esa placa
    const asignaciones = await getAsignacionesDb();
    const asignacionActiva = asignaciones.find(
      (a) => a.placa.toUpperCase() === cleanPlaca && a.estado === "activa"
    );

    let conductorId = asignacionActiva?.conductorId;
    let conductorNombre = asignacionActiva?.conductorNombre;
    let conductorTelefono: string | undefined;
    let conductorEmail: string | undefined;

    if (conductorId) {
      const personas = await getPersonasDb();
      const conductor = personas.find((p) => p.id === conductorId);
      if (conductor) {
        conductorTelefono = conductor.telefono;
        conductorEmail = conductor.email;
      }
    }

    const nuevoEvento: EventoGPS = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      placa: cleanPlaca,
      fechaHora: rawEvent.fechaHora || new Date().toISOString(),
      tipoEvento: rawEvent.tipoEvento,
      prioridad,
      descripcion: rawEvent.descripcion || `Evento de ${rawEvent.tipoEvento} en vehículo ${cleanPlaca}`,
      velocidad: rawEvent.velocidad,
      limiteVelocidad: rawEvent.limiteVelocidad,
      odometro: rawEvent.odometro,
      latitud: rawEvent.latitud,
      longitud: rawEvent.longitud,
      ubicacion: rawEvent.ubicacion || (rawEvent.latitud ? `${rawEvent.latitud.toFixed(4)}, ${rawEvent.longitud?.toFixed(4)}` : "En ruta"),
      conductorId,
      conductorNombre: conductorNombre || "Sin conductor asignado",
      conductorTelefono,
      conductorEmail,
      estadoRetroalimentacion: "pendiente",
      createdAt: new Date().toISOString(),
    };

    localEventosGPSState.unshift(nuevoEvento);

    revalidatePath("/gps");
    revalidatePath("/dashboard");
    revalidatePath(`/flota`);

    return { success: true, eventoId: nuevoEvento.id };
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
    const idx = localEventosGPSState.findIndex((e) => e.id === eventoId);
    if (idx >= 0) {
      localEventosGPSState[idx] = {
        ...localEventosGPSState[idx],
        estadoRetroalimentacion: canal === "whatsapp" ? "enviada_whatsapp" : "enviada_correo",
        fechaRetroalimentacion: new Date().toISOString(),
        observacionesGestion: observaciones || `Notificado vía ${canal.toUpperCase()} al conductor.`,
      };
    }

    revalidatePath("/gps");
    return { success: true, refreshedEventos: [...localEventosGPSState] };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar estado de retroalimentación." };
  }
}

/**
 * Obtiene la calificación mensual (Driver Safety Score) de todos los conductores
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
 * Obtiene resumen estadístico del centro de alertas de telemetría
 */
export async function getResumenAlertasGPSDb() {
  const eventos = await getEventosGPSDb();

  const totalHoy = eventos.filter(
    (e) => new Date(e.fechaHora).toDateString() === new Date().toDateString()
  ).length;

  const criticos = eventos.filter((e) => e.prioridad === "alta").length;
  const pendientesRetroalimentacion = eventos.filter(
    (e) => e.estadoRetroalimentacion === "pendiente" && e.prioridad !== "baja"
  ).length;

  // Agrupar reincidencias por placa
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
    totalEventos: eventos.length,
    totalHoy,
    criticos,
    pendientesRetroalimentacion,
    placasReincidentes,
  };
}
