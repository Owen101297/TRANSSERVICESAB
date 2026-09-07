// lib/utils/pdfAsistenciaGenerator.ts
// Generador Oficial Corporativo de PDF TH-FOR-03 (Registro de Asistencia y Capacitación / Charla 5 Minutos) para Trans Services A&B S.A.S.
// Formato profesional de alta densidad según normas HSEQ, PESV y Ministerio de Transporte.

export interface AsistenciaPdfItem {
  id?: string;
  personaNombre: string;
  personaDocumento?: string | null;
  cargo?: string | null;
  proyecto?: string | null;
  horaLlegada?: string | null;
  firmaUrl?: string | null;
  observaciones?: string | null;
}

export interface AsistenciaPdfMeta {
  fecha: string;
  tema: string;
  facilitador: string;
  ciudad: string;
  lugar?: string;
  horario: string;
  duracion: string;
  hh: string;
  tipoEvento?: string;
  proyecto?: string;
  codigo?: string;
  version?: string;
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
  amber: [217, 119, 6] as [number, number, number],          // Warning Amber
  amberBg: [254, 252, 232] as [number, number, number],
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

export async function generateAsistenciaPDF(
  asistentes: AsistenciaPdfItem[],
  meta: AsistenciaPdfMeta
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 195.9 mm
  const logoData = await loadLogoImage();

  const ITEMS_PER_PAGE = 18;
  const totalItems = asistentes.length > 0 ? asistentes.length : 1;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  for (let page = 1; page <= totalPages; page++) {
    if (page > 1) {
      doc.addPage("letter", "portrait");
    }

    let currentY = 8;

    // 1. MEMBRETE OFICIAL SIG HSEQ-PESV
    const headerHeight = 20;
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.3);
    doc.setFillColor(...PALETTE.white);
    doc.rect(marginX, currentY, contentWidth, headerHeight, "FD");

    // Col 1: Logo (42mm)
    const col1Width = 42;
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", marginX + 3, currentY + 2.5, 36, 15, undefined, "FAST");
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...PALETTE.primary);
        doc.text("TRANS SERVICES A&B", marginX + col1Width / 2, currentY + 11, { align: "center" });
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PALETTE.primary);
      doc.text("TRANS SERVICES A&B", marginX + col1Width / 2, currentY + 11, { align: "center" });
    }

    doc.line(marginX + col1Width, currentY, marginX + col1Width, currentY + headerHeight);

    // Col 2: Título Central
    const col2Width = contentWidth - col1Width - 44;
    const col2X = marginX + col1Width;
    doc.setFillColor(...PALETTE.headerBg);
    doc.rect(col2X, currentY, col2Width, 7, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.primary);
    doc.text(
      "SISTEMA INTEGRADO DE GESTIÓN (HSEQ - PESV)",
      col2X + col2Width / 2,
      currentY + 4.8,
      { align: "center" }
    );

    doc.line(col2X, currentY + 7, col2X + col2Width, currentY + 7);

    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.textMain);
    doc.text("REGISTRO DE ASISTENCIA Y CAPACITACIÓN", col2X + col2Width / 2, currentY + 12.5, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(
      "TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2",
      col2X + col2Width / 2,
      currentY + 17,
      { align: "center" }
    );

    doc.line(marginX + contentWidth - 44, currentY, marginX + contentWidth - 44, currentY + headerHeight);

    // Col 3: Metadatos Documentales
    const col3X = marginX + contentWidth - 44;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMuted);

    doc.text(`CÓDIGO:`, col3X + 2.5, currentY + 5);
    doc.text(`${meta.codigo || "TH-FOR-03"}`, col3X + 41.5, currentY + 5, { align: "right" });
    doc.line(col3X, currentY + 6.7, marginX + contentWidth, currentY + 6.7);

    doc.text(`VERSIÓN:`, col3X + 2.5, currentY + 11);
    doc.text(`${meta.version || "03"}`, col3X + 41.5, currentY + 11, { align: "right" });
    doc.line(col3X, currentY + 13.3, marginX + contentWidth, currentY + 13.3);

    doc.text(`FECHA / PÁG:`, col3X + 2.5, currentY + 17.5);
    doc.text(`${meta.fecha} (${page}/${totalPages})`, col3X + 41.5, currentY + 17.5, { align: "right" });

    currentY += headerHeight + 2.5;

    // 2. CUADRO DE DATOS DEL EVENTO / CHARLA / CAPACITACIÓN
    const eventBoxHeight = 18;
    doc.setDrawColor(...PALETTE.border);
    doc.setFillColor(...PALETTE.bgCard);
    doc.rect(marginX, currentY, contentWidth, eventBoxHeight, "FD");

    // Fila 1 del evento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.primaryDark);
    doc.text("TEMA / OBJETIVO:", marginX + 3, currentY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMain);
    const temaClean = meta.tema || "Charla de Seguridad y Operación";
    doc.text(
      temaClean.length > 70 ? temaClean.substring(0, 68) + "..." : temaClean,
      marginX + 28,
      currentY + 4.5
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.primaryDark);
    doc.text("FACILITADOR:", marginX + contentWidth - 75, currentY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(meta.facilitador || "COORDINADOR HSEQ", marginX + contentWidth - 52, currentY + 4.5);

    doc.line(marginX, currentY + 6.5, marginX + contentWidth, currentY + 6.5);

    // Fila 2 del evento (4 columnas de metadatos)
    const subColWidth = contentWidth / 4;

    // Subcol 1: Lugar / Ciudad
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("CIUDAD / SEDE:", marginX + 3, currentY + 10.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(meta.ciudad || "Base Operativa", marginX + 3, currentY + 15);

    doc.line(marginX + subColWidth, currentY + 6.5, marginX + subColWidth, currentY + eventBoxHeight);

    // Subcol 2: Horario
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("HORARIO:", marginX + subColWidth + 3, currentY + 10.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(meta.horario || "07:30 - 08:30", marginX + subColWidth + 3, currentY + 15);

    doc.line(marginX + subColWidth * 2, currentY + 6.5, marginX + subColWidth * 2, currentY + eventBoxHeight);

    // Subcol 3: Duración
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("DURACIÓN:", marginX + subColWidth * 2 + 3, currentY + 10.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(meta.duracion || "1 Hora", marginX + subColWidth * 2 + 3, currentY + 15);

    doc.line(marginX + subColWidth * 3, currentY + 6.5, marginX + subColWidth * 3, currentY + eventBoxHeight);

    // Subcol 4: Total Horas Hombre
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("TOTAL HORAS HOMBRE:", marginX + subColWidth * 3 + 3, currentY + 10.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.primary);
    doc.text(meta.hh || `${asistentes.length} H.H.`, marginX + subColWidth * 3 + 3, currentY + 15);

    currentY += eventBoxHeight + 2.5;

    // 3. TABLA DE ASISTENTES Y FIRMAS DIGITALES (18 slots por página)
    const tableHeaderHeight = 6.5;
    const rowHeight = 11.2;

    doc.setFillColor(...PALETTE.primaryLight);
    doc.rect(marginX, currentY, contentWidth, tableHeaderHeight, "FD");

    // Anchos de columnas: # (8mm) | Nombre (62mm) | Cédula (26mm) | Cargo (34mm) | Proyecto (28mm) | Firma (37.9mm)
    const colW = {
      num: 8,
      nombre: 62,
      documento: 26,
      cargo: 34,
      proyecto: 28,
      firma: 37.9,
    };

    let curX = marginX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.primaryDark);

    doc.text("#", curX + colW.num / 2, currentY + 4.5, { align: "center" });
    curX += colW.num;
    doc.line(curX, currentY, curX, currentY + tableHeaderHeight);

    doc.text("NOMBRES Y APELLIDOS", curX + 3, currentY + 4.5);
    curX += colW.nombre;
    doc.line(curX, currentY, curX, currentY + tableHeaderHeight);

    doc.text("N° DOCUMENTO", curX + colW.documento / 2, currentY + 4.5, { align: "center" });
    curX += colW.documento;
    doc.line(curX, currentY, curX, currentY + tableHeaderHeight);

    doc.text("CARGO / OCUPACIÓN", curX + 3, currentY + 4.5);
    curX += colW.cargo;
    doc.line(curX, currentY, curX, currentY + tableHeaderHeight);

    doc.text("PROYECTO / CONTRATO", curX + 3, currentY + 4.5);
    curX += colW.proyecto;
    doc.line(curX, currentY, curX, currentY + tableHeaderHeight);

    doc.text("FIRMA DIGITAL DEL ASISTENTE", curX + colW.firma / 2, currentY + 4.5, { align: "center" });

    currentY += tableHeaderHeight;

    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const pageAsistentes = asistentes.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    for (let i = 0; i < ITEMS_PER_PAGE; i++) {
      const item = pageAsistentes[i];
      const rowY = currentY + i * rowHeight;
      const slotNum = startIdx + i + 1;

      doc.setFillColor(i % 2 === 0 ? [255, 255, 255] : [248, 250, 252]);
      doc.rect(marginX, rowY, contentWidth, rowHeight, "FD");

      let cellX = marginX;

      // 1. Número
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...PALETTE.textMuted);
      doc.text(`${slotNum}`, cellX + colW.num / 2, rowY + rowHeight / 2 + 1, { align: "center" });
      cellX += colW.num;
      doc.line(cellX, rowY, cellX, rowY + rowHeight);

      // 2. Nombre
      if (item?.personaNombre) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(...PALETTE.textMain);
        doc.text(
          item.personaNombre.length > 34 ? item.personaNombre.substring(0, 32) + ".." : item.personaNombre.toUpperCase(),
          cellX + 2.5,
          rowY + rowHeight / 2 + 1
        );
      }
      cellX += colW.nombre;
      doc.line(cellX, rowY, cellX, rowY + rowHeight);

      // 3. Documento
      if (item?.personaDocumento) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...PALETTE.textMain);
        doc.text(item.personaDocumento, cellX + colW.documento / 2, rowY + rowHeight / 2 + 1, { align: "center" });
      }
      cellX += colW.documento;
      doc.line(cellX, rowY, cellX, rowY + rowHeight);

      // 4. Cargo
      if (item?.cargo) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(...PALETTE.textMuted);
        const cargoText = item.cargo.toUpperCase();
        doc.text(cargoText.length > 22 ? cargoText.substring(0, 20) + ".." : cargoText, cellX + 2.5, rowY + rowHeight / 2 + 1);
      }
      cellX += colW.cargo;
      doc.line(cellX, rowY, cellX, rowY + rowHeight);

      // 5. Proyecto
      if (item?.proyecto) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.setTextColor(...PALETTE.textMuted);
        const proyText = item.proyecto.toUpperCase();
        doc.text(proyText.length > 18 ? proyText.substring(0, 16) + ".." : proyText, cellX + 2.5, rowY + rowHeight / 2 + 1);
      }
      cellX += colW.proyecto;
      doc.line(cellX, rowY, cellX, rowY + rowHeight);

      // 6. Firma Digital
      if (item?.firmaUrl) {
        try {
          doc.addImage(item.firmaUrl, "PNG", cellX + 3, rowY + 1, colW.firma - 6, rowHeight - 2, undefined, "FAST");
        } catch {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(5.5);
          doc.setTextColor(...PALETTE.green);
          doc.text("[Firmado Digitalmente]", cellX + colW.firma / 2, rowY + rowHeight / 2 + 1, { align: "center" });
        }
      } else if (item) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(5.5);
        doc.setTextColor(...PALETTE.textMuted);
        doc.text("Sin firma", cellX + colW.firma / 2, rowY + rowHeight / 2 + 1, { align: "center" });
      }
    }

    currentY += ITEMS_PER_PAGE * rowHeight + 3;

    // 4. FIRMAS DE CIERRE Y RESPONSABILIDAD (En la última página o en cada página)
    const signBoxY = currentY;
    const signBoxHeight = 16;
    const signColWidth = (contentWidth - 8) / 2;

    // Facilitador / Expositor
    doc.setDrawColor(...PALETTE.border);
    doc.setFillColor(...PALETTE.white);
    doc.rect(marginX, signBoxY, signColWidth, signBoxHeight, "FD");

    doc.line(marginX + 6, signBoxY + 10, marginX + signColWidth - 6, signBoxY + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(meta.facilitador.toUpperCase(), marginX + signColWidth / 2, signBoxY + 12.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("FACILITADOR / RESPONSABLE HSEQ DE LA ACTIVIDAD", marginX + signColWidth / 2, signBoxY + 15, { align: "center" });

    // Director / Supervisor de Operaciones
    doc.rect(marginX + signColWidth + 8, signBoxY, signColWidth, signBoxHeight, "FD");
    doc.line(marginX + signColWidth + 14, signBoxY + 10, marginX + contentWidth - 6, signBoxY + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.textMain);
    doc.text("COORDINADOR DE OPERACIONES / TALENTO HUMANO", marginX + signColWidth + 8 + signColWidth / 2, signBoxY + 12.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text("REVISIÓN, CONFORMIDAD Y CUSTODIA DEL REGISTRO", marginX + signColWidth + 8 + signColWidth / 2, signBoxY + 15, { align: "center" });

    // Pie de página institucional
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.textMuted);
    doc.text(
      `Formato Oficial TH-FOR-03 v03 • TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2 • Generado el ${new Date().toLocaleString("es-CO")} (Pág. ${page} de ${totalPages})`,
      marginX + contentWidth / 2,
      pageHeight - 4,
      { align: "center" }
    );
  }

  const cleanDate = meta.fecha.replace(/[^0-9-]/g, "");
  doc.save(`TH-FOR-03_Asistencia_${cleanDate}_${meta.tema.substring(0, 15).replace(/\s+/g, "_")}.pdf`);
}
