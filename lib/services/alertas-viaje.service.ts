export interface AlertaViajePayload {
  viajeId: string;
  placa: string;
  conductorNombre: string;
  origen: string;
  destino: string;
  divipolaOrigen?: string;
  divipolaDestino?: string;
  horaSalida?: string;
  riskScore: number;
  riskLevel: string;
  esNocturno?: boolean;
  preopAprobado?: boolean;
}

export interface AlertaResultado {
  requiereAlerta: boolean;
  tipo: "ALTO_RIESGO" | "NOCTURNO" | "PREOPERACIONAL_PENDIENTE" | "NORMAL";
  titulo: string;
  mensajeTexto: string;
  whatsappUrl?: string;
  prioridad: "alta" | "media" | "baja";
}

export function procesarAlertaViaje(payload: AlertaViajePayload): AlertaResultado {
  const {
    viajeId,
    placa,
    conductorNombre,
    origen,
    destino,
    divipolaOrigen = "86885",
    divipolaDestino = "86001",
    horaSalida = "08:00",
    riskScore,
    riskLevel,
    esNocturno,
    preopAprobado = true,
  } = payload;

  const esAltoRiesgo = riskScore >= 24 || riskLevel?.toLowerCase() === "alto";
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://erptransservices-production.up.railway.app";
  const urlVerificacion = `${baseUrl}/verificar/viaje/${viajeId}`;

  if (esAltoRiesgo || esNocturno || !preopAprobado) {
    let tipo: AlertaResultado["tipo"] = "ALTO_RIESGO";
    let encabezado = "🚨 *ALERTA PESV: VIAJE DE ALTO RIESGO*";

    if (esAltoRiesgo) {
      tipo = "ALTO_RIESGO";
      encabezado = "🚨 *ALERTA DE DESPACHO: VIAJE DE ALTO RIESGO (STE-F-010)*";
    } else if (esNocturno) {
      tipo = "NOCTURNO";
      encabezado = "🌙 *ALERTA DE DESPACHO: CONDUCCIÓN EN HORARIO NOCTURNO*";
    } else if (!preopAprobado) {
      tipo = "PREOPERACIONAL_PENDIENTE";
      encabezado = "⚠️ *ALERTA OPERATIVA: VEHÍCULO SIN PREOPERACIONAL CONFIRMADO*";
    }

    const lineas = [
      encabezado,
      `*Empresa:* TRANS SERVICES A&B S.A.S. (NIT 900.778.421-1)`,
      `--------------------------------------`,
      `🚗 *Placa:* ${placa.toUpperCase()}`,
      `👤 *Conductor:* ${conductorNombre}`,
      `🗺️ *Ruta:* ${origen} [${divipolaOrigen}] ➔ ${destino} [${divipolaDestino}]`,
      `⏰ *Hora Salida:* ${horaSalida} ${esNocturno ? "(NOCTURNO)" : "(DIURNO)"}`,
      `📊 *Nivel de Riesgo:* ${riskLevel?.toUpperCase() || "ALTO"} (${riskScore} pts)`,
      `📋 *Preoperacional:* ${preopAprobado ? "Aprobado ✅" : "Pendiente / Con Hallazgo ⚠️"}`,
      `--------------------------------------`,
      `🔍 *Verificar Despacho en Línea:*`,
      `${urlVerificacion}`,
    ];

    const mensajeTexto = lineas.join("\n");
    const mensajeEncoded = encodeURIComponent(mensajeTexto);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${mensajeEncoded}`;

    return {
      requiereAlerta: true,
      tipo,
      titulo: esAltoRiesgo ? "Viaje de Alto Riesgo Despachado" : "Viaje con Condiciones Especiales",
      mensajeTexto,
      whatsappUrl,
      prioridad: esAltoRiesgo ? "alta" : "media",
    };
  }

  return {
    requiereAlerta: false,
    tipo: "NORMAL",
    titulo: "Despacho Estándar",
    mensajeTexto: "Viaje registrado con nivel de riesgo bajo/medio sin restricciones.",
    prioridad: "baja",
  };
}
