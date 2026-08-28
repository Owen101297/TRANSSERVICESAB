export type TipoCapacitacion = "sg-sst" | "pesv" | "hseq" | "operativa";
export type EstadoCapacitacion = "programada" | "realizada" | "cancelada";

export interface Capacitacion {
  id: string;
  nombre: string;
  tipo: TipoCapacitacion;
  fecha: string; // ISO
  duracionHoras: number;
  asistentesEsperados: number;
  asistentesReales?: number;
  estado: EstadoCapacitacion;
}

export const TIPO_CAPACITACION_LABELS: Record<TipoCapacitacion, string> = {
  "sg-sst": "SG-SST",
  pesv: "PESV",
  hseq: "HSEQ",
  operativa: "Operativa",
};

export const ESTADO_CAPACITACION_LABELS: Record<EstadoCapacitacion, string> = {
  programada: "Programada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};
