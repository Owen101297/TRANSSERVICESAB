import { prisma } from "@/lib/prisma";

export interface DriverScorecardItem {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  numeroDocumento: string;
  telefono: string;
  email: string;
  estado: string;
  licenciaNumero?: string;
  licenciaCategorias?: string[];
  licenciaVencimiento?: string | null;
  diasVigenciaLicencia?: number | null;
  licenciaEstado: "vigente" | "por_vencer" | "vencida" | "sin_licencia";
  
  // Métricas PESV
  totalViajes: number;
  viajesFinalizados: number;
  kmAcumulados: number;
  promedioRiesgo: number;
  viajesAltoRiesgoCount: number;
  
  // Preoperacionales
  totalPreoperacionales: number;
  preoperacionalesAptos: number;
  cumplimientoPreopPct: number;
  
  // Capacitaciones & Telemetría
  capacitacionesAsistidas: number;
  eventosGPS: number;
  
  // Scorecard Global PESV (0 a 100)
  scorecardRating: number;
  categoriaRating: "EXCELENTE" | "CONFORME" | "EN_OBSERVACION" | "CRITICO";
  badgeColor: "green" | "cyan" | "amber" | "red";
}

export async function getDriverScorecardsDb(): Promise<DriverScorecardItem[]> {
  const [personas, viajes, preoperacionales, capacitaciones, eventosGps] = await Promise.all([
    prisma.persona.findMany({
      where: {
        perfiles: { has: "conductor" },
      },
      include: {
        licenciaConduccion: true,
      },
      orderBy: { apellidos: "asc" },
    }),
    prisma.viaje.findMany(),
    prisma.inspeccionPreoperacional.findMany(),
    prisma.asistenciaRegistro.findMany({
      where: { asistio: true },
    }),
    prisma.eventoGPS.findMany(),
  ]);

  const hoy = new Date();

  return personas.map((p) => {
    const doc = p.numeroDocumento.trim();
    const nombreCompleto = `${p.nombres} ${p.apellidos}`.trim();

    // 1. Licencia
    let licenciaEstado: DriverScorecardItem["licenciaEstado"] = "sin_licencia";
    let diasVigenciaLicencia: number | null = null;
    let fechaVencStr: string | null = null;

    if (p.licenciaConduccion?.fechaVencimiento) {
      const fv = new Date(p.licenciaConduccion.fechaVencimiento);
      fechaVencStr = fv.toISOString().slice(0, 10);
      diasVigenciaLicencia = Math.ceil((fv.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      if (diasVigenciaLicencia < 0) licenciaEstado = "vencida";
      else if (diasVigenciaLicencia <= 30) licenciaEstado = "por_vencer";
      else licenciaEstado = "vigente";
    }

    // 2. Viajes STE-F-010
    const viajesConductor = viajes.filter(
      (v) => v.conductorId === p.id || (v.conductorNombre && v.conductorNombre.toLowerCase().includes(p.apellidos.toLowerCase()))
    );
    const totalViajes = viajesConductor.length;
    const viajesFinalizados = viajesConductor.filter((v) => v.estado === "finalizado" || v.estado === "Finalizado" || v.fechaLlegadaReal).length;
    
    let kmAcumulados = 0;
    let sumaRiesgo = 0;
    let viajesAltoRiesgoCount = 0;

    for (const v of viajesConductor) {
      const km = v.distanciaKm || (v.riskInputs as any)?.distanciaKm || 0;
      kmAcumulados += km;
      const score = v.riskScore || 0;
      sumaRiesgo += score;
      if (score >= 24 || v.riskLevel === "Alto") viajesAltoRiesgoCount++;
    }

    const promedioRiesgo = totalViajes > 0 ? Math.round((sumaRiesgo / totalViajes) * 10) / 10 : 12;

    // 3. Preoperacionales
    const preopsConductor = preoperacionales.filter(
      (i) => i.conductorId === p.id || i.conductorNombre.toLowerCase().includes(p.apellidos.toLowerCase())
    );
    const totalPreoperacionales = preopsConductor.length;
    const preoperacionalesAptos = preopsConductor.filter((i) => i.estadoConcepto === "apto").length;
    const cumplimientoPreopPct = totalPreoperacionales > 0
      ? Math.round((preoperacionalesAptos / totalPreoperacionales) * 100)
      : 100;

    // 4. Capacitaciones PESV
    const capAsistidas = capacitaciones.filter(
      (c) => c.personaId === p.id || c.personaDocumento === doc
    ).length;

    // 5. Telemetría GPS
    const gpsConductor = eventosGps.filter(
      (g) => g.conductorId === p.id || (g.conductorNombre && g.conductorNombre.toLowerCase().includes(p.apellidos.toLowerCase()))
    ).length;

    // 6. Cálculo del Scorecard Ponderado (0 a 100 puntos)
    // - Licencia vigente: 20 pts
    // - Cumplimiento Preoperacional: 30 pts
    // - Riesgo promedio de viaje bajo (<= 15 pts): 25 pts
    // - Asistencia a Capacitaciones: 15 pts
    // - Cero eventos graves de telemetría: 10 pts
    let score = 0;
    if (licenciaEstado === "vigente") score += 20;
    else if (licenciaEstado === "por_vencer") score += 10;

    score += Math.round((cumplimientoPreopPct / 100) * 30);

    if (promedioRiesgo <= 15) score += 25;
    else if (promedioRiesgo <= 23) score += 18;
    else score += 10;

    score += Math.min(15, capAsistidas * 3);
    score += Math.max(0, 10 - gpsConductor * 2);

    const scorecardRating = Math.min(100, Math.max(0, score));

    let categoriaRating: DriverScorecardItem["categoriaRating"] = "CONFORME";
    let badgeColor: DriverScorecardItem["badgeColor"] = "cyan";

    if (scorecardRating >= 90) {
      categoriaRating = "EXCELENTE";
      badgeColor = "green";
    } else if (scorecardRating >= 75) {
      categoriaRating = "CONFORME";
      badgeColor = "cyan";
    } else if (scorecardRating >= 60) {
      categoriaRating = "EN_OBSERVACION";
      badgeColor = "amber";
    } else {
      categoriaRating = "CRITICO";
      badgeColor = "red";
    }

    return {
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombreCompleto,
      numeroDocumento: p.numeroDocumento,
      telefono: p.telefono,
      email: p.email,
      estado: p.estado,
      licenciaNumero: p.licenciaConduccion?.numero,
      licenciaCategorias: p.licenciaConduccion?.categorias,
      licenciaVencimiento: fechaVencStr,
      diasVigenciaLicencia,
      licenciaEstado,
      totalViajes,
      viajesFinalizados,
      kmAcumulados: Math.round(kmAcumulados),
      promedioRiesgo,
      viajesAltoRiesgoCount,
      totalPreoperacionales,
      preoperacionalesAptos,
      cumplimientoPreopPct,
      capacitacionesAsistidas: capAsistidas,
      eventosGPS: gpsConductor,
      scorecardRating,
      categoriaRating,
      badgeColor,
    };
  });
}
