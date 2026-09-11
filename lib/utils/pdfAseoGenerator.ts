// lib/utils/pdfAseoGenerator.ts
// Generador Oficial Corporativo de PDF HSEQ-F-097 (Inspección de Orden, Aseo y Desinfección) para Trans Services A&B S.A.S.
// Formato profesional de alta densidad en tamaño Carta (1 página) según protocolos de bioseguridad y PESV.

export interface AseoChecklistItemDto {
  id?: number;
  item: string;
  estado: "SI" | "NO" | "NA";
}

export interface AseoPdfData {
  id?: string;
  fecha: string;
  hora: string;
  placa: string;
  tipoVehiculo?: string;
  conductorNombre: string;
  conductorDocumento?: string | null;
  conductorId?: string | null;
  responsableHseq?: string | null;
  kilometraje?: number | null;
  checklist: AseoChecklistItemDto[];
  fotosEvidencia?: string[] | null;
  observaciones?: string | null;
  firmaConductor?: string | null;
  firmaInspector?: string | null;
  conforme?: boolean;
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

export async function generateAseoPDF(data: AseoPdfData): Promise<void> {
  const jspdfModule = await import("jspdf");
  const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default || jspdfModule;

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

  // Col 1: Logo
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

  doc.line(marginX + col1Width, currentY, marginX + col1Width, currentY + headerHeight);

  // Col 2: Título Central
  const col2Width = contentWidth - col1Width - 44;
  const col2X = marginX + col1Width;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO Y PESV", col2X + col2Width / 2, currentY + 5.5, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.primary);
  doc.text("FORMATO DE INSPECCIÓN DE ORDEN, ASEO Y DESINFECCIÓN VEHICULAR", col2X + col2Width / 2, currentY + 10.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("Protocolos de Bioseguridad • Dec. 1072/2015 • Res. 40595/2022 (PESV)", col2X + col2Width / 2, currentY + 15.5, { align: "center" });

  doc.line(marginX + col1Width + col2Width, currentY, marginX + col1Width + col2Width, currentY + headerHeight);

  // Col 3: Control Documental
  const col3X = marginX + col1Width + col2Width;
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  
  const rightMeta = [
    { label: "CÓDIGO:", val: "HSEQ-F-097" },
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

  // 2. BLOQUE DE METADATOS
  const metaBoxHeight = 22;
  doc.setFillColor(...PALETTE.bgCard);
  doc.rect(marginX, currentY, contentWidth, metaBoxHeight, "FD");

  doc.setFillColor(...PALETTE.primary);
  doc.rect(marginX, currentY, 2, metaBoxHeight, "F");

  const metaColW = (contentWidth - 4) / 3;
  const metaY1 = currentY + 4.5;
  const metaLineH = 4.2;

  // Col 1: Datos Vehículo
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
  doc.text("KILOMETRAJE:", marginX + 4, metaY1 + metaLineH * 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(`${data.kilometraje?.toLocaleString() || "—"} KM`, marginX + 30, metaY1 + metaLineH * 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("FECHA / HORA:", marginX + 4, metaY1 + metaLineH * 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(`${data.fecha} • ${data.hora || "—"}`, marginX + 30, metaY1 + metaLineH * 3);

  // Col 2: Conductor e Inspector
  const col2DataX = marginX + metaColW + 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CONDUCTOR:", col2DataX, metaY1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMain);
  doc.text((data.conductorNombre || "—").substring(0, 30), col2DataX + 30, metaY1);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("DOCUMENTO / C.C.:", col2DataX, metaY1 + metaLineH);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.conductorDocumento || "—", col2DataX + 30, metaY1 + metaLineH);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("AUDITOR HSEQ:", col2DataX, metaY1 + metaLineH * 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text((data.responsableHseq || "Coordinador HSEQ").substring(0, 30), col2DataX + 30, metaY1 + metaLineH * 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("ORGANIZACIÓN:", col2DataX, metaY1 + metaLineH * 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMain);
  doc.text("TRANS SERVICES A&B S.A.S.", col2DataX + 30, metaY1 + metaLineH * 3);

  // Col 3: Concepto HSEQ Badge
  const col3DataX = marginX + metaColW * 2 + 6;
  const isConforme = Boolean(data.conforme);

  doc.setFillColor(...(isConforme ? PALETTE.greenBg : PALETTE.redBg));
  doc.setDrawColor(...(isConforme ? PALETTE.greenBorder : PALETTE.redBorder));
  doc.roundedRect(col3DataX, currentY + 3, metaColW - 10, metaBoxHeight - 6, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("ESTADO HIGIÉNICO", col3DataX + (metaColW - 10) / 2, currentY + 7.5, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...(isConforme ? PALETTE.green : PALETTE.red));
  doc.text(isConforme ? "APTO / HIGIÉNICO" : "NO CONFORME", col3DataX + (metaColW - 10) / 2, currentY + 12.5, { align: "center" });

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("24 Puntos Verificados", col3DataX + (metaColW - 10) / 2, currentY + 16.5, { align: "center" });

  currentY += metaBoxHeight + 2.5;

  // 3. TABLA DE 24 ÍTEMS NORMATIVOS EN 2 COLUMNAS (12 Ítems c/u)
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];
  const tableColWidth = (contentWidth - 3) / 2; // ~97.4 mm
  const tableTopY = currentY;

  const renderAseoColumn = (startX: number, startIndex: number, count: number, headerTitle: string) => {
    let y = tableTopY;

    // Encabezado
    doc.setFillColor(...PALETTE.primaryDark);
    doc.rect(startX, y, tableColWidth, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.white);
    doc.text(headerTitle, startX + 3, y + 3.5);

    y += 5;

    // Sub-encabezados
    doc.setFillColor(...PALETTE.headerBg);
    doc.rect(startX, y, tableColWidth, 4, "F");
    doc.setDrawColor(...PALETTE.border);
    doc.line(startX, y + 4, startX + tableColWidth, y + 4);

    doc.setFontSize(5.8);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("#", startX + 2, y + 2.8);
    doc.text("COMPONENTE / ZONA EVALUADA", startX + 7, y + 2.8);
    doc.text("ESTADO", startX + tableColWidth - 12, y + 2.8, { align: "center" });

    y += 4;

    const rowH = 6.2;
    for (let i = 0; i < count; i++) {
      const itemIndex = startIndex + i;
      const item = checklist[itemIndex] || { item: `Ítem ${itemIndex + 1}`, estado: "SI" };
      const isEven = i % 2 === 0;

      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(startX, y, tableColWidth, rowH, "F");
      doc.setDrawColor(...PALETTE.borderLight);
      doc.line(startX, y + rowH, startX + tableColWidth, y + rowH);

      // #
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text(String(itemIndex + 1), startX + 2, y + 4.2);

      // Nombre del ítem
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.0);
      doc.setTextColor(...PALETTE.textMain);
      const textTrunc = (item.item || `Ítem ${itemIndex + 1}`).substring(0, 36);
      doc.text(textTrunc, startX + 7, y + 4.2);

      // Badge Estado
      const est = (item.estado || "SI").toUpperCase();
      const badgeX = startX + tableColWidth - 12;
      const badgeY = y + 1.2;

      if (est === "SI") {
        doc.setFillColor(...PALETTE.greenBg);
        doc.setDrawColor(...PALETTE.greenBorder);
        doc.roundedRect(badgeX - 7, badgeY, 14, 3.8, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.2);
        doc.setTextColor(...PALETTE.green);
        doc.text("LIMPIO (SI)", badgeX, badgeY + 2.8, { align: "center" });
      } else if (est === "NO") {
        doc.setFillColor(...PALETTE.redBg);
        doc.setDrawColor(...PALETTE.redBorder);
        doc.roundedRect(badgeX - 7, badgeY, 14, 3.8, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.2);
        doc.setTextColor(...PALETTE.red);
        doc.text("SUCIO (NO)", badgeX, badgeY + 2.8, { align: "center" });
      } else {
        doc.setFillColor(...PALETTE.headerBg);
        doc.setDrawColor(...PALETTE.border);
        doc.roundedRect(badgeX - 5, badgeY, 10, 3.8, 1, 1, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.2);
        doc.setTextColor(...PALETTE.textMuted);
        doc.text("N/A", badgeX, badgeY + 2.8, { align: "center" });
      }

      y += rowH;
    }

    doc.setDrawColor(...PALETTE.border);
    doc.rect(startX, tableTopY, tableColWidth, y - tableTopY);
    return y;
  };

  const endY1 = renderAseoColumn(marginX, 0, 12, "SECCIÓN A: ASEO EXTERIOR, CABINA Y CONTACTO");
  const endY2 = renderAseoColumn(marginX + tableColWidth + 3, 12, 12, "SECCIÓN B: BIOSEGURIDAD, DESINFECCIÓN Y BAÚL");

  currentY = Math.max(endY1, endY2) + 2.5;

  // 4. EVIDENCIAS FOTOGRÁFICAS
  const fotos = Array.isArray(data.fotosEvidencia) ? data.fotosEvidencia.filter(Boolean) : [];
  if (fotos.length > 0) {
    const photoBoxHeight = 24;
    doc.setFillColor(...PALETTE.bgCard);
    doc.setDrawColor(...PALETTE.border);
    doc.rect(marginX, currentY, contentWidth, photoBoxHeight, "FD");

    doc.setFillColor(...PALETTE.headerBg);
    doc.rect(marginX, currentY, contentWidth, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.textMain);
    doc.text("EVIDENCIAS FOTOGRÁFICAS DE HIGIENE Y DESINFECCIÓN:", marginX + 3, currentY + 3.2);

    const maxPhotos = Math.min(fotos.length, 4);
    const photoWidth = 38;
    const photoHeight = 16;
    const photoGap = (contentWidth - 6 - photoWidth * maxPhotos) / Math.max(1, maxPhotos - 1);

    fotos.slice(0, 4).forEach((foto, idx) => {
      const pX = marginX + 3 + idx * (photoWidth + photoGap);
      try {
        if (foto.startsWith("data:image")) {
          doc.addImage(foto, "JPEG", pX, currentY + 5.5, photoWidth, photoHeight, undefined, "FAST");
          doc.setDrawColor(...PALETTE.border);
          doc.rect(pX, currentY + 5.5, photoWidth, photoHeight);
        }
      } catch {}
    });

    currentY += photoBoxHeight + 2.5;
  }

  // 5. OBSERVACIONES
  const obsHeight = 14;
  doc.setFillColor(...PALETTE.bgCard);
  doc.setDrawColor(...PALETTE.border);
  doc.rect(marginX, currentY, contentWidth, obsHeight, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(marginX, currentY, contentWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("OBSERVACIONES Y NOVEDADES HIGIÉNICAS:", marginX + 3, currentY + 3.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMain);
  const obsText = data.observaciones || "Vehículo higienizado y desinfectado conforme a los estándares de bioseguridad institucional.";
  const splitObs = doc.splitTextToSize(obsText, contentWidth - 6);
  doc.text(splitObs, marginX + 3, currentY + 8);

  currentY += obsHeight + 2.5;

  // 6. FIRMAS DIGITALES
  const sigBoxHeight = 26;
  const sigColWidth = (contentWidth - 4) / 2;

  // Conductor
  const sig1X = marginX;
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.border);
  doc.roundedRect(sig1X, currentY, sigColWidth, sigBoxHeight, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(sig1X, currentY, sigColWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("CONDUCTOR / OPERARIO RESPONSABLE", sig1X + sigColWidth / 2, currentY + 3.2, { align: "center" });

  if (data.firmaConductor || data.firmaInspector) {
    try {
      const sigImg = data.firmaConductor || data.firmaInspector;
      if (sigImg && sigImg.startsWith("data:image")) {
        doc.addImage(sigImg, "PNG", sig1X + sigColWidth / 2 - 20, currentY + 5.5, 40, 12, undefined, "FAST");
      }
    } catch {}
  }

  doc.setDrawColor(...PALETTE.border);
  doc.line(sig1X + 8, currentY + 18.5, sig1X + sigColWidth - 8, currentY + 18.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.conductorNombre || "CONDUCTOR", sig1X + sigColWidth / 2, currentY + 21.8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(`C.C. ${data.conductorDocumento || "—"} • Firma Digital`, sig1X + sigColWidth / 2, currentY + 24.5, { align: "center" });

  // HSEQ
  const sig2X = marginX + sigColWidth + 4;
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.border);
  doc.roundedRect(sig2X, currentY, sigColWidth, sigBoxHeight, 1.5, 1.5, "FD");

  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(sig2X, currentY, sigColWidth, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("INSPECCIÓN Y AUDITORÍA HSEQ", sig2X + sigColWidth / 2, currentY + 3.2, { align: "center" });

  const isApproved = Boolean(data.estadoAprobo);
  doc.setFillColor(...(isApproved ? PALETTE.greenBg : PALETTE.amberBg));
  doc.setDrawColor(...(isApproved ? PALETTE.greenBorder : PALETTE.amberBorder));
  doc.roundedRect(sig2X + sigColWidth / 2 - 24, currentY + 6.5, 48, 9, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...(isApproved ? PALETTE.green : PALETTE.amber));
  doc.text(isApproved ? "✓ AUDITADO & APROBADO" : "REGISTRO DE CONTROL", sig2X + sigColWidth / 2, currentY + 11.5, { align: "center" });

  doc.line(sig2X + 8, currentY + 18.5, sig2X + sigColWidth - 8, currentY + 18.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.responsableHseq || "COORDINADOR HSEQ", sig2X + sigColWidth / 2, currentY + 21.8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2", sig2X + sigColWidth / 2, currentY + 24.5, { align: "center" });

  currentY += sigBoxHeight + 2.5;

  // 7. PIE DE PÁGINA
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    `Documento Oficial generado automáticamente por ERP TransServices • Control Documental HSEQ-F-097 v03 • ${data.placa} • ${data.fecha}`,
    marginX + contentWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  const fileName = `HSEQ-F-097_Aseo_${(data.placa || "VEHICULO").toUpperCase()}_${data.fecha || "REGISTRO"}.pdf`;
  doc.save(fileName);
}
