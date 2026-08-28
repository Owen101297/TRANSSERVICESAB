// Modelo de dominio: HSEQ
//
// El HALLAZGO es la entidad central: se origina en un preoperacional, una
// inspección, un incidente o un accidente, y sigue el flujo del blueprint:
// hallazgo → evidencia → notificación → tarea → responsable → cierre.

export type OrigenHallazgo = "preoperacional" | "inspeccion" | "incidente" | "accidente";

export type SeveridadHallazgo = "baja" | "media" | "alta" | "critica";

export type EstadoHallazgo = "abierto" | "en_proceso" | "cerrado";

export interface Hallazgo {
  id: string;
  origen: OrigenHallazgo;
  titulo: string;
  descripcion: string;
  severidad: SeveridadHallazgo;
  estado: EstadoHallazgo;
  vehiculoId?: string;
  placa?: string;
  conductorId?: string;
  conductorNombre?: string;
  responsable: string;
  fechaReporte: string; // ISO
  fechaCierre?: string; // ISO
  accionCorrectiva?: string;
}

export const ORIGEN_LABELS: Record<OrigenHallazgo, string> = {
  preoperacional: "Preoperacional",
  inspeccion: "Inspección",
  incidente: "Incidente",
  accidente: "Accidente",
};

export const SEVERIDAD_LABELS: Record<SeveridadHallazgo, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const ESTADO_HALLAZGO_LABELS: Record<EstadoHallazgo, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  cerrado: "Cerrado",
};
