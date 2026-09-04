// Modelo de dominio: DOCUMENTOS (transversal y bóveda digital)
//
// Sistema documental que cruza todos los módulos: personas, vehículos,
// contratistas y documentos empresariales generales con soporte de archivos digitales.

export type CategoriaDocumento = "persona" | "vehiculo" | "contratista" | "empresa" | "hseq_pesv";

export type TipoDocumento =
  | "licencia_conduccion"
  | "soat"
  | "rtm"
  | "poliza"
  | "tarjeta_operacion"
  | "contrato"
  | "certificado_medico"
  | "certificado_capacitacion"
  | "rut"
  | "camara_comercio"
  | "otro";

export interface Documento {
  id: string;
  nombre: string;
  categoria: CategoriaDocumento;
  tipo: TipoDocumento;
  entidadId?: string; // id de la persona/vehiculo/contratista relacionado
  entidadNombre: string;
  entidadHref?: string; // link directo a la ficha 360 de la entidad
  fechaExpedicion?: string;
  fechaVencimiento?: string; // ISO — no todos los documentos vencen
  archivoNombre?: string;
  archivoUrl?: string;
  tamanoBytes?: number;
  mimeType?: string;
  notas?: string;
}

export const CATEGORIA_LABELS: Record<CategoriaDocumento, string> = {
  persona: "Persona",
  vehiculo: "Vehículo",
  contratista: "Contratista",
  empresa: "Corporativo",
  hseq_pesv: "HSEQ / PESV",
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  licencia_conduccion: "Licencia de conducción",
  soat: "SOAT",
  rtm: "RTM",
  poliza: "Póliza Contractual / Extra",
  tarjeta_operacion: "Tarjeta de Operación",
  contrato: "Contrato de Vinculación",
  certificado_medico: "Examen Médico (EMO)",
  certificado_capacitacion: "Certificado de Capacitación",
  rut: "RUT",
  camara_comercio: "Cámara de Comercio",
  otro: "Otro Documento",
};
