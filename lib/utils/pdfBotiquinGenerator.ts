// lib/utils/pdfBotiquinGenerator.ts
// Generador Oficial de PDF HSEQ-F-035 (Inspección de Botiquines de Primeros Auxilios) para Trans Services A&B S.A.S.
// Formato profesional de alta densidad en tamaño Carta (1 página) según Resolución 0705 de 2007 y PESV.

export interface BotiquinItemDto {
  id: number;
  nombre: string;
  categoria: string;
  req: string;
  unidad: string;
  cantidad: number;
  estado: "BUENO" | "MALO" | "FALTANTE" | "NO_TIENE";
  tieneVencimiento: boolean;
  fechaVencimiento?: string | null;
}

export interface BotiquinPdfData {
  id?: string;
  fecha: string;
  hora: string;
  placa: string;
  tipoVehiculo?: string;
  conductorNombre: string;
  conductorDocumento?: string | null;
  conductorId?: string | null;
  responsableHseq?: string | null;
  ubicacionBotiquin?: string;
  estadoGabinete?: string;
  checklist: BotiquinItemDto[];
  fotosEvidencia?: string[] | null;
  observaciones?: string | null;
  firmaConductor?: string | null;
  firmaInspector?: string | null;
  conforme?: boolean;
  itemsVencidosCount?: number;
  itemsFaltantesCount?: number;
  estadoReviso?: boolean;
  estadoAprobo?: boolean;
  timestamp?: string;
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
  red: [220, 38, 38] as [number, number, number],            // Alert Red
  redBg: [254, 242, 242] as [number, number, number],
  redBorder: [254, 202, 202] as [number, number, number],
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

export async function generateBotiquinPDF(data: BotiquinPdfData): Promise<void> {
  const { jsPDF } = await import("jspdf");

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
  const logoData = await loadLogoImage();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 3, currentY + 2.5, 36, 15, undefined, "FAST");
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
  doc.text("FORMATO DE INSPECCIÓN PERIÓDICA DE BOTIQUINES DE PRIMEROS AUXILIOS", col2X + col2Width / 2, currentY + 10.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("Cumplimiento Res. 0705/2007 • Dec. 1072/2015 • Res. 40595/2022 (PESV)", col2X + col2Width / 2, currentY + 15.5, { align: "center" });

  // Divisor 2
  doc.line(marginX + col1Width + col2Width, currentY, marginX + col1Width + col2Width, currentY + headerHeight);

  // Columna 3: Control Documental
  const col3X = marginX + col1Width + col2Width;
  const col3Width = 44;
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  
  const rightMeta = [
    { label: "CÓDIGO:", val: "HSEQ-F-035" },
    { label: "VERSIÓN:", val: "04" },
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

  // 2. BLOQUE DE METADATOS DEL VEHÍCULO Y RESPONSABLE
  const metaBoxHeight = 22;
  doc.setFillColor(...PALETTE.bgCard);
  doc.rect(marginX, currentY, contentWidth, metaBoxHeight, "FD");

  // Barra lateral
  doc.setFillColor(...PALETTE.primary);
  doc.rect(marginX, currentY, 2, metaBoxHeight, "F");

  // Grid de datos en 3 columnas
  const metaColW = (contentWidth - 4) / 3;
  
  // Col 1
  const metaY1 = currentY + 4.5;
  const metaLineH = 4.2;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("PLACA VEHÍCULO:", marginX + 4, metaY1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.primary);
  doc.setFontSize(8.5);
  doc.text((data.placa || "—").toUpperCase(), marginX + 30, metaY1);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TIPO VEHÍCULO:", marginX + 4, metaY1 + metaLineH);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.tipoVehiculo || "Camioneta", marginX + 30, metaY1 + metaLineH);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("UBICACIÓN:", marginX + 4, metaY1 + metaLineH * 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.ubicacionBotiquin || "Cabina del vehículo", marginX + 30, metaY1 + metaLineH * 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("ESTADO MALETÍN:", marginX + 4, metaY1 + metaLineH * 3);
  const estadoGabinete = (data.estadoGabinete || "BUENO").toUpperCase();
  if (estadoGabinete === "BUENO") {
    doc.setTextColor(...PALETTE.green);
  } else if (estadoGabinete === "REGULAR") {
    doc.setTextColor(...PALETTE.amber);
  } else {
    doc.setTextColor(...PALETTE.red);
  }
  doc.setFont("helvetica", "bold");
  doc.text(estadoGabinete, marginX + 30, metaY1 + metaLineH * 3);

  // Col 2
  const col2DataX = marginX + metaColW + 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CONDUCTOR / INSPECTOR:", col2DataX, metaY1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMain);
  doc.text((data.conductorNombre || "—").substring(0, 32), col2DataX + 36, metaY1);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("DOCUMENTO / CÉDULA:", col2DataX, metaY1 + metaLineH);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.conductorDocumento || "—", col2DataX + 36, metaY1 + metaLineH);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("RESPONSABLE HSEQ:", col2DataX, metaY1 + metaLineH * 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text((data.responsableHseq || "Coordinación HSEQ").substring(0, 30), col2DataX + 36, metaY1 + metaLineH * 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("FECHA / HORA REGISTRO:", col2DataX, metaY1 + metaLineH * 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(`${data.fecha} • ${data.hora || "—"}`, col2DataX + 36, metaY1 + metaLineH * 3);

  // Col 3: Concepto / Veredicto HSEQ Badge
  const col3DataX = marginX + metaColW * 2 + 6;
  const isConforme = Boolean(data.conforme);

  doc.setFillColor(...(isConforme ? PALETTE.greenBg : PALETTE.redBg));
  doc.setDrawColor(...(isConforme ? PALETTE.greenBorder : PALETTE.redBorder));
  doc.roundedRect(col3DataX, currentY + 3, metaColW - 10, metaBoxHeight - 6, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CONCEPTO HSEQ", col3DataX + (metaColW - 10) / 2, currentY + 7.5, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...(isConforme ? PALETTE.green : PALETTE.red));
  doc.text(isConforme ? "APTO / CONFORME" : "NO CONFORME", col3DataX + (metaColW - 10) / 2, currentY + 12.5, { align: "center" });

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  const itemsVenc = data.itemsVencidosCount || 0;
  const itemsFalt = data.itemsFaltantesCount || 0;
  doc.text(`Vencidos: ${itemsVenc} • Faltantes: ${itemsFalt}`, col3DataX + (metaColW - 10) / 2, currentY + 16.5, { align: "center" });

  currentY += metaBoxHeight + 2.5;

  // 3. TABLA DE LOS 21 ELEMENTOS NORMATIVOS EN 2 COLUMNAS DE ALTA DENSIDAD
  // Columna Izquierda: Ítems 1 a 11 (Antisépticos, Material de Curación)
  // Columna Derecha: Ítems 12 a 21 (Inmovilización, Instrumental y Varios)
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];
  
  // Mapear los items por ID o índice
  const getRecordItem = (id: number) => {
    return checklist.find((c) => Number(c.id) === id) || {
      id,
      nombre: `Ítem ${id}`,
      categoria: "",
      req: "1",
      unidad: "unid",
      cantidad: 1,
      estado: "BUENO" as const,
      tieneVencimiento: false,
      fechaVencimiento: null,
    };
  };

  const tableColWidth = (contentWidth - 3) / 2; // ~97.4 mm
  const tableTopY = currentY;

  const renderTableColumn = (startX: number, itemsIds: number[], headerTitle: string) => {
    let y = tableTopY;

    // Encabezado de la columna
    doc.setFillColor(...PALETTE.primaryDark);
    doc.rect(startX, y, tableColWidth, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.white);
    doc.text(headerTitle, startX + 3, y + 3.5);

    y += 5;

    // Encabezados de subcolumnas
    doc.setFillColor(...PALETTE.headerBg);
    doc.rect(startX, y, tableColWidth, 4, "F");
    doc.setDrawColor(...PALETTE.border);
    doc.line(startX, y + 4, startX + tableColWidth, y + 4);

    doc.setFontSize(5.8);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("#", startX + 2, y + 2.8);
    doc.text("ELEMENTO / INSUMO", startX + 6, y + 2.8);
    doc.text("REQ", startX + 50, y + 2.8, { align: "center" });
    doc.text("CANT", startX + 60, y + 2.8, { align: "center" });
    doc.text("ESTADO", startX + 73, y + 2.8, { align: "center" });
    doc.text("VENCE", startX + 88, y + 2.8, { align: "center" });

    y += 4;

    // Filas de ítems
    const rowHeight = 7.0;
    itemsIds.forEach((itemId, idx) => {
      const item = getRecordItem(itemId);
      const isEven = idx % 2 === 0;

      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(startX, y, tableColWidth, rowHeight, "F");
      doc.setDrawColor(...PALETTE.borderLight);
      doc.line(startX, y + rowHeight, startX + tableColWidth, y + rowHeight);

      // #
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text(String(item.id || itemId), startX + 2, y + 4.5);

      // Nombre del elemento
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(...PALETTE.textMain);
      const truncatedName = (item.nombre || `Ítem ${itemId}`).substring(0, 27);
      doc.text(truncatedName, startX + 6, y + 4.5);

      // Requerido
      doc.setFontSize(5.8);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text(`${item.req || "1"} ${item.unidad || ""}`.trim(), startX + 50, y + 4.5, { align: "center" });

      // Cantidad Encontrada
      const cant = item.cantidad ?? item.req;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.textMain);
      doc.text(String(cant), startX + 60, y + 4.5, { align: "center" });

      // Estado con Badge
      const est = (item.estado || "BUENO").toUpperCase();
      let badgeBg = PALETTE.greenBg;
      let badgeBorder = PALETTE.greenBorder;
      let badgeText = PALETTE.green;
      let label = "BUENO";

      if (est === "MALO") {
        badgeBg = PALETTE.redBg;
        badgeBorder = PALETTE.redBorder;
        badgeText = PALETTE.red;
        label = "MALO";
      } else if (est === "FALTANTE" || est === "NO_TIENE" || cant < Number(item.req)) {
        badgeBg = PALETTE.amberBg;
        badgeBorder = PALETTE.amberBorder;
        badgeText = PALETTE.amber;
        label = "FALTA";
      }

      const badgeW = 12;
      const badgeH = 4.2;
      const badgeX = startX + 73 - badgeW / 2;
      const badgeY = y + 1.4;

      doc.setFillColor(...badgeBg);
      doc.setDrawColor(...badgeBorder);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.2);
      doc.setTextColor(...badgeText);
      doc.text(label, startX + 73, badgeY + 3.0, { align: "center" });

      // Vencimiento
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      const venceStr = item.fechaVencimiento ? item.fechaVencimiento : (item.tieneVencimiento ? "PEND" : "N/A");
      
      const todayStr = new Date().toISOString().split("T")[0];
      if (item.fechaVencimiento && item.fechaVencimiento <= todayStr) {
        doc.setTextColor(...PALETTE.red);
        doc.setFont("helvetica", "bold");
        doc.text(venceStr, startX + 88, y + 4.5, { align: "center" });
      } else {
        doc.setTextColor(...PALETTE.textMuted);
        doc.text(venceStr, startX + 88, y + 4.5, { align: "center" });
      }

      y += rowHeight;
    });

    // Borde exterior de columna
    doc.setDrawColor(...PALETTE.border);
    doc.rect(startX, tableTopY, tableColWidth, y - tableTopY);
    return y;
  };

  // Columna 1: Ítems 1 a 11
  const col1Items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const endY1 = renderTableColumn(marginX, col1Items, "SECCIÓN A: ANTISÉPTICOS, CURACIÓN E INMOVILIZACIÓN");

  // Columna 2: Ítems 12 a 21
  const col2Items = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const endY2 = renderTableColumn(marginX + tableColWidth + 3, col2Items, "SECCIÓN B: VENDAJES, INSTRUMENTAL Y PROTECCIÓN");

  currentY = Math.max(endY1, endY2) + 3;

  // 4. OBSERVACIONES Y PLAN DE REPOSICIÓN
  const obsHeight = 16;
  doc.setFillColor(...PALETTE.bgCard);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, currentY, contentWidth, obsHeight, "FD");

  // Encabezado de Observaciones
  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(marginX, currentY, contentWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("OBSERVACIONES, HALLAZGOS Y PLAN DE REPOSICIÓN INMEDIATA:", marginX + 3, currentY + 3.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  const obsText = data.observaciones || "Sin novedades reportadas. Dotación completa y en condiciones higiénicas para atención de primeros auxilios.";
  const splitObs = doc.splitTextToSize(obsText, contentWidth - 6);
  doc.text(splitObs, marginX + 3, currentY + 8);

  currentY += obsHeight + 3;

  // 5. BLOQUE DE FIRMAS Y VALIDACIÓN LEGAL
  const sigBoxHeight = 28;
  const sigColWidth = (contentWidth - 4) / 2;

  // Firma Conductor / Inspector
  const sig1X = marginX;
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.border);
  doc.roundedRect(sig1X, currentY, sigColWidth, sigBoxHeight, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(sig1X, currentY, sigColWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("CONDUCTOR / INSPECTOR RESPONSABLE", sig1X + sigColWidth / 2, currentY + 3.2, { align: "center" });

  if (data.firmaConductor || data.firmaInspector) {
    try {
      const sigImg = data.firmaConductor || data.firmaInspector;
      if (sigImg && sigImg.startsWith("data:image")) {
        doc.addImage(sigImg, "PNG", sig1X + sigColWidth / 2 - 22, currentY + 5.5, 44, 13, undefined, "FAST");
      }
    } catch {
      // Si falla renderizamos texto
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
  doc.text("VERIFICACIÓN Y APROBACIÓN HSEQ", sig2X + sigColWidth / 2, currentY + 3.2, { align: "center" });

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
  doc.text(`Fecha: ${data.fecha} ${data.hora || ""}`, sig2X + sigColWidth / 2, currentY + 15.5, { align: "center" });

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

  // 6. PIE DE PÁGINA NORMATIVO
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    `Documento Oficial generado automáticamente por ERP TransServices • Control Documental HSEQ-F-035 v04 • ${data.placa} • ${data.fecha}`,
    marginX + contentWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  // Descarga del documento
  const fileName = `HSEQ-F-035_Botiquin_${(data.placa || "VEHICULO").toUpperCase()}_${data.fecha || "REGISTRO"}.pdf`;
  doc.save(fileName);
}
