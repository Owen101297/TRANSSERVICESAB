// lib/utils/pdfEncuestaGenerator.ts
// Generador Oficial Corporativo de PDF CAL-FOR-01 (Evaluación de Satisfacción y Calidad de Servicio al Pasajero) para Trans Services A&B S.A.S.
// Formato profesional de alta densidad según normas HSEQ, ISO 9001 y PESV.

export interface EncuestaPdfItem {
  id?: string;
  tipoEncuesta?: string;
  titulo?: string;
  fecha: string;
  hora: string;
  placa?: string | null;
  tipoVehiculo?: string | null;
  conductorNombre?: string | null;
  conductorDocumento?: string | null;
  nombreEncuestado?: string | null;
  emailEncuestado?: string | null;
  empresaCliente?: string | null;
  calificacionGeneral: number;
  limpiezaVehiculo: number;
  atencionConductor: number;
  puntualidad: number;
  seguridadConfort: number;
  seriaRecomendado: string;
  comentarios?: string | null;
  firma?: string | null;
  canal?: string;
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
  amber: [217, 119, 6] as [number, number, number],          // Warning Amber
  amberBg: [254, 252, 232] as [number, number, number],
  amberBorder: [254, 240, 138] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],          // OK Green
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
      // Intentar siguiente ruta
    }
  }
  return null;
}

// 1. GENERADOR DE COMPROBANTE INDIVIDUAL DE ENCUESTA (VERTICAL CARTA)
export async function generateEncuestaIndividualPDF(data: EncuestaPdfItem): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 187.9 mm
  let currentY = 12;

  // 1. Membrete Oficial
  const headerHeight = 22;
  doc.setDrawColor(...PALETTE.border);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, headerHeight, "FD");

  const logoData = await loadLogoImage();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", marginX + 4, currentY + 3.5, 40, 15, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PALETTE.primary);
      doc.text("TRANS SERVICES A&B", marginX + 24, currentY + 12);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.primary);
    doc.text("TRANS SERVICES A&B", marginX + 24, currentY + 12);
  }

  doc.line(marginX + 48, currentY, marginX + 48, currentY + headerHeight);

  // Título Central
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(
    "EVALUACIÓN DE SATISFACCIÓN Y CALIDAD DE SERVICIO",
    marginX + 50 + (contentWidth - 92) / 2,
    currentY + 7,
    { align: "center" }
  );

  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.primary);
  doc.text(
    "TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2",
    marginX + 50 + (contentWidth - 92) / 2,
    currentY + 12.5,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    "Sistema Integrado de Gestión (HSEQ - ISO 9001 - PESV)",
    marginX + 50 + (contentWidth - 92) / 2,
    currentY + 17.5,
    { align: "center" }
  );

  doc.line(marginX + contentWidth - 44, currentY, marginX + contentWidth - 44, currentY + headerHeight);

  // Metadatos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CÓDIGO: CAL-FOR-01", marginX + contentWidth - 42, currentY + 6);
  doc.text("VERSIÓN: 02", marginX + contentWidth - 42, currentY + 11);
  doc.text(`FECHA: ${data.fecha}`, marginX + contentWidth - 42, currentY + 16);

  currentY += headerHeight + 5;

  // 2. Ficha del Servicio y Datos del Usuario
  doc.setDrawColor(...PALETTE.border);
  doc.setFillColor(...PALETTE.bgCard);
  doc.rect(marginX, currentY, contentWidth, 30, "FD");

  const halfWidth = contentWidth / 2;
  doc.line(marginX + halfWidth, currentY, marginX + halfWidth, currentY + 30);

  // Columna Izquierda
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.primary);
  doc.text("DATOS DEL VEHÍCULO Y RUTA", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(`Placa Asignada: ${data.placa || "N/A"}`, marginX + 4, currentY + 11);
  doc.text(`Tipo de Vehículo: ${data.tipoVehiculo || "Camioneta / Microbús"}`, marginX + 4, currentY + 16.5);
  doc.text(`Conductor: ${data.conductorNombre || "Sin asignar"}`, marginX + 4, currentY + 22);
  doc.text(`Fecha y Hora: ${data.fecha} • ${data.hora}`, marginX + 4, currentY + 27.5);

  // Columna Derecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.primary);
  doc.text("DATOS DEL PASAJERO / CLIENTE", marginX + halfWidth + 4, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(`Nombre / Pasajero: ${data.nombreEncuestado || "Pasajero Anónimo"}`, marginX + halfWidth + 4, currentY + 11);
  doc.text(`Empresa / Contratista: ${data.empresaCliente || "TRANS SERVICES"}`, marginX + halfWidth + 4, currentY + 16.5);
  doc.text(`Canal de Registro: ${data.canal || "QR Móvil en Asiento"}`, marginX + halfWidth + 4, currentY + 22);
  doc.text(`Recomendaría: ${data.seriaRecomendado === "SI" ? "SÍ (100% Satisfecho)" : data.seriaRecomendado}`, marginX + halfWidth + 4, currentY + 27.5);

  currentY += 35;

  // 3. Matriz de Calificación de Criterios (5 Estrellas)
  doc.setFillColor(...PALETTE.headerBg);
  doc.rect(marginX, currentY, contentWidth, 7, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.primaryDark);
  doc.text("EVALUACIÓN CUANTITATIVA DE ESTÁNDARES DE CALIDAD Y CONFORT", marginX + 4, currentY + 4.8);

  currentY += 7;

  const criterios = [
    { nombre: "1. Limpieza, orden y estado higiénico del vehículo", nota: data.limpiezaVehiculo },
    { nombre: "2. Atención, amabilidad y presentación del conductor", nota: data.atencionConductor },
    { nombre: "3. Puntualidad en el recorrido y cumplimiento de itinerario", nota: data.puntualidad },
    { nombre: "4. Sensación de seguridad en la conducción y confort de marcha", nota: data.seguridadConfort },
  ];

  criterios.forEach((c, idx) => {
    const rowY = currentY + idx * 9;
    doc.setFillColor(idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]);
    doc.rect(marginX, rowY, contentWidth, 9, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.textMain);
    doc.text(c.nombre, marginX + 4, rowY + 5.8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.amber);
    const stars = "★".repeat(Math.max(1, Math.min(5, c.nota || 5))) + "☆".repeat(Math.max(0, 5 - (c.nota || 5)));
    doc.text(`${stars} (${c.nota || 5}/5)`, marginX + contentWidth - 4, rowY + 5.8, { align: "right" });
  });

  currentY += criterios.length * 9 + 4;

  // Resumen Global
  doc.setFillColor(...PALETTE.primaryLight);
  doc.rect(marginX, currentY, contentWidth, 12, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.primary);
  doc.text("CALIFICACIÓN GLOBAL DEL SERVICIO:", marginX + 4, currentY + 7.5);

  doc.setFontSize(10);
  doc.setTextColor(...PALETTE.amber);
  doc.text(
    `${"★".repeat(Math.round(data.calificacionGeneral || 5))} (${data.calificacionGeneral || 5}.0 / 5.0)`,
    marginX + contentWidth - 4,
    currentY + 7.5,
    { align: "right" }
  );

  currentY += 16;

  // 4. Comentarios y Observaciones del Usuario
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.primaryDark);
  doc.text("COMENTARIOS Y SUGERENCIAS DEL USUARIO:", marginX, currentY);

  currentY += 2.5;

  doc.setDrawColor(...PALETTE.border);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, contentWidth, 22, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMain);
  const comment = data.comentarios || "El usuario no registró observaciones adicionales. Servicio prestado de conformidad.";
  const lines = doc.splitTextToSize(comment, contentWidth - 8);
  doc.text(lines, marginX + 4, currentY + 5);

  currentY += 28;

  // 5. Firmas y Auditoría de Calidad
  const signColW = (contentWidth - 8) / 2;

  // Pasajero
  doc.setDrawColor(...PALETTE.border);
  doc.setFillColor(...PALETTE.white);
  doc.rect(marginX, currentY, signColW, 20, "FD");

  doc.line(marginX + 6, currentY + 13, marginX + signColW - 6, currentY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMain);
  doc.text(data.nombreEncuestado ? data.nombreEncuestado.toUpperCase() : "REGISTRO DIGITAL / CÓDIGO QR", marginX + signColW / 2, currentY + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("PASAJERO / USUARIO DEL SERVICIO", marginX + signColW / 2, currentY + 18.5, { align: "center" });

  // Auditor HSEQ
  doc.rect(marginX + signColW + 8, currentY, signColW, 20, "FD");
  doc.line(marginX + signColW + 14, currentY + 13, marginX + contentWidth - 6, currentY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.textMain);
  doc.text("COORDINADOR DE SERVICIO AL CLIENTE & HSEQ", marginX + signColW + 8 + signColW / 2, currentY + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text("CONTROL DE CALIDAD Y GESTIÓN DE MEJORA CONTINUA", marginX + signColW + 8 + signColW / 2, currentY + 18.5, { align: "center" });

  // Pie de Página
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.textMuted);
  doc.text(
    `Formato Oficial CAL-FOR-01 v02 • TRANS SERVICES A&B S.A.S. • NIT 901.621.579-2 • Generado el ${new Date().toLocaleString("es-CO")}`,
    marginX + contentWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  doc.save(`CAL-FOR-01_Encuesta_${data.placa || "servicio"}_${data.fecha}.pdf`);
}
