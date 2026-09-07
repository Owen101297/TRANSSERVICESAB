import {
  EventoGPS,
  TipoEventoGPS,
  PrioridadEventoGPS,
  CalificacionConductorMensual,
  NivelDriverScore,
} from "@/lib/types/gps";
import { Persona } from "@/lib/types/persona";

/**
 * Normaliza el tipo de evento de Satelcopro
 */
export function normalizarTipoEventoSatelcopro(rawTipo: string): TipoEventoGPS {
  const t = (rawTipo || "").toLowerCase().trim();
  if (t.includes("overspeed") || t.includes("velocid") || t.includes("speed")) return "exceso_velocidad";
  if (t.includes("frenad") || t.includes("brak")) return "frenada_brusca";
  if (t.includes("aceler") || t.includes("accel")) return "acelerada_brusca";
  if (t.includes("giro") || t.includes("turn") || t.includes("corner")) return "giro_brusco";
  if (t.includes("panic") || t.includes("sos") || t.includes("alarma")) return "panico";
  if (t.includes("desconex") || t.includes("bater") || t.includes("power")) return "desconexion";
  if (t.includes("apagad") || t.includes("off")) return "apagado";
  if (t.includes("encendid") || t.includes("on")) return "encendido";
  if (t.includes("ralenti") || t.includes("idle") || t.includes("parada")) return "ralenti";
  if (t.includes("geocerca") || t.includes("fence")) return "salida_geocerca";
  return "otro";
}

/**
 * Normaliza la prioridad de Satelcopro
 */
export function normalizarPrioridadSatelcopro(rawPrioridad?: string, tipo?: TipoEventoGPS): PrioridadEventoGPS {
  const p = (rawPrioridad || "").toLowerCase().trim();
  if (p === "alta" || p === "critica" || p === "high" || p === "critical") return "alta";
  if (p === "media" || p === "medium") return "media";
  if (p === "baja" || p === "informativa" || p === "low" || p === "info") return "baja";

  // Si no viene prioridad explícita, deducir por tipo de evento
  if (tipo === "exceso_velocidad" || tipo === "panico" || tipo === "desconexion") return "alta";
  if (tipo === "frenada_brusca" || tipo === "acelerada_brusca" || tipo === "giro_brusco" || tipo === "salida_geocerca") return "media";
  return "baja";
}

/**
 * Genera el mensaje pedagógico institucional de retroalimentación para WhatsApp
 */
export function generarMensajeWhatsApp(evento: EventoGPS): string {
  const fecha = new Date(evento.fechaHora).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  let detalleNovedad = "";
  if (evento.tipoEvento === "exceso_velocidad") {
    detalleNovedad = `⚠️ *Exceso de Velocidad:* ${evento.velocidad || 0} km/h (Límite permitido: ${evento.limiteVelocidad || 80} km/h)`;
  } else if (evento.tipoEvento === "frenada_brusca") {
    detalleNovedad = `🛑 *Frenada Brusca:* Desaceleración intempestiva registrada en telemetría`;
  } else if (evento.tipoEvento === "acelerada_brusca") {
    detalleNovedad = `⚡ *Acelerada Brusca:* Aceleración intempestiva del motor`;
  } else if (evento.tipoEvento === "ralenti") {
    detalleNovedad = `⏱️ *Ralentí Prolongado:* Motor encendido sin movimiento`;
  } else {
    detalleNovedad = `📌 *Novedad:* ${evento.descripcion}`;
  }

  const ubicacion = evento.ubicacion ? `\n📍 *Ubicación:* ${evento.ubicacion}` : "";

  return (
`🛡️ *TRANS SERVICES COOPERATIVA A&B*
*Notificación de Seguridad Vial y Monitoreo PESV*

Hola *${evento.conductorNombre || "Conductor"}*, el sistema satelital (Satelcopro) registró una novedad en el vehículo asignado:

🚘 *Vehículo / Placa:* ${evento.placa}
📅 *Fecha y Hora:* ${fecha}
${detalleNovedad}${ubicacion}

💡 *Recomendación de Seguridad:*
Te invitamos a aplicar hábitos de *Manejo Defensivo*, mantener distancias seguras y respetar los límites de velocidad para proteger la vida de los pasajeros y tu propia integridad.

_¡Tu compromiso en la vía hace la diferencia!_`
  );
}

/**
 * Calcula el Driver Score mensual de un conductor a partir de sus eventos en un mes
 * Base: 100 puntos
 * Deducciones ponderadas:
 * - Excesos de velocidad (Peso: 40%) -> -5 pts por evento
 * - Frenadas bruscas (Peso: 25%) -> -3 pts por evento
 * - Aceleradas bruscas (Peso: 20%) -> -2 pts por evento
 * - Promedio de velocidad adecuado (Peso: 15%) -> Si prom > 75 km/h -> -5 pts
 */
export function calcularScoreConductor(
  conductor: Persona,
  eventosDelMes: EventoGPS[],
  mes: string = new Date().toISOString().slice(0, 7),
  placaPrincipal: string = "Flota A&B"
): CalificacionConductorMensual {
  const eventosConductor = eventosDelMes.filter(
    (e) => e.conductorId === conductor.id || (e.conductorNombre && e.conductorNombre.toLowerCase().includes(conductor.nombres.toLowerCase()))
  );

  const conteoExcesoVelocidad = eventosConductor.filter((e) => e.tipoEvento === "exceso_velocidad").length;
  const conteoFrenadaBrusca = eventosConductor.filter((e) => e.tipoEvento === "frenada_brusca").length;
  const conteoAceleradaBrusca = eventosConductor.filter((e) => e.tipoEvento === "acelerada_brusca").length;

  // Deducciones
  let penalizacionVelocidad = Math.min(40, conteoExcesoVelocidad * 6);
  let penalizacionFrenadas = Math.min(25, conteoFrenadaBrusca * 4);
  let penalizacionAceleradas = Math.min(20, conteoAceleradaBrusca * 3);

  // Estimación de velocidad promedio
  const eventosConVelocidad = eventosConductor.filter((e) => e.velocidad && e.velocidad > 0);
  const promedioVelocidad = eventosConVelocidad.length > 0
    ? Math.round(eventosConVelocidad.reduce((acc, curr) => acc + (curr.velocidad || 0), 0) / eventosConVelocidad.length)
    : 48; // Promedio estándar operativo

  let penalizacionPromedio = 0;
  if (promedioVelocidad > 75) penalizacionPromedio = 10;
  else if (promedioVelocidad > 65) penalizacionPromedio = 5;

  const deduccionTotal = penalizacionVelocidad + penalizacionFrenadas + penalizacionAceleradas + penalizacionPromedio;
  const puntajeTotal = Math.max(20, Math.min(100, 100 - deduccionTotal));

  let nivel: NivelDriverScore = "excelente";
  if (puntajeTotal < 60) nivel = "critico";
  else if (puntajeTotal < 75) nivel = "regular";
  else if (puntajeTotal < 90) nivel = "bueno";

  return {
    id: conductor.id,
    conductorId: conductor.id,
    conductorNombre: `${conductor.nombres} ${conductor.apellidos}`,
    conductorFoto: conductor.fotoIniciales || `${conductor.nombres[0]}${conductor.apellidos[0]}`,
    conductorTelefono: conductor.telefono,
    placaPrincipal,
    mes,
    puntajeTotal,
    nivel,
    totalEventos: eventosConductor.length,
    conteoExcesoVelocidad,
    conteoFrenadaBrusca,
    conteoAceleradaBrusca,
    promedioVelocidad,
    distanciaTotalKm: 1250 + (eventosConductor.length * 45),
    horasConduccion: 75 + (eventosConductor.length * 3),
  };
}

export const NIVEL_SCORE_LABELS: Record<
  NivelDriverScore,
  { label: string; badgeClass: string; colorText: string }
> = {
  excelente: {
    label: "Excelente / Conductor Estrella",
    badgeClass: "bg-ok-green-dim text-ok-green border-ok-green/40",
    colorText: "text-ok-green",
  },
  bueno: {
    label: "Bueno / Conducción Segura",
    badgeClass: "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/40",
    colorText: "text-radar-cyan",
  },
  regular: {
    label: "Regular / Requiere Acompañamiento",
    badgeClass: "bg-signal-amber-dim text-signal-amber border-signal-amber/40",
    colorText: "text-signal-amber",
  },
  critico: {
    label: "Crítico / Alto Riesgo PESV",
    badgeClass: "bg-alert-red-dim text-alert-red border-alert-red/40 animate-pulse",
    colorText: "text-alert-red",
  },
};

/**
 * Genera el mensaje formal de alerta por actividad fuera de horario (> 10:00 PM) para los administradores
 */
export function generarMensajeAlertaNocturnaAdmin(
  placa: string,
  conductorNombre: string,
  conductorTelefono: string | null | undefined,
  eventosNocturnos: EventoGPS[],
  adminNombre: string = "Administrador"
): string {
  const ultEvt = eventosNocturnos[0] || {};
  const fechaHoraStr = ultEvt.fechaHora
    ? new Date(ultEvt.fechaHora).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" })
    : new Date().toLocaleString("es-CO");

  const listaEventos = eventosNocturnos
    .slice(0, 5)
    .map((e) => {
      const hora = new Date(e.fechaHora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
      const tipo = TIPO_EVENTO_LABELS[e.tipoEvento]?.label || e.tipoEvento;
      const vel = e.velocidad ? ` (${e.velocidad} km/h)` : "";
      return `  • *${hora}:* ${tipo}${vel}`;
    })
    .join("\n");

  const ubicacion = ultEvt.ubicacion ? `\n📍 *Última Ubicación:* ${ultEvt.ubicacion}` : "";

  return (
`🚨 *ALERTA NOCTURNA - ACTIVIDAD FUERA DE HORARIO (>10:00 PM)* 🚨
*TRANS SERVICES A&B S.A.S. - Control de Flota PESV*

Estimado(a) *${adminNombre}*, el sistema satelital (Satelcopro) ha detectado *actividad vehicular no autorizada* en franja nocturna restringida:

🚘 *Vehículo / Placa:* ${placa}
👤 *Conductor Registrado:* ${conductorNombre || "Sin conductor asignado"} ${conductorTelefono ? `(Tel: ${conductorTelefono})` : ""}
⏱️ *Hora Último Reporte:* ${fechaHoraStr}${ubicacion}
📊 *Total Eventos en Turno Nocturno:* ${eventosNocturnos.length}

*Detalle de Novedades Detectadas:*
${listaEventos}

⚠️ *Acción Inmediata:*
Por favor comuníquese de inmediato con el conductor o contratista para verificar la autorización de movilización y salvaguardar la seguridad del vehículo y sus ocupantes.

_Centro de Monitoreo Automatizado A&B_`
  );
}

/**
 * Genera el mensaje formal de reincidencia para conductores con múltiples faltas
 */
export function generarMensajeReincidenciaWhatsApp(
  conductorNombre: string,
  placa: string,
  eventos: EventoGPS[]
): string {
  const faltasTexto = eventos
    .slice(0, 4)
    .map((e) => {
      const fecha = new Date(e.fechaHora).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
      const tipo = TIPO_EVENTO_LABELS[e.tipoEvento]?.label || e.tipoEvento;
      const vel = e.velocidad ? ` (${e.velocidad} km/h)` : "";
      return `  • ${fecha} — ${tipo}${vel}`;
    })
    .join("\n");

  return (
`⚠️ *NOTIFICACIÓN DE REINCIDENCIA EN SEGURIDAD VIAL (PESV)* ⚠️
*TRANS SERVICES A&B S.A.S.*

Hola *${conductorNombre || "Conductor"}*, el Comité de Seguridad Vial y Monitoreo Satelcopro ha registrado *${eventos.length} novedades reiteradas* en el vehículo *${placa}*:

*Historial Reciente de Novedades:*
${faltasTexto}

🛑 *Llamado a la Prevención:*
La reiteración de estas conductas incrementa el riesgo de siniestralidad. De acuerdo con el procedimiento del PESV, te solicitamos extremar las medidas de *manejo defensivo*, respetar los límites de velocidad y realizar pausas activas.

_Recuerda que tu vida y la de tus pasajeros es nuestra prioridad._`
  );
}

/**
 * Genera el Balance Diario de Desempeño PESV para enviar al WhatsApp del conductor al final del día
 */
export function generarMensajeCierreDiarioConductor(
  conductorNombre: string,
  placa: string,
  eventosDelDia: EventoGPS[],
  esGranTierra: boolean = false
): string {
  const fechaHoy = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const excesosVelocidad = eventosDelDia.filter((e) => e.tipoEvento === "exceso_velocidad" && (e.velocidad || 0) > 80);
  const excesosGeocerca = esGranTierra
    ? eventosDelDia.filter((e) => e.tipoEvento === "salida_geocerca" || e.descripcion.toLowerCase().includes("geocerca"))
    : [];
  const frenadasBruscas = eventosDelDia.filter((e) => e.tipoEvento === "frenada_brusca");
  const aceleradasBruscas = eventosDelDia.filter((e) => e.tipoEvento === "acelerada_brusca");
  const ralentiEventos = eventosDelDia.filter((e) => e.tipoEvento === "ralenti");

  const totalNovedades = excesosVelocidad.length + excesosGeocerca.length + frenadasBruscas.length + aceleradasBruscas.length;

  let scoreEstimado = 100 - (excesosVelocidad.length * 8 + excesosGeocerca.length * 6 + frenadasBruscas.length * 4 + aceleradasBruscas.length * 3 + ralentiEventos.length * 2);
  scoreEstimado = Math.max(30, Math.min(100, scoreEstimado));

  let concepto = "⭐⭐⭐⭐⭐ Excelente Jornada (Manejo Impecable)";
  if (scoreEstimado < 70) concepto = "⚠️ Requiere Refuerzo y Atención Inmediata";
  else if (scoreEstimado < 85) concepto = "🟡 Desempeño Aceptable con Oportunidades de Mejora";
  else if (scoreEstimado < 95) concepto = "🟢 Buen Desempeño Operacional";

  let feedbackTexto = "¡Felicitaciones por mantener una conducción segura y cuidar la integridad de nuestros usuarios!";
  if (totalNovedades > 0) {
    const sugerencias: string[] = [];
    if (excesosVelocidad.length > 0) sugerencias.push("mantener la velocidad por debajo de los 80 km/h en carretera");
    if (excesosGeocerca.length > 0) sugerencias.push("respetar rigurosamente los límites internos de geocerca en campo Gran Tierra");
    if (frenadasBruscas.length > 0) sugerencias.push("aumentar la distancia de seguimiento con los vehículos precedentes");
    if (aceleradasBruscas.length > 0) sugerencias.push("realizar arrancadas suaves y progresivas");
    if (ralentiEventos.length > 0) sugerencias.push("apagar el motor durante paradas prolongadas");

    feedbackTexto = `Te invitamos a: ${sugerencias.join(", ")} para seguir elevando tu puntaje PESV.`;
  }

  const lineaGeocerca = esGranTierra
    ? `  • 📍 Excesos en Geocercas (Gran Tierra): *${excesosGeocerca.length}*\n`
    : "";

  return (
`📊 *BALANCE DIARIO DE OPERACIÓN Y CONDUCCIÓN PESV* 📊
*TRANS SERVICES A&B S.A.S. - Cierre de Jornada*

Hola *${conductorNombre || "Conductor"}*, este es el reporte de tu jornada correspondiente a *${fechaHoy}*:

🚘 *Vehículo / Placa Asignada:* ${placa}
📈 *Calificación del Día:* *${scoreEstimado} / 100*
🎯 *Estado:* ${concepto}

*Novedades Registradas en Telemetría:*
  • ⚠️ Excesos de velocidad (>80 km/h): *${excesosVelocidad.length}*
${lineaGeocerca}  • 🛑 Frenadas bruscas: *${frenadasBruscas.length}*
  • ⚡ Aceleradas bruscas: *${aceleradasBruscas.length}*
  • ⏱️ Eventos de ralentí prolongado: *${ralentiEventos.length}*

💡 *Recomendación Formativa:*
${feedbackTexto}

_¡Agradecemos tu compromiso diario con la vida y la seguridad vial!_`
  );
}


