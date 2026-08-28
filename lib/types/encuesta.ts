export type TipoEncuesta = "satisfaccion" | "clima" | "seguridad_vial" | "sg-sst";
export type EstadoEncuesta = "activa" | "cerrada";

export interface Encuesta {
  id: string;
  titulo: string;
  tipo: TipoEncuesta;
  fechaCreacion: string; // ISO
  respuestasCount: number;
  destinatariosEsperados: number;
  estado: EstadoEncuesta;
}

export const TIPO_ENCUESTA_LABELS: Record<TipoEncuesta, string> = {
  satisfaccion: "Satisfacción",
  clima: "Clima laboral",
  seguridad_vial: "Seguridad vial",
  "sg-sst": "SG-SST",
};
