// lib/utils/pdfLavadoGenerator.ts
// Generador Oficial Corporativo de PDF OP-FOR-02 (Planilla y Comprobantes de Lavado de Flota) para Trans Services A&B S.A.S.
// Formato profesional de alta densidad según normas operativas y de liquidación.

export interface LavadoPdfItem {
  id?: string;
  fecha: string;
  hora: string;
  placa: string;
  tipoVehiculo: string;
  valor: number;
  empresa: string;
  conductorNombre: string;
  conductorDocumento?: string | null;
  firmaUrl?: string | null;
  estadoAprobo?: boolean;
  observaciones?: string | null;
}

const PALETTE = {
  primary: [30, 58, 138] as [number, number, number],       // Azul Institucional #1E3A8A
  primaryDark: [15, 23, 42] as [number, number, number],     // Asphalt 900 #0F172A
  primaryLight: [239, 246, 255] as [number, number, number], // Azul Hielo #EFF6FF
  headerBg: [241, 245, 249] as [number, number, number],     // Slate 100
  textMain: [15, 23, 42] as [number, number, number],        // Slate 900
  textMuted: [71, 85, 105] as [number, number, number],      // Slate 600
  border: [203, 213, 225] as [number, number, number],       // Slate 300
  borderLight: [226, 232, 240] as [number, number, number],  // Slate 200
  bgCard: [248, 250, 252] as [number, number, number],       // Slate 50
  white: [255, 255, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],          // OK Green
  greenBg: [240, 253, 244] as [number, number, number],
  greenBorder: [187, 247, 208] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],          // Warning Amber
  amberBg: [254, 252, 232] as [number, number, number],
  amberBorder: [254, 240, 138] as [number, number, number],
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
      // Intentar siguiente ruta
    }
  }
  return null;
}

const formatCOP = (val: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

// 1. GENERADOR DE PLANILLA CONSOLIDADA MENSUAL (HORIZONTAL CARTA)
export async function generateLavadoPlanillaPDF(records: LavadoPdfItem[], mesTitle: string): Promise<void> {
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

  // Membrete Oficial
  const headerHeight = 20;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, headerHeight, "FD");

  // Col 1: Logo
  const col1Width = 50;
  const logoData = await loadLogoImage();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 4, currentY + 2.5, 42, 15, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PALETTE.primary);
      doc.text("TRANS SERVICES A&B", marginX + col1Width / 2, currentY + 11, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.primary);
    doc.text("TRANS SERVICES A&B", marginX + col1Width / 2, currentY + 11, { align: "center" });
  }

  doc.line(marginX + col1Width, currentY, marginX + col1Width, currentY + headerHeight);

  // Col 2: Título Central
  const col3Width = 48;
  const col2Width = contentWidth - col1Width - col3Width;
  const col2X = marginX + col1Width;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2", col2X + col2Width / 2, currentY + 5.5, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.primary);
  doc.text("PLANILLA DE REGISTRO, CONTROL Y LIQUIDACIÓN DE LAVADOS DE VEHÍCULOS", col2X + col2Width / 2, currentY + 10.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(`Período Liquidado: ${mesTitle} • Control Operativo de Flota y Gestión de Patio`, col2X + col2Width / 2, currentY + 15.5, { align: "center" });

  doc.line(marginX + col1Width + col2Width, currentY, marginX + col1Width + col2Width, currentY + headerHeight);

  // Col 3: Metadatos Documentales
  const col3X = marginX + col1Width + col2Width;
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  const metas = [
    { l: "CÓDIGO:", v: "OP-FOR-02" },
    { l: "VERSIÓN:", v: "03" },
    { l: "FECHA:", v: new Date().toLocaleDateString("es-CO") },
    { l: "TOTAL RECS:", v: String(records.length) },
  ];
  metas.forEach((m, idx) => {
    const rY = currentY + 4 + idx * 4;
    doc.setFont("helvetica", "bold");
    doc.text(m.l, col3X + 2.5, rY);
    doc.setFont("helvetica", "normal");
    doc.text(m.v, col3X + 22, rY);
  });

  currentY += headerHeight + 2.5;

  // Cabecera de la Tabla
  const cols = [
    { title: "#", width: 8, align: "center" },
    { title: "FECHA / HORA", width: 28, align: "center" },
    { title: "PLACA", width: 20, align: "center" },
    { title: "TIPO VEHÍCULO", width: 30, align: "left" },
    { title: "CONDUCTOR / OPERADOR", width: 52, align: "left" },
    { title: "EMPRESA / CONTRATISTA", width: 42, align: "left" },
    { title: "VALOR COP", width: 26, align: "right" },
    { title: "ESTADO", width: 22, align: "center" },
    { title: "FIRMA CONDUCTOR", width: 31.4, align: "center" },
  ];

  const renderTableHeader = (y: number) => {
    doc.setFillColor(...PALETTE.primaryDark);
    doc.rect(marginX, y, contentWidth, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.white);

    let curX = marginX;
    cols.forEach((col) => {
      const textX = col.align === "center" ? curX + col.width / 2 : col.align === "right" ? curX + col.width - 2 : curX + 2;
      doc.text(col.title, textX, y + 3.8, { align: col.align as any });
      curX += col.width;
    });
    return y + 5.5;
  };

  currentY = renderTableHeader(currentY);

  const rowHeight = 9.5;
  let totalValor = 0;

  records.forEach((rec, idx) => {
    // Si excede la página, agregar nueva página con membrete
    if (currentY + rowHeight > pageHeight - 16) {
      doc.addPage("letter", "landscape");
      currentY = 8;
      // Membrete simplificado en páginas siguientes
      doc.setFillColor(...PALETTE.bgCard);
      doc.rect(marginX, currentY, contentWidth, 8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...PALETTE.primary);
      doc.text(`TRANS SERVICES A&B S.A.S. • Planilla de Lavados (${mesTitle}) — Página ${doc.getNumberOfPages()}`, marginX + 4, currentY + 5.5);
      currentY += 10;
      currentY = renderTableHeader(currentY);
    }

    totalValor += rec.valor || 0;
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginX, currentY, contentWidth, rowHeight, "F");
    doc.setDrawColor(...PALETTE.borderLight);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    let curX = marginX;

    // 1. #
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(String(idx + 1), curX + cols[0].width / 2, currentY + 5.5, { align: "center" });
    curX += cols[0].width;

    // 2. Fecha / Hora
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(rec.fecha, curX + cols[1].width / 2, currentY + 4, { align: "center" });
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(rec.hora || "—", curX + cols[1].width / 2, currentY + 7.5, { align: "center" });
    curX += cols[1].width;

    // 3. Placa
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.primary);
    doc.text((rec.placa || "—").toUpperCase(), curX + cols[2].width / 2, currentY + 6, { align: "center" });
    curX += cols[2].width;

    // 4. Tipo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text((rec.tipoVehiculo || "Camioneta").substring(0, 18), curX + 2, currentY + 6);
    curX += cols[3].width;

    // 5. Conductor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text((rec.conductorNombre || "—").substring(0, 32), curX + 2, currentY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(rec.conductorDocumento ? `CC: ${rec.conductorDocumento}` : "", curX + 2, currentY + 7.8);
    curX += cols[4].width;

    // 6. Empresa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.textMain);
    doc.text((rec.empresa || "Trans Services A&B").substring(0, 24), curX + 2, currentY + 6);
    curX += cols[5].width;

    // 7. Valor COP
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.green);
    doc.text(formatCOP(rec.valor || 0), curX + cols[6].width - 2, currentY + 6, { align: "right" });
    curX += cols[6].width;

    // 8. Estado
    const isAppr = Boolean(rec.estadoAprobo);
    doc.setFillColor(...(isAppr ? PALETTE.greenBg : PALETTE.amberBg));
    doc.setDrawColor(...(isAppr ? PALETTE.greenBorder : PALETTE.amberBorder));
    doc.roundedRect(curX + 2, currentY + 2.5, cols[7].width - 4, 4.5, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...(isAppr ? PALETTE.green : PALETTE.amber));
    doc.text(isAppr ? "APROBADO" : "PENDIENTE", curX + cols[7].width / 2, currentY + 5.8, { align: "center" });
    curX += cols[7].width;

    // 9. Firma
    if (rec.firmaUrl && rec.firmaUrl.startsWith("data:image")) {
      try {
        doc.addImage(rec.firmaUrl, "PNG", curX + 3, currentY + 1, cols[8].width - 6, 7.5, undefined, "FAST");
      } catch {
        doc.setFontSize(5);
        doc.setTextColor(...PALETTE.textMuted);
        doc.text("Firma Digital", curX + cols[8].width / 2, currentY + 5.5, { align: "center" });
      }
    } else {
      doc.setFontSize(5);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text("Sin firma", curX + cols[8].width / 2, currentY + 5.5, { align: "center" });
    }

    currentY += rowHeight;
  });

  // Borde exterior de tabla
  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, 8 + headerHeight + 2.5, contentWidth, currentY - (8 + headerHeight + 2.5));

  // Resumen Totalizador al Pie
  const totalBoxY = currentY + 2.5;
  doc.setFillColor(...PALETTE.primaryDark);
  doc.rect(marginX, totalBoxY, contentWidth, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.white);
  doc.text(`RESUMEN LIQUIDACIÓN MENSUAL (${records.length} SERVICIOS):`, marginX + 4, totalBoxY + 4.8);

  doc.setFontSize(8.5);
  doc.text(`TOTAL FACTURADO: ${formatCOP(totalValor)}`, marginX + contentWidth - 4, totalBoxY + 4.8, { align: "right" });

  // Pie de Página
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    `Planilla Oficial OP-FOR-02 v03 • TRANS SERVICES A&B S.A.S. • Generado el ${new Date().toLocaleString("es-CO")}`,
    marginX + contentWidth / 2,
    pageHeight - 4,
    { align: "center" }
  );

  doc.save(`Planilla_Control_Lavadas_${mesTitle || "mes"}.pdf`);
}

// 2. GENERADOR DE COMPROBANTE INDIVIDUAL DE LAVADO (VERTICAL CARTA)
export async function generateLavadoComprobantePDF(record: LavadoPdfItem): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = 14;

  // Membrete
  doc.setDrawColor(...PALETTE.border);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, 22, "FD");

  const logoData = await loadLogoImage();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 4, currentY + 3.5, 38, 15, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("TRANS SERVICES A&B", marginX + 24, currentY + 12);
    }
  }

  doc.line(marginX + 48, currentY, marginX + 48, currentY + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("COMPROBANTE DE CONTROL Y SERVICIO DE LAVADO", marginX + 52 + (contentWidth - 88) / 2, currentY + 7, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.primary);
  doc.text("TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2", marginX + 52 + (contentWidth - 88) / 2, currentY + 12.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("Formato OP-FOR-02 • Control de Patio y Liquidación", marginX + 52 + (contentWidth - 88) / 2, currentY + 17.5, { align: "center" });

  doc.line(marginX + contentWidth - 40, currentY, marginX + contentWidth - 40, currentY + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CÓDIGO: OP-FOR-02", marginX + contentWidth - 38, currentY + 6);
  doc.text("VERSIÓN: 03", marginX + contentWidth - 38, currentY + 11);
  doc.text(`FECHA: ${record.fecha}`, marginX + contentWidth - 38, currentY + 16);

  currentY += 26;

  // Tarjeta de Datos del Servicio
  doc.setFillColor(...PALETTE.bgCard);
  doc.rect(marginX, currentY, contentWidth, 54, "FD");

  doc.setFillColor(...PALETTE.primary);
  doc.rect(marginX, currentY, 3, 54, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.primary);
  doc.text("DETALLES DEL SERVICIO DE LAVADO", marginX + 6, currentY + 6);

  const rowY = currentY + 13;
  const lineH = 7.5;

  const dataFields = [
    { label: "PLACA VEHÍCULO:", val: (record.placa || "—").toUpperCase(), bold: true, color: PALETTE.primary },
    { label: "TIPO VEHÍCULO:", val: record.tipoVehiculo || "Camioneta", bold: false, color: PALETTE.textMain },
    { label: "FECHA / HORA:", val: `${record.fecha} • ${record.hora || "—"}`, bold: false, color: PALETTE.textMain },
    { label: "EMPRESA / CONTRATISTA:", val: record.empresa || "Trans Services A&B", bold: false, color: PALETTE.textMain },
    { label: "CONDUCTOR / OPERADOR:", val: record.conductorNombre || "—", bold: true, color: PALETTE.textMain },
    { label: "CÉDULA CONDUCTOR:", val: record.conductorDocumento || "—", bold: false, color: PALETTE.textMain },
  ];

  dataFields.forEach((df, idx) => {
    const colIdx = idx % 2;
    const rowIdx = Math.floor(idx / 2);
    const startX = colIdx === 0 ? marginX + 6 : marginX + contentWidth / 2 + 2;
    const yPos = rowY + rowIdx * lineH;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(df.label, startX, yPos);

    doc.setFont("helvetica", df.bold ? "bold" : "normal");
    doc.setFontSize(df.bold ? 8 : 7.5);
    doc.setTextColor(...df.color);
    doc.text(df.val, startX + 38, yPos);
  });

  currentY += 58;

  // Cuadro de Liquidación
  doc.setFillColor(...PALETTE.primaryDark);
  doc.rect(marginX, currentY, contentWidth, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.white);
  doc.text("VALOR TOTAL DEL SERVICIO LIQUIDADO:", marginX + 6, currentY + 9);

  doc.setFontSize(11);
  doc.text(formatCOP(record.valor || 0), marginX + contentWidth - 6, currentY + 9.5, { align: "right" });

  currentY += 18;

  // Observaciones
  doc.setFillColor(...PALETTE.bgCard);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, currentY, contentWidth, 20, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("OBSERVACIONES / NOTAS DE SERVICIO:", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(record.observaciones || "Servicio de lavado completado a satisfacción del conductor.", marginX + 4, currentY + 11);

  currentY += 24;

  // Firmas
  const sigW = (contentWidth - 6) / 2;
  const sigH = 34;

  // Conductor
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.border);
  doc.roundedRect(marginX, currentY, sigW, sigH, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(marginX, currentY, sigW, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("FIRMA DE CONFORMIDAD CONDUCTOR", marginX + sigW / 2, currentY + 3.5, { align: "center" });

  if (record.firmaUrl && record.firmaUrl.startsWith("data:image")) {
    try {
      doc.addImage(record.firmaUrl, "PNG", marginX + sigW / 2 - 24, currentY + 7, 48, 16, undefined, "FAST");
    } catch {}
  }

  doc.line(marginX + 10, currentY + 24, marginX + sigW - 10, currentY + 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(record.conductorNombre || "CONDUCTOR", marginX + sigW / 2, currentY + 28, { align: "center" });

  // Aprobación Patio / HSEQ
  const sig2X = marginX + sigW + 6;
  doc.setFillColor(...PALETTE.white);
  doc.roundedRect(sig2X, currentY, sigW, sigH, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(sig2X, currentY, sigW, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("VERIFICACIÓN DE PATIO / OPERACIONES", sig2X + sigW / 2, currentY + 3.5, { align: "center" });

  const isApproved = Boolean(record.estadoAprobo);
  doc.setFillColor(...(isApproved ? PALETTE.greenBg : PALETTE.amberBg));
  doc.setDrawColor(...(isApproved ? PALETTE.greenBorder : PALETTE.amberBorder));
  doc.roundedRect(sig2X + sigW / 2 - 28, currentY + 9, 56, 11, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...(isApproved ? PALETTE.green : PALETTE.amber));
  doc.text(isApproved ? "✓ APROBADO EN ERP" : "REGISTRO DE PATIO", sig2X + sigW / 2, currentY + 15, { align: "center" });

  doc.line(sig2X + 10, currentY + 24, sig2X + sigW - 10, currentY + 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("OPERACIONES TRANS SERVICES A&B", sig2X + sigW / 2, currentY + 28, { align: "center" });

  doc.save(`Comprobante_Lavado_${(record.placa || "VEHICULO").toUpperCase()}_${record.fecha}.pdf`);
}
