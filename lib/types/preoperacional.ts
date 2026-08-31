// Modelo de dominio: INSPECCIÓN PREOPERACIONAL DIARIA
// Cumplimiento PESV Paso 14 (Resolución 40595 de 2022) y SG-SST

export type EstadoConceptoPreoperacional = "apto" | "no_apto" | "apto_con_observacion";

export interface InspeccionPreoperacional {
  id: string;
  conductorId: string;
  conductorNombre: string;
  vehiculoId: string;
  placa: string;
  fecha: string; // ISO datetime
  kilometraje?: number;
  checklist: Record<string, boolean>;
  hallazgoDetectado: boolean;
  descripcionHallazgo?: string;
  fotoEvidenciaUrl?: string;
  estadoConcepto: EstadoConceptoPreoperacional;
}

export type TipoNovedadConductor = "mecanica" | "vial" | "seguridad" | "otro";

export interface NovedadConductor {
  id: string;
  conductorId: string;
  conductorNombre: string;
  vehiculoId?: string;
  placa?: string;
  tipo: TipoNovedadConductor;
  descripcion: string;
  fotoUrl?: string;
  fecha: string; // ISO datetime
  atendida: boolean;
}

export const ITEMS_CHECKLIST_PREOPERACIONAL = [
  "Llantas y presión de aire",
  "Frenos y freno de emergencia",
  "Luces delanteras, direccionales y freno",
  "Espejos retrovisores y panorámico",
  "Cinturones de seguridad operativos",
  "Extintor con carga vigente",
  "Botiquín de primeros auxilios completo",
  "Niveles de aceite, refrigerante y frenos",
  "Documentos del vehículo (SOAT, RTM, TO)",
  "Kit de carretera y herramientas",
];
