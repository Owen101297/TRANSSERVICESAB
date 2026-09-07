// public/apps/extintor/js/pdf-generator.js
// Generador Oficial Corporativo de PDF HSEQ-F-034 (Inspección Periódica de Extintores) para Trans Services A&B S.A.S.
// Formato profesional de alta densidad en tamaño Carta (1 página) según NTC 2885, NFPA 10 y PESV.

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
  red: [220, 38, 38],            // Alert Red
  redBg: [254, 242, 242],
  redBorder: [254, 202, 202],
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
    } catch (e) {
      // Ignorar e intentar siguiente
    }
  }
  return null;
}

async function generateExtintorPDFReport(data) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Cargando librería de generación PDF, por favor intente nuevamente en un segundo.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginX = 9;
  const contentWidth = pageWidth - marginX * 2; // 197.9 mm
  let currentY = 8;

  // 1. MEMBRETE OFICIAL SIG
  const headerHeight = 20;
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, headerHeight, "FD");

  // Columna 1: Logo
  const col1Width = 42;
  const logoData = await loadLogo();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 3, currentY + 2.5, 36, 15, undefined, "FAST");
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

  // Divisor 1
  doc.line(marginX + col1Width, currentY, marginX + col1Width, currentY + headerHeight);

  // Columna 2: Título Central
  const col2Width = contentWidth - col1Width - 44;
  const col2X = marginX + col1Width;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO Y PESV", col2X + col2Width / 2, currentY + 5.5, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.primary);
  doc.text("FORMATO DE INSPECCIÓN PERIÓDICA DE EXTINTORES VEHICULARES", col2X + col2Width / 2, currentY + 10.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("Normas NTC 2885 / NFPA 10 • Dec. 1072/2015 • Res. 40595/2022 (PESV)", col2X + col2Width / 2, currentY + 15.5, { align: "center" });

  // Divisor 2
  doc.line(marginX + col1Width + col2Width, currentY, marginX + col1Width + col2Width, currentY + headerHeight);

  // Columna 3: Control Documental
  const col3X = marginX + col1Width + col2Width;
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  
  const rightMeta = [
    { label: "CÓDIGO:", val: "HSEQ-F-034" },
    { label: "VERSIÓN:", val: "03" },
    { label: "VIGENCIA:", val: "2026" },
    { label: "PÁGINA:", val: "1 de 1" },
  ];

  rightMeta.forEach((m, idx) => {
    const rowY = currentY + 4 + idx * 4;
    doc.setFont("helvetica", "bold");
    doc.text(m.label, col3X + 2.5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(m.val, col3X + 20, rowY);
  });

  currentY += headerHeight + 2.5;

  // 2. BLOQUE DE METADATOS Y FICHA TÉCNICA
  const metaBoxHeight = 25;
  doc.setFillColor(...PALETTE.bgCard);
  doc.rect(marginX, currentY, contentWidth, metaBoxHeight, "FD");

  doc.setFillColor(...PALETTE.primary);
  doc.rect(marginX, currentY, 2, metaBoxHeight, "F");

  const metaColW = (contentWidth - 4) / 3;
  const metaY1 = currentY + 4.5;
  const metaLineH = 4.5;

  // Col 1: Datos Vehículo y Conductor
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("PLACA VEHÍCULO:", marginX + 4, metaY1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.primary);
  doc.setFontSize(8.5);
  doc.text((data.placa || "—").toUpperCase(), marginX + 32, metaY1);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TIPO VEHÍCULO:", marginX + 4, metaY1 + metaLineH);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.tipoVehiculo || "Camioneta", marginX + 32, metaY1 + metaLineH);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CONDUCTOR:", marginX + 4, metaY1 + metaLineH * 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text((data.conductorNombre || "—").substring(0, 26), marginX + 32, metaY1 + metaLineH * 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CÉDULA / DOC:", marginX + 4, metaY1 + metaLineH * 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.conductorDocumento || "—", marginX + 32, metaY1 + metaLineH * 3);

  // Col 2: Ficha Técnica del Extintor
  const col2DataX = marginX + metaColW + 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TIPO AGENTE:", col2DataX, metaY1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.tipoExtintor || "ABC Polvo Químico Seco", col2DataX + 32, metaY1);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CAPACIDAD:", col2DataX, metaY1 + metaLineH);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.capacidad || "10 lbs", col2DataX + 32, metaY1 + metaLineH);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("PRÓX. VENCIMIENTO:", col2DataX, metaY1 + metaLineH * 2);
  doc.setFont("helvetica", "bold");
  const vencRecarga = data.fechaVencimientoRecarga || "—";
  const todayStr = new Date().toISOString().split("T")[0];
  if (vencRecarga !== "—" && vencRecarga <= todayStr) {
    doc.setTextColor(...PALETTE.red);
  } else {
    doc.setTextColor(...PALETTE.textMain);
  }
  doc.text(vencRecarga, col2DataX + 32, metaY1 + metaLineH * 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("MANÓMETRO / PRESIÓN:", col2DataX, metaY1 + metaLineH * 3);
  const presion = (data.presionManometro || "OPERATIVO").toUpperCase();
  if (presion.includes("OPERATIVA") || presion.includes("OPERATIVO")) {
    doc.setTextColor(...PALETTE.green);
  } else if (presion.includes("SOBREPRESIÓN") || presion.includes("ALTA")) {
    doc.setTextColor(...PALETTE.amber);
  } else {
    doc.setTextColor(...PALETTE.red);
  }
  doc.setFont("helvetica", "bold");
  doc.text(presion, col2DataX + 32, metaY1 + metaLineH * 3);

  // Col 3: Concepto HSEQ Badge
  const col3DataX = marginX + metaColW * 2 + 6;
  const isConforme = Boolean(data.conforme);

  doc.setFillColor(...(isConforme ? PALETTE.greenBg : PALETTE.redBg));
  doc.setDrawColor(...(isConforme ? PALETTE.greenBorder : PALETTE.redBorder));
  doc.roundedRect(col3DataX, currentY + 3, metaColW - 10, metaBoxHeight - 6, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CONCEPTO HSEQ", col3DataX + (metaColW - 10) / 2, currentY + 8, { align: "center" });

  doc.setFontSize(9.5);
  doc.setTextColor(...(isConforme ? PALETTE.green : PALETTE.red));
  doc.text(isConforme ? "APTO / OPERATIVO" : "NO CONFORME", col3DataX + (metaColW - 10) / 2, currentY + 14, { align: "center" });

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(`Fecha: ${data.fecha || "—"} • ${data.hora || ""}`, col3DataX + (metaColW - 10) / 2, currentY + 19, { align: "center" });

  currentY += metaBoxHeight + 2.5;

  // 3. TABLA DE 10 CRITERIOS TÉCNICOS OFICIALES (HSEQ-F-034)
  const CRITERIOS_BASE = [
    { id: 1, item: "Ubicación en lugar visible, señalizado y de fácil acceso (soporte o abrazadera ajustada)" },
    { id: 2, item: "Manómetro de presión en rango operativo (aguja indicadora en zona verde)" },
    { id: 3, item: "Pasador de seguridad metálico y precinto/sello plástico de garantía intacto" },
    { id: 4, item: "Manguera, boquilla o corneta de descarga sin roturas, grietas ni obstrucciones" },
    { id: 5, item: "Cilindro sin abolladuras, golpes, fisuras ni signos de corrosión u oxidación" },
    { id: 6, item: "Etiqueta e instrucciones de operación totalmente legibles en español" },
    { id: 7, item: "Calcomanía de fecha de última recarga y próximo vencimiento vigente" },
    { id: 8, item: "Capacidad y tipo de agente extintor acorde a la reglamentación del vehículo" },
    { id: 9, item: "Tarjeta de control de inspección mensual adherida y al día" },
    { id: 10, item: "Peso reglamentario verificado y agente sin apelmazamiento" },
  ];

  const checklist = Array.isArray(data.checklist) ? data.checklist : [];

  // Encabezado de la Tabla
  doc.setFillColor(...PALETTE.primaryDark);
  doc.rect(marginX, currentY, contentWidth, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.white);
  doc.text("CRITERIOS DE INSPECCIÓN Y VERIFICACIÓN TÉCNICA (NTC 2885 / NFPA 10)", marginX + 3, currentY + 3.8);

  currentY += 5.5;

  // Sub-encabezados de columnas
  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(marginX, currentY, contentWidth, 4.5, "F");
  doc.setDrawColor(...PALETTE.border);
  doc.line(marginX, currentY + 4.5, marginX + contentWidth, currentY + 4.5);

  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("#", marginX + 3, currentY + 3.2);
  doc.text("CRITERIO DE INSPECCIÓN DE EXTINTORES VEHICULARES", marginX + 10, currentY + 3.2);
  doc.text("CUMPLE (SI)", marginX + contentWidth - 36, currentY + 3.2, { align: "center" });
  doc.text("NO CUMPLE", marginX + contentWidth - 22, currentY + 3.2, { align: "center" });
  doc.text("N/A", marginX + contentWidth - 8, currentY + 3.2, { align: "center" });

  currentY += 4.5;

  // Filas de los 10 criterios
  const rowH = 6.2;
  CRITERIOS_BASE.forEach((crit, idx) => {
    const found = checklist.find((c) => c.item === crit.item || c.id === crit.id) || checklist[idx];
    const estado = found ? (found.estado || "SI").toUpperCase() : "SI";
    const isEven = idx % 2 === 0;

    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginX, currentY, contentWidth, rowH, "F");
    doc.setDrawColor(...PALETTE.borderLight);
    doc.line(marginX, currentY + rowH, marginX + contentWidth, currentY + rowH);

    // #
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(String(crit.id), marginX + 3, currentY + 4.2);

    // Texto del Criterio
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(crit.item, marginX + 10, currentY + 4.2);

    // Marcadores SI / NO / NA
    const checkX_SI = marginX + contentWidth - 36;
    const checkX_NO = marginX + contentWidth - 22;
    const checkX_NA = marginX + contentWidth - 8;

    if (estado === "SI") {
      doc.setFillColor(...PALETTE.greenBg);
      doc.setDrawColor(...PALETTE.greenBorder);
      doc.roundedRect(checkX_SI - 5, currentY + 1.2, 10, 3.8, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(...PALETTE.green);
      doc.text("✓ SI", checkX_SI, currentY + 3.9, { align: "center" });
    } else if (estado === "NO") {
      doc.setFillColor(...PALETTE.redBg);
      doc.setDrawColor(...PALETTE.redBorder);
      doc.roundedRect(checkX_NO - 5, currentY + 1.2, 10, 3.8, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(...PALETTE.red);
      doc.text("✗ NO", checkX_NO, currentY + 3.9, { align: "center" });
    } else {
      doc.setFillColor(...PALETTE.headerBg);
      doc.setDrawColor(...PALETTE.border);
      doc.roundedRect(checkX_NA - 5, currentY + 1.2, 10, 3.8, 1, 1, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.8);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text("—", checkX_NA, currentY + 3.9, { align: "center" });
    }

    currentY += rowH;
  });

  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, currentY - (5.5 + 4.5 + rowH * 10), contentWidth, 5.5 + 4.5 + rowH * 10);
  currentY += 2.5;

  // 4. GALERÍA DE FOTOGRAFÍAS DE EVIDENCIA (Si existen)
  const fotos = Array.isArray(data.fotosEvidencia) ? data.fotosEvidencia.filter(Boolean) : [];
  if (fotos.length > 0) {
    const photoBoxHeight = 26;
    doc.setFillColor(...PALETTE.bgCard);
    doc.setDrawColor(...PALETTE.border);
    doc.rect(marginX, currentY, contentWidth, photoBoxHeight, "FD");

    doc.setFillColor(...PALETTE.headerBg);
    doc.rect(marginX, currentY, contentWidth, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMain);
    doc.text("EVIDENCIAS FOTOGRÁFICAS REGISTRADAS (MANÓMETRO / CILINDRO / CALCOMANÍA):", marginX + 3, currentY + 3.2);

    const maxPhotos = Math.min(fotos.length, 4);
    const photoWidth = 38;
    const photoHeight = 18;
    const photoGap = (contentWidth - 6 - photoWidth * maxPhotos) / Math.max(1, maxPhotos - 1);

    fotos.slice(0, 4).forEach((foto, idx) => {
      const pX = marginX + 3 + idx * (photoWidth + photoGap);
      try {
        if (foto.startsWith("data:image")) {
          doc.addImage(foto, "JPEG", pX, currentY + 6, photoWidth, photoHeight, undefined, "FAST");
          doc.setDrawColor(...PALETTE.border);
          doc.rect(pX, currentY + 6, photoWidth, photoHeight);
        }
      } catch (e) {
        // Ignorar
      }
    });

    currentY += photoBoxHeight + 2.5;
  }

  // 5. OBSERVACIONES Y ACCIONES CORRECTIVAS
  const obsHeight = 15;
  doc.setFillColor(...PALETTE.bgCard);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, currentY, contentWidth, obsHeight, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(marginX, currentY, contentWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("OBSERVACIONES, HALLAZGOS Y PLAN DE ACCIÓN / RECARGA:", marginX + 3, currentY + 3.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  const obsText = data.observaciones || "Extintor se encuentra en óptimas condiciones de presión y mantenimiento preventivo.";
  const splitObs = doc.splitTextToSize(obsText, contentWidth - 6);
  doc.text(splitObs, marginX + 3, currentY + 8);

  currentY += obsHeight + 2.5;

  // 6. BLOQUE DE FIRMAS Y VALIDACIÓN LEGAL
  const sigBoxHeight = 28;
  const sigColWidth = (contentWidth - 4) / 2;

  // Firma Conductor
  const sig1X = marginX;
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.border);
  doc.roundedRect(sig1X, currentY, sigColWidth, sigBoxHeight, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(sig1X, currentY, sigColWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("CONDUCTOR / OPERADOR RESPONSABLE", sig1X + sigColWidth / 2, currentY + 3.2, { align: "center" });

  if (data.firmaConductor || data.firmaInspector) {
    try {
      const sigImg = data.firmaConductor || data.firmaInspector;
      if (sigImg && sigImg.startsWith("data:image")) {
        doc.addImage(sigImg, "PNG", sig1X + sigColWidth / 2 - 22, currentY + 5.5, 44, 13, undefined, "FAST");
      }
    } catch (e) {
      // Ignorar error
    }
  }

  doc.setDrawColor(...PALETTE.border);
  doc.line(sig1X + 8, currentY + 20, sig1X + sigColWidth - 8, currentY + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.conductorNombre || "CONDUCTOR ASIGNADO", sig1X + sigColWidth / 2, currentY + 23.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(`C.C. ${data.conductorDocumento || "—"} • Firma Digital Certificada`, sig1X + sigColWidth / 2, currentY + 26.5, { align: "center" });

  // Firma / Aprobación HSEQ
  const sig2X = marginX + sigColWidth + 4;
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.border);
  doc.roundedRect(sig2X, currentY, sigColWidth, sigBoxHeight, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(sig2X, currentY, sigColWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("AUDITORÍA Y APROBACIÓN HSEQ", sig2X + sigColWidth / 2, currentY + 3.2, { align: "center" });

  const isApproved = Boolean(data.estadoAprobo);
  doc.setFillColor(...(isApproved ? PALETTE.greenBg : PALETTE.amberBg));
  doc.setDrawColor(...(isApproved ? PALETTE.greenBorder : PALETTE.amberBorder));
  doc.roundedRect(sig2X + sigColWidth / 2 - 28, currentY + 7, 56, 10, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...(isApproved ? PALETTE.green : PALETTE.amber));
  doc.text(isApproved ? "VERIFICADO & APROBADO HSEQ" : "REVISIÓN DIGITAL AUTOMÁTICA", sig2X + sigColWidth / 2, currentY + 12.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(`Fecha: ${data.fecha || "—"} ${data.hora || ""}`, sig2X + sigColWidth / 2, currentY + 15.5, { align: "center" });

  doc.setDrawColor(...PALETTE.border);
  doc.line(sig2X + 8, currentY + 20, sig2X + sigColWidth - 8, currentY + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.responsableHseq || "COORDINACIÓN HSEQ", sig2X + sigColWidth / 2, currentY + 23.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2", sig2X + sigColWidth / 2, currentY + 26.5, { align: "center" });

  currentY += sigBoxHeight + 2.5;

  // 7. PIE DE PÁGINA NORMATIVO
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    `Documento Oficial generado automáticamente por ERP TransServices • Control Documental HSEQ-F-034 v03 • ${data.placa || ""} • ${data.fecha || ""}`,
    marginX + contentWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  const fileName = `HSEQ-F-034_Extintor_${(data.placa || "VEHICULO").toUpperCase()}_${data.fecha || "REGISTRO"}.pdf`;
  doc.save(fileName);
}

// Exponer globalmente
window.generateExtintorPDFReport = generateExtintorPDFReport;
