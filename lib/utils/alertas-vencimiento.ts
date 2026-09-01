import { Persona } from "@/lib/types/persona";

export type NivelAlertaVencimiento = "critico" | "urgente" | "preventivo" | "optimo" | "sin_registro";

export interface DiagnosticoVencimiento {
  tipo: "licencia" | "examen_medico";
  titulo: string;
  fechaVencimiento?: string;
  diasRestantes: number | null;
  nivel: NivelAlertaVencimiento;
  mensaje: string;
  badgeLabel: string;
}

export interface PersonaConAlertas {
  persona: Persona;
  alertas: DiagnosticoVencimiento[];
  nivelMaximo: NivelAlertaVencimiento;
  tieneAlertas: boolean;
}

/**
 * Calcula los días calendario restantes entre hoy y una fecha dada (ISO YYYY-MM-DD)
 */
export function calcularDiasRestantes(fechaISO?: string): number | null {
  if (!fechaISO) return null;
  const fechaObj = new Date(fechaISO);
  if (isNaN(fechaObj.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const target = new Date(fechaObj);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Diagnostica el estado de vigencia de una fecha específica
 */
export function diagnosticarFecha(
  fechaISO: string | undefined,
  tipo: "licencia" | "examen_medico",
  titulo: string
): DiagnosticoVencimiento {
  if (!fechaISO) {
    return {
      tipo,
      titulo,
      fechaVencimiento: undefined,
      diasRestantes: null,
      nivel: "sin_registro",
      mensaje: `Sin registro de fecha para ${titulo.toLowerCase()}.`,
      badgeLabel: "Sin registrar",
    };
  }

  const dias = calcularDiasRestantes(fechaISO);

  if (dias === null) {
    return {
      tipo,
      titulo,
      fechaVencimiento: fechaISO,
      diasRestantes: null,
      nivel: "sin_registro",
      mensaje: "Fecha inválida.",
      badgeLabel: "Fecha inválida",
    };
  }

  if (dias < 0) {
    const diasVencido = Math.abs(dias);
    return {
      tipo,
      titulo,
      fechaVencimiento: fechaISO,
      diasRestantes: dias,
      nivel: "critico",
      mensaje: `${titulo} VENCIDA hace ${diasVencido} ${diasVencido === 1 ? "día" : "días"}.`,
      badgeLabel: `Vencido (${diasVencido}d)`,
    };
  }

  if (dias === 0) {
    return {
      tipo,
      titulo,
      fechaVencimiento: fechaISO,
      diasRestantes: 0,
      nivel: "critico",
      mensaje: `${titulo} VENCE HOY. Requiere renovación inmediata.`,
      badgeLabel: "Vence hoy",
    };
  }

  if (dias <= 15) {
    return {
      tipo,
      titulo,
      fechaVencimiento: fechaISO,
      diasRestantes: dias,
      nivel: "urgente",
      mensaje: `${titulo} vence en ${dias} ${dias === 1 ? "día" : "días"} (Alerta urgente).`,
      badgeLabel: `Vence en ${dias}d`,
    };
  }

  if (dias <= 30) {
    return {
      tipo,
      titulo,
      fechaVencimiento: fechaISO,
      diasRestantes: dias,
      nivel: "preventivo",
      mensaje: `${titulo} vence en ${dias} días (Alerta preventiva).`,
      badgeLabel: `Vence en ${dias}d`,
    };
  }

  return {
    tipo,
    titulo,
    fechaVencimiento: fechaISO,
    diasRestantes: dias,
    nivel: "optimo",
    mensaje: `${titulo} vigente (${Math.round(dias / 30)} meses restantes).`,
    badgeLabel: "Al día",
  };
}

/**
 * Evalúa todas las alertas documentales de una persona
 */
export function evaluarAlertasPersona(persona: Persona): PersonaConAlertas {
  const alertas: DiagnosticoVencimiento[] = [];

  // 1. Licencia de conducción (aplica a conductores)
  if (persona.perfiles.includes("conductor")) {
    const diagLic = diagnosticarFecha(
      persona.licenciaConduccion?.fechaVencimiento,
      "licencia",
      "Licencia de Conducción"
    );
    if (diagLic.nivel !== "optimo") {
      alertas.push(diagLic);
    }
  }

  // 2. Examen Médico Ocupacional (EMO)
  const diagEMO = diagnosticarFecha(
    persona.examenMedico?.fechaVigencia,
    "examen_medico",
    "Examen Médico Ocupacional"
  );
  if (diagEMO.nivel !== "optimo") {
    alertas.push(diagEMO);
  }

  // Determinar nivel máximo de criticidad
  let nivelMaximo: NivelAlertaVencimiento = "optimo";
  if (alertas.some((a) => a.nivel === "critico")) {
    nivelMaximo = "critico";
  } else if (alertas.some((a) => a.nivel === "urgente")) {
    nivelMaximo = "urgente";
  } else if (alertas.some((a) => a.nivel === "preventivo")) {
    nivelMaximo = "preventivo";
  } else if (alertas.some((a) => a.nivel === "sin_registro")) {
    nivelMaximo = "sin_registro";
  }

  return {
    persona,
    alertas,
    nivelMaximo,
    tieneAlertas: alertas.length > 0,
  };
}

/**
 * Agrupa y cuenta las alertas globales de una lista de personas
 */
export function obtenerResumenAlertasPersonas(personas: Persona[]) {
  let criticos = 0; // Vencidos
  let urgentes = 0; // <= 15 días
  let preventivos = 0; // <= 30 días
  let sinRegistro = 0;

  const evaluadas = personas
    .filter((p) => p.estado === "activo")
    .map(evaluarAlertasPersona);

  evaluadas.forEach((item) => {
    if (item.nivelMaximo === "critico") criticos++;
    else if (item.nivelMaximo === "urgente") urgentes++;
    else if (item.nivelMaximo === "preventivo") preventivos++;
    else if (item.nivelMaximo === "sin_registro") sinRegistro++;
  });

  return {
    totalConAlertas: criticos + urgentes + preventivos + sinRegistro,
    criticos,
    urgentes,
    preventivos,
    sinRegistro,
    evaluadas,
  };
}
