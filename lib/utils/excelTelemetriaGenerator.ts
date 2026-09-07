// lib/utils/excelTelemetriaGenerator.ts
// Generador Oficial de Reportes en Excel (.xlsx) para el Módulo de Telemetría GPS y Control PESV.
// TRANS SERVICES A&B S.A.S.

import * as XLSX from "xlsx";
import { EventoGPS, TIPO_EVENTO_LABELS } from "@/lib/types/gps";

export interface TelemetriaExcelMeta {
  rangoFechas?: string;
  vehiculosFiltrados?: string;
  eventosFiltrados?: string;
}

export function generateTelemetriaExcel(
  eventos: EventoGPS[],
  meta: TelemetriaExcelMeta = {}
): void {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Detalle de Eventos
  const detalleRows = eventos.map((e, index) => {
    const d = new Date(e.fechaHora);
    const fecha = d.toLocaleDateString("es-CO");
    const hora = d.toLocaleTimeString("es-CO");
    const h = d.getHours();
    const esNocturno = h >= 22 || h < 5 ? "SÍ (Fuera de Horario)" : "NO";
    const tipoLabel = TIPO_EVENTO_LABELS[e.tipoEvento]?.label || e.tipoEvento;

    return {
      "#": index + 1,
      "Placa": e.placa,
      "Conductor": e.conductorNombre || "Sin conductor asignado",
      "Teléfono Conductor": e.conductorTelefono || "N/A",
      "Fecha": fecha,
      "Hora": hora,
      "Actividad Nocturna (>10 PM)": esNocturno,
      "Tipo Novedad": tipoLabel,
      "Severidad": e.prioridad ? e.prioridad.toUpperCase() : "INFORMATIVA",
      "Velocidad (km/h)": e.velocidad !== undefined ? e.velocidad : "N/A",
      "Límite Máx (km/h)": e.limiteVelocidad !== undefined ? e.limiteVelocidad : "N/A",
      "Odómetro (km)": e.odometro !== undefined ? e.odometro : "N/A",
      "Ubicación / Tramo": e.ubicacion || "En ruta",
      "Latitud": e.latitud !== undefined ? e.latitud : "",
      "Longitud": e.longitud !== undefined ? e.longitud : "",
      "Gestión HSE": e.estadoRetroalimentacion || "pendiente",
      "Observaciones Gestión": e.observacionesGestion || "",
    };
  });

  const wsDetalle = XLSX.utils.json_to_sheet(detalleRows);
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle_Eventos");

  // 2. Hoja de Resumen Ejecutivo y Estadísticas
  const total = eventos.length;
  const criticos = eventos.filter((e) => e.prioridad === "alta").length;
  const nocturnos = eventos.filter((e) => {
    const h = new Date(e.fechaHora).getHours();
    return h >= 22 || h < 5;
  }).length;
  const gestionados = eventos.filter((e) => e.estadoRetroalimentacion === "enviada_whatsapp" || e.estadoRetroalimentacion === "resuelta").length;

  // Conteo por Placa
  const conteoPlacas: Record<string, number> = {};
  eventos.forEach((e) => {
    conteoPlacas[e.placa] = (conteoPlacas[e.placa] || 0) + 1;
  });

  const placasResumen = Object.entries(conteoPlacas)
    .sort((a, b) => b[1] - a[1])
    .map(([placa, cant]) => ({
      "Vehículo / Placa": placa,
      "Total Eventos": cant,
      "Estado Reincidencia": cant >= 2 ? "REINCIDENTE" : "OK",
    }));

  // Conteo por Tipo de Novedad
  const conteoTipos: Record<string, number> = {};
  eventos.forEach((e) => {
    const lbl = TIPO_EVENTO_LABELS[e.tipoEvento]?.label || e.tipoEvento;
    conteoTipos[lbl] = (conteoTipos[lbl] || 0) + 1;
  });

  const tiposResumen = Object.entries(conteoTipos)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, cant]) => ({
      "Tipo de Novedad": tipo,
      "Cantidad Detectada": cant,
      "% del Total": total > 0 ? `${Math.round((cant / total) * 100)}%` : "0%",
    }));

  const resumenKpis = [
    { "Métrica PESV / Telemetría": "Total de Eventos Registrados", "Valor": total },
    { "Métrica PESV / Telemetría": "Eventos de Severidad Crítica / Alta", "Valor": criticos },
    { "Métrica PESV / Telemetría": "Eventos Fuera de Horario (>10:00 PM)", "Valor": nocturnos },
    { "Métrica PESV / Telemetría": "Eventos con Gestión HSE Realizada", "Valor": gestionados },
    { "Métrica PESV / Telemetría": "Fecha y Hora de Generación", "Valor": new Date().toLocaleString("es-CO") },
    { "Métrica PESV / Telemetría": "Criterio de Rango Aplicado", "Valor": meta.rangoFechas || "Todos" },
  ];

  const wsResumen = XLSX.utils.json_to_sheet(resumenKpis);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen_Métricas");

  const wsPlacas = XLSX.utils.json_to_sheet(placasResumen);
  XLSX.utils.book_append_sheet(wb, wsPlacas, "Consolidado_Vehiculos");

  const wsTipos = XLSX.utils.json_to_sheet(tiposResumen);
  XLSX.utils.book_append_sheet(wb, wsTipos, "Consolidado_Tipos");

  // Descarga del archivo Excel
  const filename = `Reporte_Telemetria_PESV_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
