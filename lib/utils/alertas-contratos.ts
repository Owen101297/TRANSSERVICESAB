import { Contratista } from "@/lib/types/contratista";

export type NivelAlertaContrato = "vencido" | "urgente" | "preventivo" | "optimo" | "indefinido";

export interface DiagnosticoContrato {
  nivel: NivelAlertaContrato;
  diasRestantes?: number;
  label: string;
  badgeClass: string;
}

/**
 * Evalúa el estado de vigencia del contrato de vinculación de un contratista
 * - Vencido: <= 0 días (Rojo)
 * - Urgente: <= 15 días (Ámbar)
 * - Preventivo: <= 30 días (Cian)
 * - Óptimo: > 30 días (Verde)
 * - Indefinido: Sin fecha de fin establecida
 */
export function evaluarAlertaContrato(contratista: Contratista): DiagnosticoContrato {
  if (!contratista.fechaFinContrato) {
    return {
      nivel: "indefinido",
      label: "Contrato Indefinido / Vigente",
      badgeClass: "bg-asphalt-800 text-mist-200 border-line-600",
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [y, m, d] = contratista.fechaFinContrato.split("-").map(Number);
  const fin = new Date(y, m - 1, d);
  fin.setHours(0, 0, 0, 0);

  const diffMs = fin.getTime() - hoy.getTime();
  const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return {
      nivel: "vencido",
      diasRestantes,
      label: `Vencido hace ${Math.abs(diasRestantes)} d`,
      badgeClass: "bg-alert-red-dim text-alert-red border-alert-red/40 animate-pulse",
    };
  }

  if (diasRestantes === 0) {
    return {
      nivel: "vencido",
      diasRestantes: 0,
      label: "Vence hoy",
      badgeClass: "bg-alert-red-dim text-alert-red border-alert-red/40 font-bold",
    };
  }

  if (diasRestantes <= 15) {
    return {
      nivel: "urgente",
      diasRestantes,
      label: `Vence en ${diasRestantes} d`,
      badgeClass: "bg-signal-amber-dim text-signal-amber border-signal-amber/40 font-semibold",
    };
  }

  if (diasRestantes <= 30) {
    return {
      nivel: "preventivo",
      diasRestantes,
      label: `Vence en ${diasRestantes} d`,
      badgeClass: "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/40",
    };
  }

  return {
    nivel: "optimo",
    diasRestantes,
    label: `Vigente (${diasRestantes} d)`,
    badgeClass: "bg-ok-green-dim text-ok-green border-ok-green/40",
  };
}

export function contarAlertasContratos(contratistas: Contratista[]) {
  let vencidos = 0;
  let urgentes = 0;
  let preventivos = 0;
  let optimos = 0;

  for (const c of contratistas) {
    if (c.estado === "inactivo") continue;
    const diag = evaluarAlertaContrato(c);
    if (diag.nivel === "vencido") vencidos++;
    else if (diag.nivel === "urgente") urgentes++;
    else if (diag.nivel === "preventivo") preventivos++;
    else optimos++;
  }

  return {
    vencidos,
    urgentes,
    preventivos,
    optimos,
    totalConAlertas: vencidos + urgentes + preventivos,
  };
}
