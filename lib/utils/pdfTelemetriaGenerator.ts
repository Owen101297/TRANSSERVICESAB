// lib/utils/pdfTelemetriaGenerator.ts
// Generador Oficial Corporativo de PDF TEL-FOR-01 (Informe de Telemetría GPS y Monitoreo PESV) para Trans Services A&B S.A.S.
// Formato técnico de ingeniería según estándares ISO 9001:2015, SG-SST y Resolución 40595 de 2022 (PESV).

import { EventoGPS, TIPO_EVENTO_LABELS } from "@/lib/types/gps";

export interface TelemetriaPdfMeta {
  fechaGeneracion?: string;
  rangoFechas?: string;
  vehiculosFiltrados?: string;
  eventosFiltrados?: string;
  prioridadFiltrada?: string;
  totalEventos?: number;
  criticosCount?: number;
  reincidentesCount?: number;
  nocturnosCount?: number;
}

const PALETTE = {
  primary: [15, 23, 42] as [number, number, number],       // Asphalt 900 #0F172A
  secondary: [30, 58, 138] as [number, number, number],    // Deep Blue #1E3A8A
  accent: [6, 182, 212] as [number, number, number],        // Radar Cyan #06B6D4
  textMain: [15, 23, 42] as [number, number, number],       // Slate 900
  textMuted: [71, 85, 105] as [number, number, number],     // Slate 600
  border: [203, 213, 225] as [number, number, number],      // Slate 300
  borderLight: [226, 232, 240] as [number, number, number], // Slate 200
  headerBg: [241, 245, 249] as [number, number, number],    // Slate 100
  bgCard: [248, 250, 252] as [number, number, number],      // Slate 50
  white: [255, 255, 255] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],           // Alert Red
  redBg: [254, 242, 242] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],         // Signal Amber
  amberBg: [254, 252, 232] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],         // OK Green
  greenBg: [240, 253, 244] as [number, number, number],
};

async function loadLogoImage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const urls = ["/logo.png", "./logo.png", "/brand/logo.png", "/assets/logo.png"];
  for (const u of urls) {
    try {
      const resp = await fetch(u);
      if (resp.ok) {
        const blob = await resp.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Siguiente URL
    }
  }
  return null;
}

export async function generateTelemetriaPDF(
  eventos: EventoGPS[],
  meta: TelemetriaPdfMeta = {}
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter", // 279.4 x 215.9 mm
  });

  const pageWidth = 279.4;
  const pageHeight = 215.9;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 259.4 mm
  let currentY = 8;

  const totalEventos = meta.totalEventos !== undefined ? meta.totalEventos : eventos.length;
  const criticosCount = meta.criticosCount !== undefined
    ? meta.criticosCount
    : eventos.filter((e) => e.prioridad === "alta").length;
  const nocturnosCount = meta.nocturnosCount !== undefined
    ? meta.nocturnosCount
    : eventos.filter((e) => {
        const h = new Date(e.fechaHora).getHours();
        return h >= 22 || h < 5;
      }).length;

  // 1. Membrete Institucional Oficial
  const headerHeight = 18;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, headerHeight, "FD");

  // Columna 1: Logo
  const col1Width = 50;
  const logoData = await loadLogoImage();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 4, currentY + 2, 42, 14, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PALETTE.primary);
      doc.text("TRANS SERVICES A&B", marginX + col1Width / 2, currentY + 10, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.primary);
    doc.text("TRANS SERVICES A&B", marginX + col1Width / 2, currentY + 10, { align: "center" });
  }

  // Divisor 1
  doc.line(marginX + col1Width, currentY, marginX + col1Width, currentY + headerHeight);

  // Columna 2: Título Oficial
  const col2Width = contentWidth - col1Width - 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("INFORME CONSOLIDADO DE TELEMETRÍA Y CONTROL PESV", marginX + col1Width + col2Width / 2, currentY + 6.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("SISTEMA DE GESTIÓN DE SEGURIDAD VIAL (RESOLUCIÓN 40595 DE 2022) & SATELCOPRO", marginX + col1Width + col2Width / 2, currentY + 11.5, { align: "center" });
  doc.text("Monitoreo de Velocidades, Hábitos de Conducción y Control de Horario Nocturno", marginX + col1Width + col2Width / 2, currentY + 15.5, { align: "center" });

  // Divisor 2
  doc.line(marginX + col1Width + col2Width, currentY, marginX + col1Width + col2Width, currentY + headerHeight);

  // Columna 3: Metadatos de Calidad
  const col3X = marginX + col1Width + col2Width;
  const col3Width = 55;
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMain);
  doc.setFont("helvetica", "bold");
  doc.text("CÓDIGO:", col3X + 3, currentY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.text("TEL-FOR-01", col3X + 22, currentY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.text("VERSIÓN:", col3X + 3, currentY + 8.5);
  doc.setFont("helvetica", "normal");
  doc.text("002", col3X + 22, currentY + 8.5);

  doc.setFont("helvetica", "bold");
  doc.text("EMISIÓN:", col3X + 3, currentY + 12.5);
  doc.setFont("helvetica", "normal");
  doc.text(meta.fechaGeneracion || new Date().toLocaleDateString("es-CO"), col3X + 22, currentY + 12.5);

  doc.setFont("helvetica", "bold");
  doc.text("PÁGINA:", col3X + 3, currentY + 16.5);
  doc.setFont("helvetica", "normal");
  doc.text("1 de 1", col3X + 22, currentY + 16.5);

  currentY += headerHeight + 3;

  // 2. Barra de Parámetros de Filtro & Resumen Estadístico (KPIs)
  const kpiBoxHeight = 15;
  doc.setFillColor(...PALETTE.bgCard);
  doc.rect(marginX, currentY, contentWidth, kpiBoxHeight, "FD");

  // Filtros aplicados (Izquierda)
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMain);
  doc.text("CRITERIOS DE FILTRO:", marginX + 3, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  const rangoTxt = `Rango: ${meta.rangoFechas || "Historial Seleccionado"}`;
  const vehTxt = `Vehículos: ${meta.vehiculosFiltrados || "Todos"}`;
  const evtsTxt = `Eventos: ${meta.eventosFiltrados || "Todos"}`;
  doc.text(`${rangoTxt}  |  ${vehTxt}  |  ${evtsTxt}`, marginX + 3, currentY + 8.5);
  doc.text(`Fecha Reporte: ${new Date().toLocaleString("es-CO")}  |  Plataforma: Gateway Telemetría Satelcopro Live`, marginX + 3, currentY + 12.5);

  // Tarjetas KPI (Derecha)
  const kpiStartX = marginX + contentWidth - 110;

  // KPI Total
  doc.setFillColor(...PALETTE.white);
  doc.rect(kpiStartX, currentY + 2, 25, 11, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.secondary);
  doc.text(String(totalEventos), kpiStartX + 12.5, currentY + 6.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TOTAL EVENTOS", kpiStartX + 12.5, currentY + 10.5, { align: "center" });

  // KPI Críticos
  doc.setFillColor(...PALETTE.redBg);
  doc.setDrawColor(...PALETTE.red);
  doc.rect(kpiStartX + 27, currentY + 2, 25, 11, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.red);
  doc.text(String(criticosCount), kpiStartX + 27 + 12.5, currentY + 6.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.text("CRÍTICOS / ALTA", kpiStartX + 27 + 12.5, currentY + 10.5, { align: "center" });

  // KPI Nocturnos (>10 PM)
  doc.setFillColor(...PALETTE.amberBg);
  doc.setDrawColor(...PALETTE.amber);
  doc.rect(kpiStartX + 54, currentY + 2, 28, 11, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.amber);
  doc.text(String(nocturnosCount), kpiStartX + 54 + 14, currentY + 6.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.text("FUERA HORARIO (>10PM)", kpiStartX + 54 + 14, currentY + 10.5, { align: "center" });

  // KPI Estado Gestión
  const resueltosCount = eventos.filter((e) => e.estadoRetroalimentacion === "resuelta" || e.estadoRetroalimentacion === "enviada_whatsapp").length;
  doc.setFillColor(...PALETTE.greenBg);
  doc.setDrawColor(...PALETTE.green);
  doc.rect(kpiStartX + 84, currentY + 2, 24, 11, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.green);
  doc.text(String(resueltosCount), kpiStartX + 84 + 12, currentY + 6.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.text("GESTIONADOS HSE", kpiStartX + 84 + 12, currentY + 10.5, { align: "center" });

  currentY += kpiBoxHeight + 3;

  // 3. Tabla de Datos de Telemetría
  const columns = [
    { header: "#", width: 8 },
    { header: "FECHA / HORA", width: 28 },
    { header: "PLACA", width: 20 },
    { header: "CONDUCTOR ASIGNADO", width: 50 },
    { header: "NOVEDAD DETECTADA", width: 42 },
    { header: "SEVERIDAD", width: 20 },
    { header: "VELOCIDAD / LÍM.", width: 26 },
    { header: "UBICACIÓN / TRAMO", width: 40 },
    { header: "GESTIÓN HSE", width: 25.4 },
  ];

  // Encabezado de la Tabla
  const tableHeaderHeight = 6.5;
  doc.setFillColor(...PALETTE.primary);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, currentY, contentWidth, tableHeaderHeight, "FD");

  let colX = marginX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.white);

  columns.forEach((col) => {
    doc.text(col.header, colX + col.width / 2, currentY + 4.3, { align: "center" });
    colX += col.width;
  });

  currentY += tableHeaderHeight;

  // Filas de la Tabla (hasta llenar la hoja de forma compacta)
  const maxRowsPerPage = 17;
  const displayRecords = eventos.slice(0, maxRowsPerPage);
  const rowHeight = 6.2;

  displayRecords.forEach((evt, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.setDrawColor(...PALETTE.borderLight);
    doc.rect(marginX, currentY, contentWidth, rowHeight, "FD");

    let cellX = marginX;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMain);

    // 1. #
    doc.text(String(idx + 1), cellX + columns[0].width / 2, currentY + 4.2, { align: "center" });
    cellX += columns[0].width;

    // 2. Fecha / Hora
    const d = new Date(evt.fechaHora);
    const fechaStr = `${d.toLocaleDateString("es-CO")} ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFont("courier", "normal");
    doc.setFontSize(6);
    doc.text(fechaStr, cellX + 1.5, currentY + 4.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    cellX += columns[1].width;

    // 3. Placa
    doc.setFont("courier", "bold");
    doc.text(evt.placa, cellX + columns[2].width / 2, currentY + 4.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    cellX += columns[2].width;

    // 4. Conductor
    const condName = (evt.conductorNombre || "Sin conductor asignado").slice(0, 32);
    doc.text(condName, cellX + 1.5, currentY + 4.2);
    cellX += columns[3].width;

    // 5. Novedad
    const tipoConf = TIPO_EVENTO_LABELS[evt.tipoEvento] || { label: evt.tipoEvento };
    doc.text(tipoConf.label.slice(0, 26), cellX + 1.5, currentY + 4.2);
    cellX += columns[4].width;

    // 6. Severidad
    const sev = evt.prioridad === "alta" ? "CRÍTICA" : evt.prioridad === "media" ? "MEDIA" : "INFORMATIVA";
    if (evt.prioridad === "alta") doc.setTextColor(...PALETTE.red);
    else if (evt.prioridad === "media") doc.setTextColor(...PALETTE.amber);
    else doc.setTextColor(...PALETTE.accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(sev, cellX + columns[5].width / 2, currentY + 4.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMain);
    cellX += columns[5].width;

    // 7. Velocidad / Límite
    const velTxt = evt.velocidad !== undefined ? `${evt.velocidad} km/h` : "—";
    const limTxt = evt.limiteVelocidad ? ` (Máx ${evt.limiteVelocidad})` : "";
    doc.setFont("courier", "normal");
    doc.setFontSize(6);
    doc.text(`${velTxt}${limTxt}`, cellX + 1.5, currentY + 4.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    cellX += columns[6].width;

    // 8. Ubicación
    const ubi = (evt.ubicacion || "En ruta").slice(0, 26);
    doc.setFontSize(5.5);
    doc.text(ubi, cellX + 1.5, currentY + 4.2);
    doc.setFontSize(6.5);
    cellX += columns[7].width;

    // 9. Gestión HSE
    const gst = evt.estadoRetroalimentacion === "enviada_whatsapp"
      ? "Notificado WA"
      : evt.estadoRetroalimentacion === "resuelta"
      ? "Cerrado"
      : "Pendiente";
    doc.setFontSize(6);
    if (gst === "Pendiente") doc.setTextColor(...PALETTE.red);
    else doc.setTextColor(...PALETTE.green);
    doc.text(gst, cellX + columns[8].width / 2, currentY + 4.2, { align: "center" });

    currentY += rowHeight;
  });

  // Si hay más registros que los que caben en 1 página, indicarlo formalmente
  if (eventos.length > maxRowsPerPage) {
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(`* Mostrando ${maxRowsPerPage} de ${eventos.length} eventos según filtros activos. Para ver el consolidado total de ${eventos.length} registros, descargue el reporte Excel (.xlsx).`, marginX, currentY + 3.5);
  }

  // 4. Bloque de Firmas y Validación Institucional
  const signaturesY = pageHeight - 24;
  const sigBoxWidth = (contentWidth - 10) / 2;

  // Firma 1: Analista Telemetría
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, signaturesY, sigBoxWidth, 16, "FD");
  doc.line(marginX + 10, signaturesY + 11, marginX + sigBoxWidth - 10, signaturesY + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("ELABORÓ: OPERADOR DE MONITOREO GPS / SATELCOPRO", marginX + sigBoxWidth / 2, signaturesY + 13.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TRANS SERVICES A&B S.A.S. - Centro de Control Operativo", marginX + sigBoxWidth / 2, signaturesY + 15.5, { align: "center" });

  // Firma 2: Coordinador HSEQ / PESV
  const sig2X = marginX + sigBoxWidth + 10;
  doc.rect(sig2X, signaturesY, sigBoxWidth, 16, "FD");
  doc.line(sig2X + 10, signaturesY + 11, sig2X + sigBoxWidth - 10, signaturesY + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("REVISÓ Y APROBÓ: COORDINACIÓN HSEQ / PESV", sig2X + sigBoxWidth / 2, signaturesY + 13.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("Verificación de Cumplimiento Plan Estratégico de Seguridad Vial", sig2X + sigBoxWidth / 2, signaturesY + 15.5, { align: "center" });

  // Guardar y descargar PDF
  const filename = `Reporte_Telemetria_PESV_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
