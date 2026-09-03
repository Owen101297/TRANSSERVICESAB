export type TipoCapacitacion = "pesv" | "sg-sst" | "hseq" | "operativa";
export type ProgramaCapacitacion = 
  | "Plan de Capacitacion PESV (Paso 9/18)" 
  | "Plan Anual SG-SST (Dec 1072 / Res 0312)" 
  | "Formacion Operativa y de Servicio";

export type CategoriaCapacitacion = 
  | "charla_semanal" 
  | "capacitacion_mensual" 
  | "induccion" 
  | "entrenamiento";

export type EstadoCapacitacion = "programada" | "realizada" | "cancelada";

export interface PreguntaEvaluacion {
  id: number;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number; // Índice 0, 1, 2...
}

export interface AsistenciaItem {
  id: string;
  personaId?: string | null;
  personaDocumento?: string | null;
  personaNombre: string;
  cargo?: string | null;
  estado: string;
  firmaUrl?: string | null;
  fotoUrl?: string | null; // Selfie de evidencia
  calificacion?: number | null;
  tiempoLectura?: number | null;
  fecha: string;
}

export interface Capacitacion {
  id: string;
  nombre: string;
  tipo: TipoCapacitacion;
  programa: string;
  categoria: CategoriaCapacitacion;
  fecha: string; // ISO
  duracionHoras: number;
  facilitador?: string | null;
  objetivo?: string | null;
  lugar?: string | null;
  materialTipo: "texto" | "video" | "pdf" | "presentacion";
  materialUrl?: string | null;
  materialContenido?: string | null;
  preguntas?: PreguntaEvaluacion[];
  requiereSelfie: boolean;
  requiereFirma: boolean;
  asistentesEsperados: number;
  asistentesReales?: number;
  estado: EstadoCapacitacion;
  asistencias?: AsistenciaItem[];
}

export const TIPO_CAPACITACION_LABELS: Record<TipoCapacitacion, string> = {
  pesv: "PESV (Seguridad Vial)",
  "sg-sst": "SG-SST (Seguridad y Salud)",
  hseq: "HSEQ (Calidad y Ambiente)",
  operativa: "Operativa y Mecánica",
};

export const CATEGORIA_CAPACITACION_LABELS: Record<CategoriaCapacitacion, string> = {
  charla_semanal: "Charla Semanal (5-10 min)",
  capacitacion_mensual: "Capacitación Mensual Formal",
  induccion: "Inducción / Reinducción",
  entrenamiento: "Entrenamiento Práctico",
};

export const ESTADO_CAPACITACION_LABELS: Record<EstadoCapacitacion, string> = {
  programada: "Programada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};
