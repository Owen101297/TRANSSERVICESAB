// Modelo de dominio: PERSONA
//
// Regla del blueprint: una persona no es necesariamente un usuario, y no se
// duplica el registro cuando cumple varios roles. Una persona puede tener
// uno o más "perfiles" (Conductor, Empleado, Supervisor, HSEQ, Usuario).
//
// El vehículo que opera un conductor NUNCA vive aquí como campo fijo —
// siempre se consulta la ASIGNACIÓN ACTIVA en el módulo Asignaciones.

export type PerfilPersona =
  | "conductor"
  | "empleado"
  | "supervisor"
  | "hseq"
  | "administrativo";

export type EstadoPersona = "activo" | "inactivo" | "descanso" | "vacaciones" | "retirado";

export type TipoDocumento = "CC" | "CE" | "PA" | "TI";

export type CategoriaLicencia = "C1" | "C2" | "C3" | "B1" | "B2" | "B3" | "A2";

export interface LicenciaConduccion {
  numero: string;
  categorias: CategoriaLicencia[];
  fechaVencimiento: string; // ISO (YYYY-MM-DD)
  organismoTransito?: string;
}

export type ConceptoMedico =
  | "apto"
  | "apto_con_restricciones"
  | "no_apto"
  | "pendiente";

export const CONCEPTO_MEDICO_LABELS: Record<ConceptoMedico, string> = {
  apto: "Apto para el cargo",
  apto_con_restricciones: "Apto con restricciones",
  no_apto: "No apto temporalmente",
  pendiente: "Evaluación pendiente",
};

export interface ExamenMedicoOcupacional {
  tipo: "ingreso" | "periodico" | "egreso" | "post_incapacidad";
  fechaRealizacion: string; // ISO
  fechaVigencia: string; // ISO (generalmente 1 año)
  enfasis: string[]; // ej. ["Visiometría", "Audiometría", "Psicosensométrico", "Osteomuscular"]
  concepto: ConceptoMedico;
  restricciones?: string;
  centroMedico?: string;
}

export interface ContactoEmergencia {
  nombreCompleto: string;
  parentesco: string;
  telefono: string;
}

export type GrupoSanguineo = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface DatosSalud {
  grupoSanguineoRH: GrupoSanguineo;
  eps: string;
  arl: string;
  fondoPensiones?: string;
  alergias?: string;
}

export interface Persona {
  id: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  telefono: string;
  email: string;
  perfiles: PerfilPersona[];
  estado: EstadoPersona;
  fechaIngreso: string; // ISO
  contratistaId?: string;
  contratistaNombre?: string;
  fotoIniciales: string;
  fechaRetiro?: string;
  motivoRetiro?: string;
  // Fase A: Expediente Conductor & Salud
  licenciaConduccion?: LicenciaConduccion;
  examenMedico?: ExamenMedicoOcupacional;
  datosSalud?: DatosSalud;
  contactoEmergencia?: ContactoEmergencia;
}

export const PERFIL_LABELS: Record<PerfilPersona, string> = {
  conductor: "Conductor",
  empleado: "Empleado",
  supervisor: "Supervisor",
  hseq: "HSEQ",
  administrativo: "Administrativo",
};

export const ESTADO_LABELS: Record<EstadoPersona, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  descanso: "En descanso",
  vacaciones: "Vacaciones",
  retirado: "Retirado / Histórico",
};

/**
 * Evalúa el estado de vigencia de una fecha dada (licencia, examen médico, etc.)
 */
export function getEstadoVigenciaFecha(
  fechaISO?: string,
  diasMargenProximo: number = 30
): "vigente" | "proximo" | "vencido" | "sin_fecha" {
  if (!fechaISO) return "sin_fecha";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO);
  fecha.setHours(0, 0, 0, 0);

  const diffMs = fecha.getTime() - hoy.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return "vencido";
  if (diffDias <= diasMargenProximo) return "proximo";
  return "vigente";
}

export interface EvaluacionAptitud {
  esApto: boolean;
  nivel: "optimo" | "advertencia" | "critico";
  alertas: string[];
}

/**
 * Evalúa las condiciones de idoneidad y alertas de un conductor para asignación operativa.
 * No genera un bloqueo duro, sino un diagnóstico estructurado para toma de decisiones del despachador.
 */
export function evaluarAptitudConductor(persona: Persona): EvaluacionAptitud {
  const alertas: string[] = [];
  let tieneCritico = false;
  let tieneAdvertencia = false;

  // 1. Estado laboral
  if (persona.estado === "descanso") {
    alertas.push("El colaborador se encuentra registrado en periodo de DESCANSO.");
    tieneAdvertencia = true;
  } else if (persona.estado === "vacaciones") {
    alertas.push("El colaborador se encuentra actualmente en VACACIONES.");
    tieneAdvertencia = true;
  } else if (persona.estado === "inactivo") {
    alertas.push("El colaborador se encuentra marcado como INACTIVO en la empresa.");
    tieneCritico = true;
  }

  // 2. Licencia de conducción (si es conductor)
  if (persona.perfiles.includes("conductor")) {
    if (!persona.licenciaConduccion) {
      alertas.push("No tiene registro de Licencia de Conducción en su expediente.");
      tieneAdvertencia = true;
    } else {
      const estadoLic = getEstadoVigenciaFecha(persona.licenciaConduccion.fechaVencimiento);
      if (estadoLic === "vencido") {
        alertas.push(
          `Licencia de conducción (${persona.licenciaConduccion.categorias.join(", ")}) VENCIDA desde ${new Date(persona.licenciaConduccion.fechaVencimiento).toLocaleDateString("es-CO")}.`
        );
        tieneCritico = true;
      } else if (estadoLic === "proximo") {
        alertas.push(
          `Licencia de conducción (${persona.licenciaConduccion.categorias.join(", ")}) próxima a vencer el ${new Date(persona.licenciaConduccion.fechaVencimiento).toLocaleDateString("es-CO")}.`
        );
        tieneAdvertencia = true;
      }
    }

    // 3. Examen Médico Ocupacional
    if (!persona.examenMedico) {
      alertas.push("No cuenta con registro de Examen Médico Ocupacional (EMO).");
      tieneAdvertencia = true;
    } else {
      if (persona.examenMedico.concepto === "no_apto") {
        alertas.push(
          `Examen médico ocupacional reporta: NO APTO (${persona.examenMedico.restricciones || "Requiere valoración adicional"}).`
        );
        tieneCritico = true;
      } else if (persona.examenMedico.concepto === "apto_con_restricciones") {
        alertas.push(
          `Apto con restricciones: ${persona.examenMedico.restricciones || "Ver ficha médica"}.`
        );
        tieneAdvertencia = true;
      }

      const estadoEMO = getEstadoVigenciaFecha(persona.examenMedico.fechaVigencia);
      if (estadoEMO === "vencido") {
        alertas.push(
          `Examen médico periódico vencido desde ${new Date(persona.examenMedico.fechaVigencia).toLocaleDateString("es-CO")}.`
        );
        tieneCritico = true;
      } else if (estadoEMO === "proximo") {
        alertas.push(
          `Examen médico por vencer el ${new Date(persona.examenMedico.fechaVigencia).toLocaleDateString("es-CO")}.`
        );
        tieneAdvertencia = true;
      }
    }
  }

  const nivel: EvaluacionAptitud["nivel"] = tieneCritico
    ? "critico"
    : tieneAdvertencia
      ? "advertencia"
      : "optimo";

  return {
    esApto: !tieneCritico,
    nivel,
    alertas,
  };
}

