// Modelo de dominio: CONTRATISTA
//
// Un contratista puede tener vehículos, conductores, contratos, servicios,
// documentos, cumplimiento e historial. Los vehículos y conductores NO se
// duplican aquí — se calculan a partir de FLOTA y PERSONAS filtrando por
// contratistaId, para no romper la regla de "registrar una sola vez".

export type TipoOperacion = "fija" | "rotativa";

export type EstadoContratista = "activo" | "inactivo";

export interface Contratista {
  id: string;
  nombre: string;
  nit: string;
  tipoOperacion: TipoOperacion;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
  fechaVinculacion: string; // ISO
  fechaFinContrato?: string; // ISO — opcional si el contrato no tiene fecha fija
  estado: EstadoContratista;
  notas?: string;
}

export const TIPO_OPERACION_LABELS: Record<TipoOperacion, string> = {
  fija: "Asignación fija",
  rotativa: "Rotación por turnos",
};

export const ESTADO_CONTRATISTA_LABELS: Record<EstadoContratista, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};
