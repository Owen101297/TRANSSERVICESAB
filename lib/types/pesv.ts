// Modelo de dominio: PESV (Plan Estratégico de Seguridad Vial)
//
// Metodología vigente: Resolución 20223040040595 de 2022 (Ministerio de
// Transporte) — deroga la Resolución 1565 de 2014. 4 fases, 24 pasos, bajo
// ciclo PHVA, articulado con el SG-SST.
//
// Reporte obligatorio: SINST-VIGIA 2 (Superintendencia de Transporte, antes
// SISI/PESV), con dos formularios:
//   1. Diseño e implementación del PESV o su actualización — anual, plazo
//      hasta el décimo día hábil de agosto.
//   2. Indicadores mensuales, trimestrales y anuales — plazo hasta el
//      décimo día hábil del mes siguiente al periodo correspondiente.
//
// Esta estructura de datos se diseñó para que cada paso y cada indicador
// mapeen directamente a esos dos formularios, y así la carga a VIGIA2 sea
// prácticamente copiar lo que ya está documentado aquí.
//
// Nota importante: la redacción y numeración exacta de los 24 pasos (en
// especial los de la Fase 2 — Implementación) debe verificarse contra el
// texto oficial de la Resolución 40595 de 2022 antes de un reporte formal.

export type FasePESV = "planificacion" | "implementacion" | "seguimiento" | "mejora";

export type NivelPESV = "basico" | "estandar" | "avanzado";

export type EstadoPasoPESV =
  | "cumple"
  | "cumple_parcial"
  | "no_cumple"
  | "no_aplica"
  | "pendiente";

export interface PasoPESV {
  id: string;
  numero: number; // 1-24
  fase: FasePESV;
  nombre: string;
  aplicaNiveles: NivelPESV[]; // en cuáles de los 3 niveles aplica este paso
  estado: EstadoPasoPESV;
  documentoNombre?: string;
  observaciones?: string;
}

export type PeriodicidadIndicador = "mensual" | "trimestral" | "anual";

export interface IndicadorPESV {
  id: string;
  nombre: string;
  periodicidad: PeriodicidadIndicador;
  unidad: string;
  descripcion: string;
  valorActual?: number;
}

export const FASE_LABELS: Record<FasePESV, string> = {
  planificacion: "Planificación",
  implementacion: "Implementación y ejecución",
  seguimiento: "Seguimiento por la organización",
  mejora: "Mejora continua",
};

export const NIVEL_LABELS: Record<NivelPESV, string> = {
  basico: "Básico",
  estandar: "Estándar",
  avanzado: "Avanzado",
};

export const ESTADO_PASO_LABELS: Record<EstadoPasoPESV, string> = {
  cumple: "Cumple",
  cumple_parcial: "Cumple parcialmente",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
  pendiente: "Pendiente de evidencia",
};
