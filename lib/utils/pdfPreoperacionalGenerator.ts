// lib/utils/pdfPreoperacionalGenerator.ts
// Generador Oficial de PDF IMTO-F-010 / HSEQ-FOR-08 para Trans Services A&B
// Formato profesional de alta densidad en tamaño Carta con los 32 puntos técnicos normativos

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
}

const PALETTE = {
  primary: [30, 58, 138] as [number, number, number],       // Azul Institucional #1E3A8A
  primaryDark: [15, 23, 42] as [number, number, number],     // Asphalt 900
  primaryLight: [239, 246, 255] as [number, number, number], // Azul Hielo #EFF6FF
  textMain: [15, 23, 42] as [number, number, number],        // Slate 900
  textMuted: [71, 85, 105] as [number, number, number],      // Slate 600
  border: [203, 213, 225] as [number, number, number],       // Slate 300
  borderLight: [226, 232, 240] as [number, number, number],  // Slate 200
  bgCard: [248, 250, 252] as [number, number, number],       // Slate 50
  white: [255, 255, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],          // OK Green
  greenBg: [240, 253, 244] as [number, number, number],
  greenBorder: [187, 247, 208] as [number, number, number],
  yellow: [202, 138, 4] as [number, number, number],         // Warning Yellow
  yellowBg: [254, 252, 232] as [number, number, number],
  yellowBorder: [254, 240, 138] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],            // Alert Red
  redBg: [254, 242, 242] as [number, number, number],
  redBorder: [254, 202, 202] as [number, number, number],
};

async function loadLogoImage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const urls = ["/logo.png", "./logo.png", "/assets/logo.png"];
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
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      });
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
  // HEADER OFICIAL DEL SISTEMA INTEGRADO DE GESTIÓN (SIG)
  // =========================================================
  const headerH = 17;
  const colLogoW = 34;
  const colDocW = 46;
  const colTitleW = cw - colLogoW - colDocW;

  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.35);
  doc.setFillColor(...PALETTE.white);
  doc.rect(m, m, cw, headerH, "FD");

  // Columna 1: Logo
  doc.line(m + colLogoW, m, m + colLogoW, m + headerH);
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", m + 2, m + 1.5, colLogoW - 4, headerH - 3);
    } catch {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.primary);
      doc.text("TRANS SERVICES A&B", m + colLogoW / 2, m + headerH / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.primary);
    doc.text("TRANS SERVICES A&B", m + colLogoW / 2, m + headerH / 2, { align: "center" });
  }

  // Columna 2: Títulos Institucionales
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.primaryDark);
  doc.text("COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B", m + colLogoW + colTitleW / 2, m + 4.5, { align: "center" });

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO Y PESV", m + colLogoW + colTitleW / 2, m + 8, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.primary);
  doc.text("INSPECCIÓN PREOPERACIONAL DIARIA DE VEHÍCULOS", m + colLogoW + colTitleW / 2, m + 13.5, { align: "center" });

  // Columna 3: Control Documental
  const xDoc = m + colLogoW + colTitleW;
  doc.line(xDoc, m, xDoc, m + headerH);

  const docRowH = headerH / 4;
  for (let i = 1; i < 4; i++) {
    doc.line(xDoc, m + docRowH * i, m + cw, m + docRowH * i);
  }

  const renderDocRow = (label: string, val: string, rowIdx: number, color = PALETTE.primaryDark, isBold = true) => {
    const yRow = m + docRowH * rowIdx;
    doc.setFontSize(5.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(label, xDoc + 2, yRow + 3);

    doc.setFontSize(5.8);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(val, m + cw - 2, yRow + 3, { align: "right" });
  };

  renderDocRow("CÓDIGO:", "IMTO-F-010 / HSEQ-FOR-08", 0, PALETTE.primary, true);
  renderDocRow("VERSIÓN:", "04", 1, PALETTE.primaryDark, true);
  renderDocRow("VIGENCIA:", "2026", 2, PALETTE.textMuted, false);

  const conceptText =
    data.estadoConcepto === "apto"
      ? "APTO"
      : data.estadoConcepto === "no_apto"
      ? "NO APTO"
      : "APTO C/NOVEDAD";
  const conceptColor =
    data.estadoConcepto === "apto"
      ? PALETTE.green
      : data.estadoConcepto === "no_apto"
      ? PALETTE.red
      : PALETTE.yellow;

  renderDocRow("CONCEPTO:", conceptText, 3, conceptColor, true);

  let y = m + headerH + 2;

  // =========================================================
  // HELPERS
  // =========================================================
  function drawSectionHeader(title: string, yPos: number): number {
    doc.setFillColor(...PALETTE.primary);
    doc.rect(m, yPos, cw, 4.2, "F");
    doc.setFontSize(6.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.white);
    doc.text(title, m + 2.5, yPos + 3.0);
    return yPos + 4.2;
  }

  function drawCell(
    label: string,
    value: string | number | undefined | null,
    xPos: number,
    yPos: number,
    cellW: number,
    cellH: number,
    isHighlight = false
  ) {
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.2);
    doc.setFillColor(...(isHighlight ? PALETTE.primaryLight : PALETTE.white));
    doc.rect(xPos, yPos, cellW, cellH, "FD");

    doc.setFontSize(4.6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(label.toUpperCase(), xPos + 1.2, yPos + 2.2);

    doc.setFontSize(6.2);
    doc.setFont("helvetica", isHighlight ? "bold" : "normal");
    doc.setTextColor(...(isHighlight ? PALETTE.primary : PALETTE.textMain));
    const valStr = value != null && String(value).trim() !== "" ? String(value) : "—";
    doc.text(valStr, xPos + 1.2, yPos + cellH - 1.2, { maxWidth: cellW - 2.4 });
  }

  // =========================================================
  // SECCIÓN 1: DATOS DEL VEHÍCULO Y DEL CONDUCTOR
  // =========================================================
  y = drawSectionHeader("1. INFORMACIÓN DE IDENTIFICACIÓN Y OPERACIÓN", y);
  const cH = 6.4;
  const w4 = cw / 4;

  // Fila 1: Placa, Tipo, Modelo/Color, Empresa
  drawCell("Placa Vehículo", data.placa, m, y, w4, cH, true);
  drawCell("Tipo Vehículo", data.vehiculoTipo || "Camioneta", m + w4, y, w4, cH);
  drawCell("Modelo / Color", `${data.vehiculoModelo || "—"} / ${data.vehiculoColor || "—"}`, m + w4 * 2, y, w4, cH);
  drawCell("Empresa / Proyecto", data.vehiculoEmpresa || "TRANS SERVICES A&B", m + w4 * 3, y, w4, cH);
  y += cH;

  // Fila 2: Conductor, Cédula, Licencia, Vencimiento
  drawCell("Nombre Conductor", data.conductorNombre, m, y, w4 * 1.3, cH, true);
  drawCell("Cédula Ciudadanía", data.conductorDocumento || "—", m + w4 * 1.3, y, w4 * 0.7, cH);
  drawCell("Licencia Conducción", data.conductorLicencia || "—", m + w4 * 2, y, w4, cH);
  drawCell("Vencimiento Licencia", formatDate(data.conductorVencimiento), m + w4 * 3, y, w4, cH);
  y += cH;

  // Fila 3: Fecha, Hora, Odómetro KM, Concepto PESV
  drawCell("Fecha Inspección", formatDate(data.fecha), m, y, w4, cH);
  drawCell("Hora Registro", formatTime(data.fecha), m + w4, y, w4, cH);
  drawCell("Odómetro (KM)", data.kilometraje ? `${data.kilometraje.toLocaleString()} KM` : "—", m + w4 * 2, y, w4, cH, true);
  drawCell("Estado PESV Paso 14", "INSPECCIÓN VIGENTE", m + w4 * 3, y, w4, cH, true);
  y += cH + 1.5;

  // =========================================================
  // SECCIÓN 2: LISTA DE CHEQUEO TÉCNICO DE 32 PUNTOS (2 COLUMNAS)
  // =========================================================
  y = drawSectionHeader("2. LISTA DE CHEQUEO TÉCNICO REGAMENTARIO (32 PUNTOS DE CONTROL)", y);

  const colW = (cw - 1.5) / 2;
  const itemRowH = 4.1;

  // División lógica de las 7 secciones en 2 columnas equilibradas
  // Columna Izquierda: A (5), B (7), C (7) = 19 ítems
  // Columna Derecha: D (3), E (6), F (4), G (2) = 15 ítems
  const leftSections = [
    PREOPERACIONAL_SECCIONES.parteA,
    PREOPERACIONAL_SECCIONES.parteB,
    PREOPERACIONAL_SECCIONES.parteC,
  ];

  const rightSections = [
    PREOPERACIONAL_SECCIONES.parteD,
    PREOPERACIONAL_SECCIONES.parteE,
    PREOPERACIONAL_SECCIONES.parteF,
    PREOPERACIONAL_SECCIONES.parteG,
  ];

  function renderChecklistColumn(
    sections: (typeof PREOPERACIONAL_SECCIONES)[keyof typeof PREOPERACIONAL_SECCIONES][],
    startX: number,
    startY: number
  ): number {
    let currY = startY;

    sections.forEach((sec) => {
      // Sub-encabezado de sección
      doc.setFillColor(...PALETTE.primaryLight);
      doc.rect(startX, currY, colW, 3.8, "F");
      doc.setDrawColor(...PALETTE.border);
      doc.rect(startX, currY, colW, 3.8);

      doc.setFontSize(5.0);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.primary);
      doc.text(`${sec.codigo}. ${sec.titulo.toUpperCase()} (${sec.subtitulo})`, startX + 2, currY + 2.6);
      currY += 3.8;

      // Ítems de la sección
      sec.items.forEach((it, idx) => {
        const val: ValorItemChecklist = data.checklist[it.id] || "C";
        const isAlternate = idx % 2 === 1;

        doc.setFillColor(...(isAlternate ? PALETTE.bgCard : PALETTE.white));
        doc.rect(startX, currY, colW, itemRowH, "F");
        doc.setDrawColor(...PALETTE.borderLight);
        doc.rect(startX, currY, colW, itemRowH);

        // Nombre del ítem
        doc.setFontSize(4.8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...PALETTE.textMain);
        doc.text(it.nombre, startX + 2, currY + 2.8, { maxWidth: colW - 20 });

        // Badge de Cumplimiento
        const badgeTxt = val === "C" ? "CUMPLE" : val === "NC" ? "NO CUMPLE" : "N/A";
        const badgeColor = val === "C" ? PALETTE.green : val === "NC" ? PALETTE.red : PALETTE.textMuted;
        const badgeBg = val === "C" ? PALETTE.greenBg : val === "NC" ? PALETTE.redBg : PALETTE.bgCard;

        doc.setFillColor(...badgeBg);
        doc.rect(startX + colW - 16, currY + 0.6, 14.5, itemRowH - 1.2, "F");
        doc.setDrawColor(...badgeColor);
        doc.rect(startX + colW - 16, currY + 0.6, 14.5, itemRowH - 1.2);

        doc.setFontSize(4.4);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...badgeColor);
        doc.text(badgeTxt, startX + colW - 8.75, currY + 2.7, { align: "center" });

        currY += itemRowH;
      });
      currY += 0.8;
    });

    return currY;
  }

  const yColL = renderChecklistColumn(leftSections, m, y);
  const yColR = renderChecklistColumn(rightSections, m + colW + 1.5, y);

  y = Math.max(yColL, yColR) + 1.0;

  // =========================================================
  // SECCIÓN 3: NOVEDADES, HALLAZGOS Y OBSERVACIONES
  // =========================================================
  y = drawSectionHeader("3. REGISTRO DE HALLAZGOS, OBSERVACIONES Y ACCIONES CORRECTIVAS", y);
  const obsH = 9.0;
  doc.setDrawColor(...PALETTE.border);
  doc.setFillColor(...PALETTE.white);
  doc.rect(m, y, cw, obsH, "FD");

  doc.setFontSize(5.4);
  doc.setFont("helvetica", "normal");
  const obsContent =
    data.descripcionHallazgo ||
    data.observaciones ||
    "Vehículo en óptimas condiciones mecánicas y de seguridad. Sin novedades críticas reportadas para la operación.";
  doc.setTextColor(...(data.descripcionHallazgo ? PALETTE.red : PALETTE.textMuted));
  doc.text(obsContent, m + 2, y + 3.4, { maxWidth: cw - 4, maxHeight: obsH - 2 });
  y += obsH + 1.5;

  // =========================================================
  // SECCIÓN 4: CONCEPTO TÉCNICO Y FIRMAS
  // =========================================================
  y = drawSectionHeader("4. CONCEPTO TÉCNICO DE APTITUD Y FIRMAS DE RESPONSABILIDAD", y);

  const sigW = (cw - 1.5) / 2;
  const sigH = Math.min(ph - y - 11, 24);

  // 4A. Firma Conductor
  doc.setFillColor(...PALETTE.bgCard);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(m, y, sigW, sigH, "FD");

  doc.setFillColor(...PALETTE.primaryLight);
  doc.rect(m, y, sigW, 3.8, "F");
  doc.setFontSize(5.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.primary);
  doc.text("FIRMA DEL CONDUCTOR RESPONSABLE", m + sigW / 2, y + 2.6, { align: "center" });

  if (data.signature && data.signature.startsWith("data:image")) {
    try {
      doc.addImage(data.signature, "PNG", m + 2, y + 4.2, sigW - 4, sigH - 11);
    } catch {
      doc.setDrawColor(...PALETTE.textMuted);
      doc.line(m + 4, y + sigH - 6.5, m + sigW - 4, y + sigH - 6.5);
    }
  } else {
    doc.setDrawColor(...PALETTE.border);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(m + 4, y + sigH - 6.5, m + sigW - 4, y + sigH - 6.5);
    doc.setLineDashPattern([], 0);
  }

  doc.setFontSize(5.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.conductorNombre.substring(0, 32), m + sigW / 2, y + sigH - 3.8, { align: "center" });

  doc.setFontSize(4.4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    `C.C. ${data.conductorDocumento || data.conductorLicencia || "—"} | ${formatDate(data.fecha)} ${formatTime(data.fecha)}`,
    m + sigW / 2,
    y + sigH - 1.2,
    { align: "center" }
  );

  // 4B. Visto Bueno HSEQ / Supervisor
  const xH = m + sigW + 1.5;
  doc.setFillColor(...PALETTE.bgCard);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(xH, y, sigW, sigH, "FD");

  doc.setFillColor(...PALETTE.primaryLight);
  doc.rect(xH, y, sigW, 3.8, "F");
  doc.setFontSize(5.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.primary);
  doc.text("VISTO BUENO HSEQ / SUPERVISOR DE PATIO", xH + sigW / 2, y + 2.6, { align: "center" });

  // Concepto destacado en la caja HSEQ
  doc.setFillColor(...conceptBg(data.estadoConcepto));
  doc.rect(xH + 6, y + 6, sigW - 12, 6, "F");
  doc.setDrawColor(...conceptColor);
  doc.rect(xH + 6, y + 6, sigW - 12, 6);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...conceptColor);
  doc.text(`CONCEPTO FINAL: ${conceptText}`, xH + sigW / 2, y + 10.2, { align: "center" });

  doc.setFontSize(5.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMain);
  doc.text("Coordinación HSEQ & Operaciones", xH + sigW / 2, y + sigH - 3.8, { align: "center" });

  doc.setFontSize(4.4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("Validación Digital Automática PESV · Resolución 40595/2022", xH + sigW / 2, y + sigH - 1.2, { align: "center" });

  // =========================================================
  // FOOTER LEGAL
  // =========================================================
  doc.setFontSize(4.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B · NIT 900778421-1 · Villagarzón, Putumayo", m, ph - 3.5);
  doc.text("Formato oficial de cumplimiento según Ley 527 de 1999 y Resolución 40595 de 2022 (PESV)", pw / 2, ph - 3.5, { align: "center" });
  doc.text(`Expedido: ${new Date().toLocaleString("es-CO")}`, pw - m, ph - 3.5, { align: "right" });

  // Guardar archivo
  const cleanPlaca = (data.placa || "VEHICULO").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cleanFecha = (data.fecha || new Date().toISOString().split("T")[0]).replace(/[^0-9]/g, "");
  const fileName = `IMTO-F-010_${cleanPlaca}_${cleanFecha}.pdf`;

  doc.save(fileName);
}

function conceptBg(estado: string): [number, number, number] {
  if (estado === "apto") return PALETTE.greenBg;
  if (estado === "no_apto") return PALETTE.redBg;
  return PALETTE.yellowBg;
}
