export type EstadoAsistencia = "presente" | "ausente" | "tardanza";
export type TipoEvento = "capacitacion" | "reunion" | "turno";

export interface RegistroAsistencia {
  id: string;
  personaId: string;
  personaNombre: string;
  evento: string;
  tipoEvento: TipoEvento;
  fecha: string; // ISO
  estado: EstadoAsistencia;
}

export const ESTADO_ASISTENCIA_LABELS: Record<EstadoAsistencia, string> = {
  presente: "Presente",
  ausente: "Ausente",
  tardanza: "Tardanza",
};

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  capacitacion: "Capacitación",
  reunion: "Reunión",
  turno: "Turno",
};
