import { ItemSGSST } from "@/lib/types/sgsst";

// Matriz GENERAL de estándares mínimos — todos los ítems inician en
// "pendiente" porque este módulo no tiene la matriz real de la empresa
// todavía. Cuando subas tus archivos locales (política, matriz legal,
// matriz IPER, planes, actas, etc.), actualiza el estado y adjunta el
// documento en cada ítem correspondiente.

export const ITEMS_SGSST: ItemSGSST[] = [
  // --- Estándar 1: Recursos ---
  { id: "i1", numeral: "1.1.1", estandarId: "e1", nombre: "Responsable del SG-SST", estado: "pendiente" },
  { id: "i2", numeral: "1.1.2", estandarId: "e1", nombre: "Responsabilidades en el SG-SST", estado: "pendiente" },
  { id: "i3", numeral: "1.1.3", estandarId: "e1", nombre: "Asignación de recursos para el SG-SST", estado: "pendiente" },
  { id: "i4", numeral: "1.1.4", estandarId: "e1", nombre: "Afiliación al Sistema General de Riesgos Laborales", estado: "pendiente" },
  { id: "i5", numeral: "1.1.5", estandarId: "e1", nombre: "Identificación de trabajadores de alto riesgo y cotización de pensión especial", estado: "pendiente" },
  { id: "i6", numeral: "1.1.6", estandarId: "e1", nombre: "Conformación del COPASST", estado: "pendiente" },
  { id: "i7", numeral: "1.1.7", estandarId: "e1", nombre: "Capacitación del COPASST", estado: "pendiente" },
  { id: "i8", numeral: "1.1.8", estandarId: "e1", nombre: "Conformación del Comité de Convivencia Laboral", estado: "pendiente" },
  { id: "i9", numeral: "1.2.1", estandarId: "e1", nombre: "Programa de capacitación en promoción y prevención (PYP)", estado: "pendiente" },
  { id: "i10", numeral: "1.2.2", estandarId: "e1", nombre: "Inducción y reinducción en SST", estado: "pendiente" },
  { id: "i11", numeral: "1.2.3", estandarId: "e1", nombre: "Responsable del SG-SST con curso de 50 horas", estado: "pendiente" },

  // --- Estándar 2: Gestión integral del SG-SST ---
  { id: "i12", numeral: "2.1.1", estandarId: "e2", nombre: "Política de SST firmada, fechada y comunicada", estado: "pendiente" },
  { id: "i13", numeral: "2.2.1", estandarId: "e2", nombre: "Objetivos del SG-SST definidos y medibles", estado: "pendiente" },
  { id: "i14", numeral: "2.3.1", estandarId: "e2", nombre: "Evaluación inicial del SG-SST", estado: "pendiente" },
  { id: "i15", numeral: "2.4.1", estandarId: "e2", nombre: "Plan de trabajo anual del SG-SST", estado: "pendiente" },
  { id: "i16", numeral: "2.5.1", estandarId: "e2", nombre: "Archivo y retención documental del SG-SST", estado: "pendiente" },
  { id: "i17", numeral: "2.6.1", estandarId: "e2", nombre: "Rendición de cuentas anual", estado: "pendiente" },
  { id: "i18", numeral: "2.7.1", estandarId: "e2", nombre: "Matriz legal actualizada", estado: "pendiente" },
  { id: "i19", numeral: "2.8.1", estandarId: "e2", nombre: "Mecanismos de comunicación del SG-SST", estado: "pendiente" },
  { id: "i20", numeral: "2.9.1", estandarId: "e2", nombre: "Identificación y evaluación de proveedores y contratistas", estado: "pendiente" },
  { id: "i21", numeral: "2.10.1", estandarId: "e2", nombre: "Evaluación del impacto de cambios internos y externos", estado: "pendiente" },
  { id: "i22", numeral: "2.11.1", estandarId: "e2", nombre: "Gestión del cambio", estado: "pendiente" },

  // --- Estándar 3: Gestión de la salud ---
  { id: "i23", numeral: "3.1.1", estandarId: "e3", nombre: "Descripción sociodemográfica y diagnóstico de condiciones de salud", estado: "pendiente" },
  { id: "i24", numeral: "3.1.2", estandarId: "e3", nombre: "Actividades de medicina del trabajo y prevención", estado: "pendiente" },
  { id: "i25", numeral: "3.1.3", estandarId: "e3", nombre: "Evaluaciones médicas ocupacionales", estado: "pendiente" },
  { id: "i26", numeral: "3.1.4", estandarId: "e3", nombre: "Restricciones y recomendaciones médico laborales", estado: "pendiente" },
  { id: "i27", numeral: "3.1.5", estandarId: "e3", nombre: "Estilos de vida y entornos saludables (alcohol, tabaco, drogas)", estado: "pendiente" },
  { id: "i28", numeral: "3.1.6", estandarId: "e3", nombre: "Agua potable, servicios sanitarios y disposición de basuras", estado: "pendiente" },
  { id: "i29", numeral: "3.2.1", estandarId: "e3", nombre: "Reporte de accidentes de trabajo y enfermedad laboral a ARL/EPS", estado: "pendiente" },
  { id: "i30", numeral: "3.2.2", estandarId: "e3", nombre: "Investigación de incidentes, accidentes y enfermedades laborales", estado: "pendiente" },
  { id: "i31", numeral: "3.2.3", estandarId: "e3", nombre: "Registro y análisis estadístico de accidentalidad", estado: "pendiente" },
  { id: "i32", numeral: "3.3.1", estandarId: "e3", nombre: "Medición de frecuencia de accidentalidad", estado: "pendiente" },
  { id: "i33", numeral: "3.3.2", estandarId: "e3", nombre: "Medición de severidad de accidentalidad", estado: "pendiente" },
  { id: "i34", numeral: "3.3.3", estandarId: "e3", nombre: "Medición de mortalidad por accidente de trabajo", estado: "pendiente" },
  { id: "i35", numeral: "3.3.4", estandarId: "e3", nombre: "Prevalencia e incidencia de la enfermedad laboral", estado: "pendiente" },
  { id: "i36", numeral: "3.3.5", estandarId: "e3", nombre: "Medición del ausentismo por causa médica", estado: "pendiente" },

  // --- Estándar 4: Gestión de peligros y riesgos ---
  { id: "i37", numeral: "4.1.1", estandarId: "e4", nombre: "Metodología para identificación de peligros y valoración de riesgos (matriz IPER / GTC-45)", estado: "pendiente" },
  { id: "i38", numeral: "4.1.2", estandarId: "e4", nombre: "Identificación de peligros con participación de todos los niveles", estado: "pendiente" },
  { id: "i39", numeral: "4.1.3", estandarId: "e4", nombre: "Identificación y priorización de la naturaleza de los peligros", estado: "pendiente" },
  { id: "i40", numeral: "4.1.4", estandarId: "e4", nombre: "Mediciones ambientales (ruido, iluminación, temperatura, etc.)", estado: "pendiente" },
  { id: "i41", numeral: "4.2.1", estandarId: "e4", nombre: "Implementación de medidas de prevención y control", estado: "pendiente" },
  { id: "i42", numeral: "4.2.2", estandarId: "e4", nombre: "Verificación de la aplicación de las medidas de prevención y control", estado: "pendiente" },
  { id: "i43", numeral: "4.2.3", estandarId: "e4", nombre: "Procedimientos e instructivos internos de SST", estado: "pendiente" },
  { id: "i44", numeral: "4.2.4", estandarId: "e4", nombre: "Inspecciones con participación del COPASST", estado: "pendiente" },
  { id: "i45", numeral: "4.2.5", estandarId: "e4", nombre: "Mantenimiento periódico de instalaciones, equipos y vehículos", estado: "pendiente" },
  { id: "i46", numeral: "4.2.6", estandarId: "e4", nombre: "Entrega de EPP y capacitación en su uso", estado: "pendiente" },

  // --- Estándar 5: Gestión de amenazas ---
  { id: "i47", numeral: "5.1.1", estandarId: "e5", nombre: "Plan de prevención, preparación y respuesta ante emergencias", estado: "pendiente" },
  { id: "i48", numeral: "5.1.2", estandarId: "e5", nombre: "Brigada de prevención, preparación y respuesta ante emergencias", estado: "pendiente" },
  { id: "i49", numeral: "5.1.3", estandarId: "e5", nombre: "Simulacros de emergencia", estado: "pendiente" },
  { id: "i50", numeral: "5.1.4", estandarId: "e5", nombre: "Equipos y recursos para atención de emergencias", estado: "pendiente" },

  // --- Estándar 6: Verificación del SG-SST ---
  { id: "i51", numeral: "6.1.1", estandarId: "e6", nombre: "Definición de indicadores del SG-SST (estructura, proceso, resultado)", estado: "pendiente" },
  { id: "i52", numeral: "6.1.2", estandarId: "e6", nombre: "Auditoría anual del SG-SST", estado: "pendiente" },
  { id: "i53", numeral: "6.1.3", estandarId: "e6", nombre: "Revisión anual por la alta dirección", estado: "pendiente" },
  { id: "i54", numeral: "6.1.4", estandarId: "e6", nombre: "Planificación de auditorías con el COPASST", estado: "pendiente" },

  // --- Estándar 7: Mejoramiento ---
  { id: "i55", numeral: "7.1.1", estandarId: "e7", nombre: "Acciones preventivas y correctivas", estado: "pendiente" },
  { id: "i56", numeral: "7.1.2", estandarId: "e7", nombre: "Acciones de mejora derivadas de la revisión por la alta dirección", estado: "pendiente" },
  { id: "i57", numeral: "7.1.3", estandarId: "e7", nombre: "Acciones de mejora con base en investigaciones de accidentes y enfermedades", estado: "pendiente" },
  { id: "i58", numeral: "7.1.4", estandarId: "e7", nombre: "Elaboración del plan de mejoramiento anual", estado: "pendiente" },
];

export function getItemsPorEstandar(estandarId: string): ItemSGSST[] {
  return ITEMS_SGSST.filter((i) => i.estandarId === estandarId);
}

export function getItemById(id: string): ItemSGSST | undefined {
  return ITEMS_SGSST.find((i) => i.id === id);
}
