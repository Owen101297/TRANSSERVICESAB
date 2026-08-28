// Modelo de dominio: ASIGNACIÓN OPERATIVA
//
// Regla fundamental del blueprint: un conductor NO tiene un vehículo
// permanente. La relación conductor-vehículo vive siempre en una
// ASIGNACIÓN con fecha_inicio/fecha_fin — nunca como campo fijo en
// conductor.vehiculo_id. Cuando cambia la asignación, el historial queda
// intacto (no se sobreescribe, se cierra la anterior y se abre una nueva).
//
// Dos modalidades reales confirmadas:
// - "fija": el conductor no cambia de vehículo mientras dure el contrato.
// - "rotativa": aplica solo al contratista con 6 vehículos que rota
//   conductores en turnos de 12h o 24h, con ciclo de 4 días de descanso.

export type TipoAsignacion = "fija" | "rotativa";

export type TurnoRotativo = "12h-diurno" | "12h-nocturno" | "24h";

export type EstadoAsignacion = "activa" | "programada" | "finalizada";

export interface Asignacion {
  id: string;
  conductorId: string;
  conductorNombre: string;
  vehiculoId: string;
  placa: string;
  contratistaId: string;
  contratistaNombre: string;
  tipoAsignacion: TipoAsignacion;
  turno?: TurnoRotativo; // solo aplica cuando tipoAsignacion es "rotativa"
  fechaInicio: string; // ISO
  fechaFin?: string; // ISO — vacío si sigue activa
  estado: EstadoAsignacion;
  observaciones?: string;
}

export const TURNO_LABELS: Record<TurnoRotativo, string> = {
  "12h-diurno": "Turno 12h — diurno",
  "12h-nocturno": "Turno 12h — nocturno",
  "24h": "Turno 24h",
};

export const ESTADO_ASIGNACION_LABELS: Record<EstadoAsignacion, string> = {
  activa: "Activa",
  programada: "Programada",
  finalizada: "Finalizada",
};
