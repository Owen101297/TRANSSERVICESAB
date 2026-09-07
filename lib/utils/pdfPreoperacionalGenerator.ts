// lib/utils/pdfPreoperacionalGenerator.ts
// Generador Oficial de PDF MTO-F-010 (Versión 04) para Trans Services A&B
// Formato profesional de ingeniería documental SIG HSEQ-PESV en tamaño Carta con 100% de retención de datos

import {
  InspeccionPreoperacionalDto,
  PREOPERACIONAL_SECCIONES,
  ValorItemChecklist,
} from "@/lib/types/preoperacional";

interface PreoperacionalPdfData extends InspeccionPreoperacionalDto {
  vehiculoTipo?: string;
  vehiculoModelo?: string;
  vehiculoColor?: string;
  vehiculoEmpresa?: string;
  conductorLicencia?: string;
  conductorVencimiento?: string;
  conductorTelefono?: string;
  turno?: string;
  ubicacion?: string;
}

const PALETTE = {
  headerGreen: [217, 234, 211] as [number, number, number],   // Verde institucional de sección #D9EAD3
  headerGreenText: [20, 50, 20] as [number, number, number],  // Verde oscuro texto
  lineDark: [0, 0, 0] as [number, number, number],            // Línea negra fina formato oficial
  textBlack: [0, 0, 0] as [number, number, number],           // Texto principal negro
  textMuted: [70, 70, 70] as [number, number, number],        // Gris técnico
  white: [255, 255, 255] as [number, number, number],
  greenBg: [198, 239, 206] as [number, number, number],       // Verde Apto #C6EFCE
  greenText: [0, 97, 0] as [number, number, number],
  yellowBg: [255, 235, 156] as [number, number, number],      // Amarillo Con Observación #FFEB9C
  yellowText: [156, 101, 0] as [number, number, number],
  redBg: [255, 199, 206] as [number, number, number],         // Rojo No Apto #FFC7CE
  redText: [156, 0, 6] as [number, number, number],
};

async function loadLogoImage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const urls = ["/logo.png", "./logo.png", "/assets/logo.png", "./assets/logo.png"];
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
      // Intentar siguiente ruta
    }
  }
  return null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const clean = dateStr.split("T")[0];
    const [y, m, d] = clean.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString("es-CO");
  } catch {
    // fallback
  }
  return dateStr;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    }
  } catch {
    // fallback
  }
  return "—";
}

export async function generatePreoperacionalPDF(data: PreoperacionalPdfData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "letter",
    compress: true,
  });

  const pw = doc.internal.pageSize.getWidth();  // 215.9 mm
  const ph = doc.internal.pageSize.getHeight(); // 279.4 mm
  const m = 6;                                  // Margen exterior 6mm
  const cw = pw - m * 2;                        // Ancho útil = 203.9 mm

  const logoBase64 = await loadLogoImage();

  // =========================================================
  // ENCABEZADO OFICIAL REPLICADO EXACTO AL FORMATO MTO-F-010
  // =========================================================
  const headerH = 15;
  const colLogoW = 38;
  const colDocW = 46;
  const colTitleW = cw - colLogoW - colDocW;

  doc.setDrawColor(...PALETTE.lineDark);
  doc.setLineWidth(0.25);
  doc.setFillColor(...PALETTE.white);
  doc.rect(m, m, cw, headerH, "FD");

  // Columna 1: Logo Oficial con texto
  doc.line(m + colLogoW, m, m + colLogoW, m + headerH);
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", m + 1.5, m + 1, colLogoW - 3, headerH - 3.5);
    } catch {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.textBlack);
      doc.text("TRANS SERVICES A&B", m + colLogoW / 2, m + 7, { align: "center" });
    }
  } else {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.textBlack);
    doc.text("TRANS SERVICES A&B", m + colLogoW / 2, m + 7, { align: "center" });
  }
  doc.setFontSize(4.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B", m + colLogoW / 2, m + headerH - 1.5, { align: "center" });

  // Columna 2: Título Central
  doc.setFontSize(8.0);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text("INSPECCION PREOPERACIONAL DE VEHÍCULOS", m + colLogoW + colTitleW / 2, m + 6.5, { align: "center" });
  doc.text("DE SERVICIO ESPECIAL DE PASAJEROS", m + colLogoW + colTitleW / 2, m + 10.0, { align: "center" });
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text("FORMATO OFICIAL PESV / SG-SST", m + colLogoW + colTitleW / 2, m + 13.5, { align: "center" });

  // Columna 3: Control Documental Normativo
  const xDoc = m + colLogoW + colTitleW;
  doc.line(xDoc, m, xDoc, m + headerH);
  const docRowH = headerH / 4;
  for (let i = 1; i < 4; i++) {
    doc.line(xDoc, m + docRowH * i, m + cw, m + docRowH * i);
  }

  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text("MTO-F-010", xDoc + colDocW / 2, m + 2.8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.0);
  doc.text("Versión: 04", xDoc + colDocW / 2, m + docRowH + 2.6, { align: "center" });
  doc.text("Fecha: 2025/08/26", xDoc + colDocW / 2, m + docRowH * 2 + 2.6, { align: "center" });
  doc.text("Página 1 de 1", xDoc + colDocW / 2, m + docRowH * 3 + 2.6, { align: "center" });

  let y = m + headerH;

  // =========================================================
  // HELPER: ENCABEZADO DE SECCIÓN CON VERDE OFICIAL
  // =========================================================
  function drawSectionHeader(title: string, yPos: number): number {
    doc.setFillColor(...PALETTE.headerGreen);
    doc.setDrawColor(...PALETTE.lineDark);
    doc.setLineWidth(0.2);
    doc.rect(m, yPos, cw, 3.8, "FD");
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.headerGreenText);
    doc.text(title, m + cw / 2, yPos + 2.6, { align: "center" });
    return yPos + 3.8;
  }

  function drawGridCell(label: string, value: string | undefined, xPos: number, yPos: number, cellW: number, cellH: number, labelW = 0) {
    doc.setDrawColor(...PALETTE.lineDark);
    doc.setLineWidth(0.15);
    doc.setFillColor(...PALETTE.white);
    doc.rect(xPos, yPos, cellW, cellH, "FD");

    if (labelW > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(xPos, yPos, labelW, cellH, "FD");
      doc.setFontSize(5.0);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.textBlack);
      doc.text(label.toUpperCase(), xPos + 1, yPos + cellH / 2 + 1.2);

      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "—"), xPos + labelW + 1.5, yPos + cellH / 2 + 1.2, { maxWidth: cellW - labelW - 2 });
    } else {
      doc.setFontSize(4.6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.textMuted);
      doc.text(label.toUpperCase(), xPos + 1, yPos + 2.4);

      doc.setFontSize(5.6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PALETTE.textBlack);
      doc.text(String(value || "—"), xPos + 1, yPos + cellH - 1.2, { maxWidth: cellW - 2 });
    }
  }

  // =========================================================
  // 1. INFORMACIÓN GENERAL Y TRAZABILIDAD
  // =========================================================
  y = drawSectionHeader("1. INFORMACIÓN GENERAL DE LA INSPECCIÓN Y VEHÍCULO", y);
  const rH = 5.0;

  // Fila 1: UBICACIÓN | PLACA | FECHA | HORA
  const w4 = cw / 4;
  drawGridCell("UBICACIÓN", data.ubicacion || data.sede || "Villagarzón, Putumayo", m, y, w4 * 1.3, rH, 22);
  drawGridCell("PLACA", data.placa, m + w4 * 1.3, y, w4 * 0.7, rH, 14);
  drawGridCell("FECHA", formatDate(data.fecha), m + w4 * 2, y, w4, rH, 14);
  drawGridCell("HORA", formatTime(data.created_at || data.fecha), m + w4 * 3, y, w4, rH, 12);
  y += rH;

  // Fila 2: KILOMETRAJE | COMBUSTIBLE | TIPO VEHÍCULO | TURNO
  drawGridCell("KILOMETRAJE", data.kilometraje ? `${data.kilometraje.toLocaleString("es-CO")} km` : "—", m, y, w4, rH, 22);
  drawGridCell("NIVEL COMBUSTIBLE", data.nivel_combustible ? `${data.nivel_combustible}%` : "—", m + w4, y, w4, rH, 26);
  drawGridCell("TIPO VEHÍCULO", data.vehiculoTipo || "Camioneta", m + w4 * 2, y, w4, rH, 20);
  drawGridCell("TURNO / JORNADA", data.turno || "Día", m + w4 * 3, y, w4, rH, 22);
  y += rH;

  // Fila 3: CONDUCTOR | CÉDULA / LICENCIA | VENCIMIENTO LICENCIA | TELÉFONO
  drawGridCell("CONDUCTOR", data.conductor_nombre || "—", m, y, w4 * 1.4, rH, 22);
  drawGridCell("CÉDULA / LICENCIA", data.conductorLicencia || data.conductor_id || "—", m + w4 * 1.4, y, w4 * 0.9, rH, 26);
  drawGridCell("VENCE LICENCIA", formatDate(data.conductorVencimiento), m + w4 * 2.3, y, w4 * 0.85, rH, 22);
  drawGridCell("TELÉFONO", data.conductorTelefono || "—", m + w4 * 3.15, y, w4 * 0.85, rH, 16);
  y += rH;

  // =========================================================
  // 2. MATRIZ DE CHEQUEO TÉCNICO (7 SECCIONES EN 2 COLUMNAS)
  // =========================================================
  y = drawSectionHeader("2. LISTA DE CHEQUEO TÉCNICO OPERACIONAL (MTO-F-010)", y);

  const colW = (cw - 1.5) / 2;
  const itemRowH = 3.6;

  // Clasificación de las 7 secciones en 2 columnas balanceadas
  const colLeftSections = [
    { key: "parteA", def: PREOPERACIONAL_SECCIONES.parteA, title: "A. PARTE EXTERNA" },
    { key: "parteB", def: PREOPERACIONAL_SECCIONES.parteB, title: "B. PARTE INTERNA" },
    { key: "parteC", def: PREOPERACIONAL_SECCIONES.parteC, title: "C. COMPARTIMIENTO DEL MOTOR" }
  ];

  const colRightSections = [
    { key: "parteD", def: PREOPERACIONAL_SECCIONES.parteD, title: "D. SEGURIDAD ACTIVA / PASIVA" },
    { key: "parteE", def: PREOPERACIONAL_SECCIONES.parteE, title: "E. DISPOSITIVOS ÓPTICOS" },
    { key: "parteF", def: PREOPERACIONAL_SECCIONES.parteF, title: "F. ELEMENTOS PARA EMERGENCIA" },
    { key: "parteG", def: PREOPERACIONAL_SECCIONES.parteG, title: "G. CONDUCTOR / TEST DE FATIGA" }
  ];

  function renderChecklistColumn(sections: typeof colLeftSections, startX: number, startY: number): number {
    let curY = startY;

    sections.forEach((sec) => {
      // Encabezado de la subsección
      doc.setFillColor(240, 240, 240);
      doc.setDrawColor(...PALETTE.lineDark);
      doc.setLineWidth(0.15);
      doc.rect(startX, curY, colW, 3.2, "FD");

      doc.setFontSize(4.8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.textBlack);
      doc.text(sec.title, startX + 1.2, curY + 2.2);

      // Encabezados C / NC / NA
      doc.setFontSize(4.3);
      doc.text("C", startX + colW - 14, curY + 2.2, { align: "center" });
      doc.text("NC", startX + colW - 8.5, curY + 2.2, { align: "center" });
      doc.text("NA", startX + colW - 3, curY + 2.2, { align: "center" });
      curY += 3.2;

      // Ítems de la sección
      sec.def.items.forEach((item) => {
        const val: ValorItemChecklist = (data.checklist?.[item.id] as ValorItemChecklist) || "C";
        const isNC = val === "NC";

        doc.setFillColor(...(isNC ? [255, 235, 235] : PALETTE.white));
        doc.rect(startX, curY, colW, itemRowH, "FD");

        doc.setFontSize(4.2);
        doc.setFont("helvetica", isNC ? "bold" : "normal");
        doc.setTextColor(...(isNC ? [180, 0, 0] : PALETTE.textBlack));
        
        const critMark = item.esCritico ? "*" : "";
        doc.text(`${item.nombre} ${critMark}`, startX + 1, curY + 2.5, { maxWidth: colW - 18 });

        // Casillas C, NC, NA
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.5);
        if (val === "C") {
          doc.setTextColor(...PALETTE.greenText);
          doc.text("X", startX + colW - 14, curY + 2.5, { align: "center" });
        } else if (val === "NC") {
          doc.setTextColor(...PALETTE.redText);
          doc.text("X", startX + colW - 8.5, curY + 2.5, { align: "center" });
        } else {
          doc.setTextColor(...PALETTE.textMuted);
          doc.text("X", startX + colW - 3, curY + 2.5, { align: "center" });
        }

        curY += itemRowH;
      });
    });

    return curY;
  }

  const yLeft = renderChecklistColumn(colLeftSections, m, y);
  const yRight = renderChecklistColumn(colRightSections, m + colW + 1.5, y);
  y = Math.max(yLeft, yRight);

  // =========================================================
  // 3. RESULTADO, HALLAZGOS Y OBSERVACIONES
  // =========================================================
  y = drawSectionHeader("3. EVALUACIÓN DE CONCEPTO TÉCNICO Y HALLAZGOS", y);

  // Barra de Concepto Técnico
  const concepto = data.concepto || (data.apto_para_operar ? "apto" : "no_apto");
  const isApto = concepto === "apto";
  const isAptoObs = concepto === "apto_con_observacion";
  const isNoApto = concepto === "no_apto";

  const bannerBg = isNoApto ? PALETTE.redBg : isAptoObs ? PALETTE.yellowBg : PALETTE.greenBg;
  const bannerText = isNoApto ? PALETTE.redText : isAptoObs ? PALETTE.yellowText : PALETTE.greenText;
  const bannerLabel = isNoApto
    ? "NO APTO PARA OPERAR (VEHÍCULO INMOVILIZADO HASTA CORRECCIÓN)"
    : isAptoObs
    ? "APTO CON OBSERVACIÓN (REQUIERE MONITOREO Y PLAN DE ACCIÓN)"
    : "APTO PARA OPERAR (CONDICIONES TÉCNICO-MECÁNICAS Y DE SEGURIDAD ÓPTIMAS)";

  doc.setFillColor(...bannerBg);
  doc.setDrawColor(...PALETTE.lineDark);
  doc.rect(m, y, cw, 4.5, "FD");
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...bannerText);
  doc.text(`DICTAMEN TÉCNICO: ${bannerLabel}`, m + cw / 2, y + 3.0, { align: "center" });
  y += 4.5;

  // Casilla de Observaciones / Hallazgos
  const obsH = 7.5;
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.lineDark);
  doc.rect(m, y, cw, obsH, "FD");

  doc.setFontSize(4.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text("HALLAZGOS Y OBSERVACIONES:", m + 1.2, y + 2.5);

  doc.setFontSize(5.2);
  doc.setFont("helvetica", "normal");
  const obsText = data.observaciones_generales || data.observaciones || "Sin novedades ni fallas mecánicas reportadas durante la inspección.";
  doc.text(obsText, m + 36, y + 2.5, { maxWidth: cw - 38, maxHeight: obsH - 2 });
  y += obsH;

  // =========================================================
  // 4. CONTROL, SUPERVISIÓN Y FIRMAS OFICIALES
  // =========================================================
  y = drawSectionHeader("4. CONTROL, SUPERVISIÓN Y FIRMAS DE RESPONSABILIDAD", y);

  const sigW = cw / 2;
  const sigH = 14.5;

  // Caja 1: Conductor
  doc.setFillColor(...PALETTE.white);
  doc.rect(m, y, sigW, sigH, "FD");

  if (data.firma_conductor && typeof data.firma_conductor === "string" && data.firma_conductor.startsWith("data:image")) {
    try {
      doc.addImage(data.firma_conductor, "PNG", m + 2, y + 1, sigW - 4, sigH - 7);
    } catch {
      // fallback
    }
  }
  doc.setDrawColor(...PALETTE.lineDark);
  doc.line(m + 4, y + sigH - 5.5, m + sigW - 4, y + sigH - 5.5);

  doc.setFontSize(4.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text("NOMBRE Y FIRMA CONDUCTOR QUE REALIZA LA INSPECCION", m + sigW / 2, y + sigH - 3.2, { align: "center" });
  doc.setFontSize(4.2);
  doc.setFont("helvetica", "normal");
  doc.text(data.conductor_nombre || "Conductor Responsable", m + sigW / 2, y + sigH - 1.2, { align: "center" });

  // Caja 2: Vo.Bo. Supervisor / Ingeniero HS
  doc.setFillColor(...PALETTE.white);
  doc.rect(m + sigW, y, sigW, sigH, "FD");

  if (data.firma_supervisor && typeof data.firma_supervisor === "string" && data.firma_supervisor.startsWith("data:image")) {
    try {
      doc.addImage(data.firma_supervisor, "PNG", m + sigW + 2, y + 1, sigW - 4, sigH - 7);
    } catch {
      // fallback
    }
  }
  doc.setDrawColor(...PALETTE.lineDark);
  doc.line(m + sigW + 4, y + sigH - 5.5, m + cw - 4, y + sigH - 5.5);

  doc.setFontSize(4.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text("Vo.Bo. INGENIERO HS / LyT (SUPERVISOR HSEQ)", m + sigW + sigW / 2, y + sigH - 3.2, { align: "center" });
  doc.setFontSize(4.2);
  doc.setFont("helvetica", "normal");
  doc.text(data.supervisor_nombre || "Trans Services A&B S.A.S.", m + sigW + sigW / 2, y + sigH - 1.2, { align: "center" });
  y += sigH;

  // =========================================================
  // NOTA NORMATIVA Y PIE INSTITUCIONAL
  // =========================================================
  doc.setFillColor(248, 248, 248);
  doc.rect(m, y, cw, 4.5, "FD");
  doc.setFontSize(4.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text("El Supervisor debe verificar diariamente que el formato esté totalmente diligenciado y conforme a la Resolución 40595 de 2022 (PESV).", m + cw / 2, y + 2.8, { align: "center" });
  y += 4.5;

  doc.setFontSize(4.6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textBlack);
  doc.text('"COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B"', m + 2, ph - 2.5);
  doc.setFont("helvetica", "normal");
  doc.text("Villagarzon Putumayo · transserviceshseq.ab@gmail.com", pw / 2, ph - 2.5, { align: "center" });
  doc.text("MTO-F-010 V04", pw - m - 2, ph - 2.5, { align: "right" });

  // =========================================================
  // DESCARGA AUTOMÁTICA DEL PDF
  // =========================================================
  const cleanPlaca = (data.placa || "SIN_PLACA").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cleanFecha = (data.fecha || new Date().toISOString().split("T")[0]).replace(/[^0-9]/g, "");
  const fileName = `MTO-F-010_${cleanPlaca}_${cleanFecha}.pdf`;

  doc.save(fileName);
}
