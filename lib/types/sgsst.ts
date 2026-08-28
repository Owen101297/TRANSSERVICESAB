// Modelo de dominio: SG-SST
//
// Estructura basada en la Resolución 0312 de 2019 (Estándares Mínimos del
// SG-SST) y el Decreto 1072 de 2015. Los 7 estándares se organizan bajo el
// ciclo PHVA (Planear, Hacer, Verificar, Actuar). Este módulo es una
// MATRIZ GENERAL — no contiene la matriz real de la empresa. Está pensado
// para que cada ítem reciba su documento/evidencia real (la que ya tienes
// en tus archivos locales) y su estado de cumplimiento se actualice.
//
// Nota importante: la redacción exacta de cada ítem y su peso porcentual
// debe verificarse contra el texto oficial de la Resolución 0312 de 2019
// antes de usarse en una autoevaluación formal — aquí se reconstruye la
// estructura pública conocida para dar forma al módulo, no reemplaza la
// lectura del texto normativo ni tu matriz real.

export type CicloPHVA = "planear" | "hacer" | "verificar" | "actuar";

export type EstadoItemSGSST =
  | "cumple"
  | "cumple_parcial"
  | "no_cumple"
  | "no_aplica"
  | "pendiente";

export interface EstandarSGSST {
  id: string;
  numero: string; // ej. "1", "2"...
  nombre: string;
  ciclo: CicloPHVA;
  pesoPorcentual: number; // % dentro del 100% total de la Resolución 0312
}

export interface ItemSGSST {
  id: string;
  numeral: string; // ej. "1.1.1"
  estandarId: string;
  nombre: string;
  estado: EstadoItemSGSST;
  responsable?: string;
  documentoNombre?: string; // nombre del archivo cargado (simulado, sin backend aún)
  fechaActualizacion?: string; // ISO
  observaciones?: string;
}

export const CICLO_LABELS: Record<CicloPHVA, string> = {
  planear: "Planear",
  hacer: "Hacer",
  verificar: "Verificar",
  actuar: "Actuar",
};

export const ESTADO_ITEM_LABELS: Record<EstadoItemSGSST, string> = {
  cumple: "Cumple",
  cumple_parcial: "Cumple parcialmente",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
  pendiente: "Pendiente de evidencia",
};
