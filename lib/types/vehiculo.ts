// Modelo de dominio: VEHÍCULO
//
// Regla del blueprint: distinguir propiedad, vinculación contractual y
// asignación operativa. No asumir que quien opera el vehículo es su dueño.
// El conductor NUNCA vive aquí como campo fijo — siempre se consulta la
// ASIGNACIÓN ACTIVA en el módulo Asignaciones.

export type TipoVehiculo =
  | "bus"
  | "buseta"
  | "microbus"
  | "camioneta"
  | "automovil"
  | "van";

export type ServicioVehiculo = "especial" | "escolar" | "turismo";

export type EstadoVehiculo = "activo" | "mantenimiento" | "inactivo";

export type EstadoDocumento = "vigente" | "proximo" | "vencido";

export interface Vehiculo {
  id: string;
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  anio: number;
  capacidad: number;
  contratistaId: string;
  contratistaNombre: string;
  servicio: ServicioVehiculo;
  estado: EstadoVehiculo;
  documentos: {
    soatVencimiento: string; // ISO
    rtmVencimiento: string; // ISO
    polizaVencimiento: string; // ISO
  };
}

export const TIPO_LABELS: Record<TipoVehiculo, string> = {
  bus: "Bus",
  buseta: "Buseta",
  microbus: "Microbús",
  camioneta: "Camioneta",
  automovil: "Automóvil",
  van: "Van",
};

export const SERVICIO_LABELS: Record<ServicioVehiculo, string> = {
  especial: "Transporte especial",
  escolar: "Escolar",
  turismo: "Turismo",
};

export const ESTADO_VEHICULO_LABELS: Record<EstadoVehiculo, string> = {
  activo: "Activo",
  mantenimiento: "En mantenimiento",
  inactivo: "Inactivo",
};

/** Calcula el estado de un documento según su fecha de vencimiento. */
export function getEstadoDocumento(vencimientoISO: string): EstadoDocumento {
  const hoy = new Date();
  const vencimiento = new Date(vencimientoISO);
  const diasRestantes = Math.floor(
    (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 30) return "proximo";
  return "vigente";
}
