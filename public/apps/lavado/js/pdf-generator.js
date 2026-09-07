// public/apps/lavado/js/pdf-generator.js
// Generador Oficial Corporativo de PDF OP-FOR-02 (Planilla y Comprobantes de Lavado) para Trans Services A&B S.A.S.

const PALETTE = {
  primary: [30, 58, 138],       // Azul Institucional #1E3A8A
  primaryDark: [15, 23, 42],     // Asphalt 900 #0F172A
  primaryLight: [239, 246, 255], // Azul Hielo #EFF6FF
  headerBg: [241, 245, 249],     // Slate 100
  textMain: [15, 23, 42],        // Slate 900
  textMuted: [71, 85, 105],      // Slate 600
  border: [203, 213, 225],       // Slate 300
  borderLight: [226, 232, 240],  // Slate 200
  bgCard: [248, 250, 252],       // Slate 50
  white: [255, 255, 255],
  green: [22, 163, 74],          // OK Green
  greenBg: [240, 253, 244],
  greenBorder: [187, 247, 208],
  amber: [217, 119, 6],          // Warning Amber
  amberBg: [254, 252, 232],
  amberBorder: [254, 240, 138],
};

async function loadLogo() {
  const paths = [
    "/brand/logo.png",
    "/logo.png",
    "assets/logo.png",
    "./assets/logo.png",
    "../shared/logo.png"
  ];
  for (const path of paths) {
    try {
      const resp = await fetch(path);
      if (resp.ok) {
        const blob = await resp.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {}
  }
  return null;
}

const formatCOP = (val) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

// 1. PLANILLA CONSOLIDADA MENSUAL
async function generateLavadoPlanillaReport(records, mesTitle) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Cargando librería de generación PDF, por favor intente en un segundo.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = 279.4;
  const pageHeight = 215.9;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = 8;

  // Membrete Oficial
  const headerHeight = 20;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, headerHeight, "FD");

  // Logo
  const col1Width = 50;
  const logoData = await loadLogo();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 4, currentY + 2.5, 42, 15, undefined, "FAST");
    } catch (err) {
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

  // Título
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
  doc.text(`Período Liquidado: ${mesTitle || "Mes en curso"} • Control Operativo de Flota y Gestión de Patio`, col2X + col2Width / 2, currentY + 15.5, { align: "center" });

  doc.line(marginX + col1Width + col2Width, currentY, marginX + col1Width + col2Width, currentY + headerHeight);

  // Metadatos
  const col3X = marginX + col1Width + col2Width;
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  const metas = [
    { l: "CÓDIGO:", v: "OP-FOR-02" },
    { l: "VERSIÓN:", v: "03" },
    { l: "FECHA:", v: new Date().toLocaleDateString("es-CO") },
    { l: "TOTAL RECS:", v: String((records || []).length) },
  ];
  metas.forEach((m, idx) => {
    const rY = currentY + 4 + idx * 4;
    doc.setFont("helvetica", "bold");
    doc.text(m.l, col3X + 2.5, rY);
    doc.setFont("helvetica", "normal");
    doc.text(m.v, col3X + 22, rY);
  });

  currentY += headerHeight + 2.5;

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

  const renderTableHeader = (y) => {
    doc.setFillColor(...PALETTE.primaryDark);
    doc.rect(marginX, y, contentWidth, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.white);

    let curX = marginX;
    cols.forEach((col) => {
      const textX = col.align === "center" ? curX + col.width / 2 : col.align === "right" ? curX + col.width - 2 : curX + 2;
      doc.text(col.title, textX, y + 3.8, { align: col.align });
      curX += col.width;
    });
    return y + 5.5;
  };

  currentY = renderTableHeader(currentY);

  const rowHeight = 9.5;
  let totalValor = 0;

  (records || []).forEach((rec, idx) => {
    if (currentY + rowHeight > pageHeight - 16) {
      doc.addPage("letter", "landscape");
      currentY = 8;
      doc.setFillColor(...PALETTE.bgCard);
      doc.rect(marginX, currentY, contentWidth, 8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...PALETTE.primary);
      doc.text(`TRANS SERVICES A&B S.A.S. • Planilla de Lavados (${mesTitle || ""}) — Página ${doc.getNumberOfPages()}`, marginX + 4, currentY + 5.5);
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

    // #
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(String(idx + 1), curX + cols[0].width / 2, currentY + 5.5, { align: "center" });
    curX += cols[0].width;

    // Fecha / Hora
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(rec.fecha, curX + cols[1].width / 2, currentY + 4, { align: "center" });
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(rec.hora || "—", curX + cols[1].width / 2, currentY + 7.5, { align: "center" });
    curX += cols[1].width;

    // Placa
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.primary);
    doc.text((rec.placa || "—").toUpperCase(), curX + cols[2].width / 2, currentY + 6, { align: "center" });
    curX += cols[2].width;

    // Tipo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text((rec.tipoVehiculo || rec.tipo_vehiculo || "Camioneta").substring(0, 18), curX + 2, currentY + 6);
    curX += cols[3].width;

    // Conductor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text((rec.conductorNombre || rec.conductor || "—").substring(0, 32), curX + 2, currentY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(rec.conductorDocumento ? `CC: ${rec.conductorDocumento}` : "", curX + 2, currentY + 7.8);
    curX += cols[4].width;

    // Empresa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.textMain);
    doc.text((rec.empresa || "Trans Services A&B").substring(0, 24), curX + 2, currentY + 6);
    curX += cols[5].width;

    // Valor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.green);
    doc.text(formatCOP(rec.valor || 0), curX + cols[6].width - 2, currentY + 6, { align: "right" });
    curX += cols[6].width;

    // Estado
    const isAppr = Boolean(rec.estadoAprobo);
    doc.setFillColor(...(isAppr ? PALETTE.greenBg : PALETTE.amberBg));
    doc.setDrawColor(...(isAppr ? PALETTE.greenBorder : PALETTE.amberBorder));
    doc.roundedRect(curX + 2, currentY + 2.5, cols[7].width - 4, 4.5, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...(isAppr ? PALETTE.green : PALETTE.amber));
    doc.text(isAppr ? "APROBADO" : "PENDIENTE", curX + cols[7].width / 2, currentY + 5.8, { align: "center" });
    curX += cols[7].width;

    // Firma
    const sigSrc = rec.firmaUrl || rec.firma_img;
    if (sigSrc && sigSrc.startsWith("data:image")) {
      try {
        doc.addImage(sigSrc, "PNG", curX + 3, currentY + 1, cols[8].width - 6, 7.5, undefined, "FAST");
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

  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, 8 + headerHeight + 2.5, contentWidth, currentY - (8 + headerHeight + 2.5));

  // Totalizador
  const totalBoxY = currentY + 2.5;
  doc.setFillColor(...PALETTE.primaryDark);
  doc.rect(marginX, totalBoxY, contentWidth, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.white);
  doc.text(`RESUMEN LIQUIDACIÓN MENSUAL (${(records || []).length} SERVICIOS):`, marginX + 4, totalBoxY + 4.8);

  doc.setFontSize(8.5);
  doc.text(`TOTAL FACTURADO: ${formatCOP(totalValor)}`, marginX + contentWidth - 4, totalBoxY + 4.8, { align: "right" });

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

window.generateLavadoPlanillaReport = generateLavadoPlanillaReport;
