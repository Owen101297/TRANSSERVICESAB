import { Vehiculo } from "@/lib/types/vehiculo";

export type NivelAlertaVehiculo = "vencido" | "urgente" | "preventivo" | "vigente" | "sin_fecha";

export interface InfoAlertaDocumento {
  nombre: string; // SOAT, RTM, Póliza RCC/RCE, Tarjeta de Operación
  vencimientoISO?: string;
  diasRestantes: number | null;
  nivel: NivelAlertaVehiculo;
  etiqueta: string;
  badgeClass: string;
}

export interface AlertasVehiculoResumen {
  vehiculo: Vehiculo;
  alertas: InfoAlertaDocumento[];
  peorNivel: NivelAlertaVehiculo;
  tieneAlertasCriticas: boolean; // vencido o urgente
  tieneAlertasPreventivas: boolean; // preventivo
}

/**
 * Calcula los días restantes y nivel de alerta de una fecha de vencimiento
 */
export function calcularAlertaFecha(vencimientoISO?: string, nombreDoc: string = "Documento"): InfoAlertaDocumento {
  if (!vencimientoISO || vencimientoISO.trim() === "") {
    return {
      nombre: nombreDoc,
      vencimientoISO: undefined,
      diasRestantes: null,
      nivel: "sin_fecha",
      etiqueta: "Sin fecha",
      badgeClass: "bg-asphalt-800 text-fog-400 border-line-600",
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fecha = new Date(vencimientoISO);
  fecha.setHours(0, 0, 0, 0);

  if (isNaN(fecha.getTime())) {
    return {
      nombre: nombreDoc,
      vencimientoISO,
      diasRestantes: null,
      nivel: "sin_fecha",
      etiqueta: "Fecha inválida",
      badgeClass: "bg-asphalt-800 text-fog-400 border-line-600",
    };
  }

  const diferenciaMs = fecha.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return {
      nombre: nombreDoc,
      vencimientoISO,
      diasRestantes,
      nivel: "vencido",
      etiqueta: `Vencido hace ${Math.abs(diasRestantes)}d`,
      badgeClass: "bg-alert-red-dim text-alert-red border-alert-red/40 animate-pulse font-bold",
    };
  }

  if (diasRestantes <= 15) {
    return {
      nombre: nombreDoc,
      vencimientoISO,
      diasRestantes,
      nivel: "urgente",
      etiqueta: diasRestantes === 0 ? "Vence HOY" : `Vence en ${diasRestantes}d`,
      badgeClass: "bg-signal-amber-dim text-signal-amber border-signal-amber/40 font-bold",
    };
  }

  if (diasRestantes <= 30) {
    return {
      nombre: nombreDoc,
      vencimientoISO,
      diasRestantes,
      nivel: "preventivo",
      etiqueta: `Vence en ${diasRestantes}d`,
      badgeClass: "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/40",
    };
  }

  return {
    nombre: nombreDoc,
    vencimientoISO,
    diasRestantes,
    nivel: "vigente",
    etiqueta: `Vigente (${diasRestantes}d)`,
    badgeClass: "bg-ok-green-dim text-ok-green border-ok-green/40",
  };
}

/**
 * Analiza todos los documentos de un vehículo y retorna el resumen de su semáforo
 */
export function analizarAlertasVehiculo(vehiculo: Vehiculo): AlertasVehiculoResumen {
  const alertas: InfoAlertaDocumento[] = [];

  // 1. SOAT
  alertas.push(calcularAlertaFecha(vehiculo.documentos?.soatVencimiento, "SOAT"));

  // 2. RTM (Revisión Técnico-Mecánica)
  alertas.push(calcularAlertaFecha(vehiculo.documentos?.rtmVencimiento, "RTM"));

  // 3. Pólizas Contractual y Extracontractual
  alertas.push(calcularAlertaFecha(vehiculo.documentos?.polizaVencimiento, "Pólizas RCC/RCE"));

  // Determinar el peor nivel
  let peorNivel: NivelAlertaVehiculo = "vigente";

  if (alertas.some((a) => a.nivel === "vencido")) {
    peorNivel = "vencido";
  } else if (alertas.some((a) => a.nivel === "urgente")) {
    peorNivel = "urgente";
  } else if (alertas.some((a) => a.nivel === "preventivo")) {
    peorNivel = "preventivo";
  } else if (alertas.every((a) => a.nivel === "sin_fecha")) {
    peorNivel = "sin_fecha";
  }

  const tieneAlertasCriticas = peorNivel === "vencido" || peorNivel === "urgente";
  const tieneAlertasPreventivas = peorNivel === "preventivo";

  return {
    vehiculo,
    alertas,
    peorNivel,
    tieneAlertasCriticas,
    tieneAlertasPreventivas,
  };
}

/**
 * Estadísticas globales del semáforo para toda la flota
 */
export function calcularMetricasFlotaAlertas(vehiculos: Vehiculo[]) {
  const analisis = vehiculos.map(analizarAlertasVehiculo);

  const total = vehiculos.length;
  const vencidos = analisis.filter((a) => a.peorNivel === "vencido").length;
  const urgentes = analisis.filter((a) => a.peorNivel === "urgente").length;
  const preventivos = analisis.filter((a) => a.peorNivel === "preventivo").length;
  const vigentes = analisis.filter((a) => a.peorNivel === "vigente").length;

  return {
    total,
    vencidos,
    urgentes,
    preventivos,
    vigentes,
    conAlertas: vencidos + urgentes + preventivos,
    analisis,
  };
}
