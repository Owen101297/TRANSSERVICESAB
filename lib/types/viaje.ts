// Modelo de dominio: VIAJE
//
// Regla del blueprint: esto NO es un sistema de despacho tradicional. Solo
// aplica a viajes fuera del municipio o de más de dos horas de duración.
// El flujo es: registro → viaje activo → finalización → novedades → historial.

export type EstadoViaje = "programado" | "en_curso" | "finalizado" | "con_novedad";

export type ServicioViaje = "especial" | "escolar" | "turismo";

export interface Novedad {
  id: string;
  fecha: string; // ISO datetime
  descripcion: string;
}

export interface Viaje {
  id: string;
  conductorId: string;
  conductorNombre: string;
  vehiculoId: string;
  placa: string;
  contratistaNombre: string;
  origen: string;
  destino: string;
  servicio: ServicioViaje;
  fechaSalida: string; // ISO datetime
  duracionEstimadaHoras: number;
  fechaLlegadaReal?: string; // ISO datetime
  estado: EstadoViaje;
  novedades: Novedad[];
  observaciones?: string;
}

export const ESTADO_VIAJE_LABELS: Record<EstadoViaje, string> = {
  programado: "Programado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  con_novedad: "Con novedad",
};
