// Modelo de dominio: FUEC (Formato Único de Extracto de Contrato)
// Cumplimiento legal Decreto 1079 de 2015 del Ministerio de Transporte de Colombia

export type ObjetoContratoTransporte = "empresarial" | "escolar" | "turismo" | "grupo_usuarios";

export type EstadoFuec = "emitido" | "vencido" | "anulado";

export interface ContratoTransporte {
  id: string;
  numeroContrato: string;
  contratanteNombre: string;
  contratanteNit: string;
  objetoContrato: ObjetoContratoTransporte;
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  estado: "activo" | "finalizado" | "cancelado";
}

export interface Fuec {
  id: string;
  numeroConsecutivo: number;
  codigoFUEC: string;
  contratoId: string;
  contratoNumero: string;
  contratante: string;
  objetoContrato: ObjetoContratoTransporte;
  origen: string;
  destino: string;
  rutaDetalle?: string;
  vehiculoId: string;
  placa: string;
  marca: string;
  modelo: string;
  tarjetaOperacionNumero?: string;
  conductorPrincipalId: string;
  conductorPrincipalNombre: string;
  conductorSecundarioId?: string;
  conductorSecundarioNombre?: string;
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  estado: EstadoFuec;
  qrCodeUrl?: string;
  observaciones?: string;
}

export const OBJETO_CONTRATO_LABELS: Record<ObjetoContratoTransporte, string> = {
  empresarial: "Transporte Empresarial / Asalariados",
  escolar: "Transporte Escolar / Estudiantes",
  turismo: "Transporte Turístico",
  grupo_usuarios: "Grupo Específico de Usuarios",
};

export const ESTADO_FUEC_LABELS: Record<EstadoFuec, string> = {
  emitido: "Emitido / Vigente",
  vencido: "Vencido",
  anulado: "Anulado",
};
