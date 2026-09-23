import "server-only";

import type { SessionUser } from "@/lib/session";

export const EVENTO_ESTADOS = [
  "borrador",
  "pendiente_aprobacion",
  "programado",
  "en_curso",
  "pendiente_revision",
  "cerrado",
  "cancelado",
] as const;

export const RESULTADOS_DEFINITIVOS = [
  "presente",
  "tardanza",
  "participacion_parcial",
  "ausencia_justificada",
  "ausencia_no_justificada",
  "no_aplica",
  "anulado",
] as const;

export function esAdministradorAsistencia(session: SessionUser): boolean {
  return session.rolPrincipal === "administrativo" || session.rolPrincipal === "hseq";
}

export function crearConsecutivoEvento(fecha = new Date()): string {
  const year = fecha.getUTCFullYear();
  const stamp = fecha
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(4, 16);
  return `EV-${year}-${stamp}`;
}

export function documentosSugeridos(tipo: string, caracter: string) {
  const documentos = [
    {
      codigo: "TH-FOR-03",
      nombre: "Registro de asistencia",
      version: "03",
      tipo: "formato",
      obligatorio: true,
    },
  ];

  const formativos = new Set([
    "charla_formativa",
    "capacitacion",
    "induccion",
    "reinduccion",
    "entrenamiento_practico",
  ]);
  if (caracter === "formativo" || formativos.has(tipo)) {
    documentos.push({
      codigo: "TH-FOR-04",
      nombre: "Registro de capacitación",
      version: "02",
      tipo: "formato",
      obligatorio: true,
    });
  }
  return documentos;
}

export function textoRequerido(value: unknown, field: string, max = 300): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} es obligatorio.`);
  }
  return value.trim().slice(0, max);
}

export function textoOpcional(value: unknown, max = 1000): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, max);
}

export function fechaValida(value: unknown, field: string): Date {
  const fecha = new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(fecha.getTime())) throw new Error(`${field} no es válida.`);
  return fecha;
}
