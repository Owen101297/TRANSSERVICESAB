// Modelo de dominio: TELEMETRÍA GPS & MONITOREO PESV (Satelcopro / n8n)

export type TipoEventoGPS =
  | "exceso_velocidad"
  | "frenada_brusca"
  | "acelerada_brusca"
  | "giro_brusco"
  | "ralenti"
  | "panico"
  | "desconexion"
  | "apagado"
  | "encendido"
  | "salida_geocerca"
  | "otro";

export type PrioridadEventoGPS = "alta" | "media" | "baja";

export type EstadoRetroalimentacion =
  | "pendiente"
  | "enviada_whatsapp"
  | "enviada_correo"
  | "resuelta";

export interface EventoGPS {
  id: string;
  placa: string;
  fechaHora: string; // ISO
  tipoEvento: TipoEventoGPS;
  prioridad: PrioridadEventoGPS;
  descripcion: string;
  velocidad?: number; // km/h
  limiteVelocidad?: number; // km/h
  odometro?: number; // km
  latitud?: number;
  longitud?: number;
  ubicacion?: string;
  // Conductor asignado al momento del evento
  conductorId?: string;
  conductorNombre?: string;
  conductorTelefono?: string;
  conductorEmail?: string;
  // Estado de gestión
  estadoRetroalimentacion: EstadoRetroalimentacion;
  fechaRetroalimentacion?: string;
  observacionesGestion?: string;
  createdAt: string;
}

export type NivelDriverScore = "excelente" | "bueno" | "regular" | "critico";

export interface CalificacionConductorMensual {
  id: string;
  conductorId: string;
  conductorNombre: string;
  conductorFoto: string;
  conductorTelefono: string;
  placaPrincipal: string;
  mes: string; // YYYY-MM
  puntajeTotal: number; // 0 - 100
  nivel: NivelDriverScore;
  posicionRanking?: number;
  totalEventos: number;
  conteoExcesoVelocidad: number;
  conteoFrenadaBrusca: number;
  conteoAceleradaBrusca: number;
  promedioVelocidad: number; // km/h
  distanciaTotalKm: number;
  horasConduccion: number;
}

export const TIPO_EVENTO_LABELS: Record<TipoEventoGPS, { label: string; icon: string; defaultPrioridad: PrioridadEventoGPS }> = {
  exceso_velocidad: { label: "Exceso de Velocidad", icon: "Gauge", defaultPrioridad: "alta" },
  frenada_brusca: { label: "Frenada Brusca", icon: "OctagonAlert", defaultPrioridad: "media" },
  acelerada_brusca: { label: "Acelerada Brusca", icon: "Zap", defaultPrioridad: "media" },
  giro_brusco: { label: "Giro Brusco", icon: "CornerUpRight", defaultPrioridad: "media" },
  ralenti: { label: "Ralentí Prolongado", icon: "Timer", defaultPrioridad: "baja" },
  panico: { label: "Botón de Pánico / SOS", icon: "AlertOctagon", defaultPrioridad: "alta" },
  desconexion: { label: "Desconexión de Batería/GPS", icon: "Unplug", defaultPrioridad: "alta" },
  apagado: { label: "Motor Apagado", icon: "PowerOff", defaultPrioridad: "baja" },
  encendido: { label: "Motor Encendido", icon: "Power", defaultPrioridad: "baja" },
  salida_geocerca: { label: "Salida de Geocerca", icon: "MapPinOff", defaultPrioridad: "media" },
  otro: { label: "Novedad Operativa", icon: "Info", defaultPrioridad: "baja" },
};

export const PRIORIDAD_EVENTO_LABELS: Record<PrioridadEventoGPS, { label: string; badgeClass: string }> = {
  alta: { label: "Alta / Crítica", badgeClass: "bg-alert-red-dim text-alert-red border-alert-red/40" },
  media: { label: "Media", badgeClass: "bg-signal-amber-dim text-signal-amber border-signal-amber/40" },
  baja: { label: "Informativa", badgeClass: "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/40" },
};
