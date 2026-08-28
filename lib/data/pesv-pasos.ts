import { PasoPESV } from "@/lib/types/pesv";

// Matriz GENERAL de los 24 pasos (Resolución 40595 de 2022) — todos inician
// en "pendiente". Los pasos 1-8, 20-24 tienen redacción y numeración
// confirmada en la resolución. Los pasos 9-19 (Fase 2 - Implementación)
// se presentan agrupados por los programas de gestión que la norma exige
// (conductores, vehículos, infraestructura, atención a víctimas,
// capacitación) — verifica su numeración exacta contra el anexo técnico
// antes de un reporte formal en VIGIA2.

export const PASOS_PESV: PasoPESV[] = [
  // --- Fase 1: Planificación ---
  { id: "p1", numero: 1, fase: "planificacion", nombre: "Líder del diseño e implementación del PESV", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p2", numero: 2, fase: "planificacion", nombre: "Comité de Seguridad Vial (CSV)", aplicaNiveles: ["estandar", "avanzado"], estado: "pendiente" },
  { id: "p3", numero: 3, fase: "planificacion", nombre: "Política de seguridad vial de la organización", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p4", numero: 4, fase: "planificacion", nombre: "Diagnóstico — antecedentes de accidentalidad vial y datos de la empresa", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p5", numero: 5, fase: "planificacion", nombre: "Requisitos legales en seguridad vial", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p6", numero: 6, fase: "planificacion", nombre: "Caracterización, evaluación y control de riesgos viales", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p7", numero: 7, fase: "planificacion", nombre: "Objetivos y metas del PESV", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p8", numero: 8, fase: "planificacion", nombre: "Programas de gestión de riesgos críticos", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },

  // --- Fase 2: Implementación y ejecución ---
  { id: "p9", numero: 9, fase: "implementacion", nombre: "Selección, evaluación y capacitación de conductores", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p10", numero: 10, fase: "implementacion", nombre: "Control documental de conductores y vehículos", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p11", numero: 11, fase: "implementacion", nombre: "Mantenimiento preventivo y correctivo de vehículos", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente", observaciones: "Se apoya en los vencimientos de SOAT/RTM ya registrados en el módulo Flota." },
  { id: "p12", numero: 12, fase: "implementacion", nombre: "Inspección preoperacional de vehículos", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p13", numero: 13, fase: "implementacion", nombre: "Gestión de horas de conducción y descanso", aplicaNiveles: ["estandar", "avanzado"], estado: "pendiente", observaciones: "Se apoya en el módulo Asignaciones para el contratista con rotación de turnos." },
  { id: "p14", numero: 14, fase: "implementacion", nombre: "Comportamiento humano en la vía (fatiga, alcohol, drogas, distracción)", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p15", numero: 15, fase: "implementacion", nombre: "Gestión de infraestructura y entorno — rutas y puntos críticos", aplicaNiveles: ["estandar", "avanzado"], estado: "pendiente" },
  { id: "p16", numero: 16, fase: "implementacion", nombre: "Atención a víctimas y siniestros viales", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p17", numero: 17, fase: "implementacion", nombre: "Plan de emergencia vial", aplicaNiveles: ["estandar", "avanzado"], estado: "pendiente" },
  { id: "p18", numero: 18, fase: "implementacion", nombre: "Programa de capacitación en seguridad vial", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p19", numero: 19, fase: "implementacion", nombre: "Plan anual de trabajo del PESV", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },

  // --- Fase 3: Seguimiento por la organización ---
  { id: "p20", numero: 20, fase: "seguimiento", nombre: "Indicadores y reporte de autogestión PESV", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente", observaciones: "Corresponde al Formulario 2 de VIGIA2 — ver pestaña Indicadores." },
  { id: "p21", numero: 21, fase: "seguimiento", nombre: "Registro y análisis estadístico de siniestros viales", aplicaNiveles: ["avanzado"], estado: "pendiente" },
  { id: "p22", numero: 22, fase: "seguimiento", nombre: "Auditoría anual del PESV", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },

  // --- Fase 4: Mejora continua ---
  { id: "p23", numero: 23, fase: "mejora", nombre: "Mejora continua — acciones preventivas y correctivas", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
  { id: "p24", numero: 24, fase: "mejora", nombre: "Mecanismos de comunicación y participación", aplicaNiveles: ["basico", "estandar", "avanzado"], estado: "pendiente" },
];

export function getPasosPorFase(fase: string): PasoPESV[] {
  return PASOS_PESV.filter((p) => p.fase === fase);
}
