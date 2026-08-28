// Modelo de dominio: DOCUMENTOS (transversal)
//
// Sistema documental que cruza todos los módulos: personas, vehículos,
// contratistas y documentos empresariales generales. No duplica datos —
// referencia la entidad dueña del documento.

export type CategoriaDocumento = "persona" | "vehiculo" | "contratista" | "empresa";

export type TipoDocumento =
  | "licencia_conduccion"
  | "soat"
  | "rtm"
  | "poliza"
  | "contrato"
  | "certificado_medico"
  | "certificado_capacitacion"
  | "otro";

export interface Documento {
  id: string;
  nombre: string;
  categoria: CategoriaDocumento;
  tipo: TipoDocumento;
  entidadId: string; // id de la persona/vehiculo/contratista relacionado
  entidadNombre: string;
  entidadHref: string; // link directo a la ficha 360 de la entidad
  fechaVencimiento?: string; // ISO — no todos los documentos vencen
  archivoNombre?: string;
}

export const CATEGORIA_LABELS: Record<CategoriaDocumento, string> = {
  persona: "Persona",
  vehiculo: "Vehículo",
  contratista: "Contratista",
  empresa: "Empresa",
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  licencia_conduccion: "Licencia de conducción",
  soat: "SOAT",
  rtm: "RTM",
  poliza: "Póliza",
  contrato: "Contrato",
  certificado_medico: "Certificado médico",
  certificado_capacitacion: "Certificado de capacitación",
  otro: "Otro",
};
