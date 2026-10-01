import { COMPANY_INFO, FIRMA_HSEQ_BASE64, LOGO_TRANSSERVICES_BASE64 } from "./companyAssets";

interface ParticipantePdf {
  personaNombre: string;
  personaDocumento?: string | null;
  tipoPersona: string;
  tipoConvocatoria: string;
  condicionLaboral: string;
  resultadoPreliminar: string;
  resultadoDefinitivo?: string | null;
  horaEntrada?: string | null;
  observaciones?: string | null;
  firmaUrl?: string | null;
}

interface EventoPdf {
  consecutivo: string;
  nombre: string;
  tipo: string;
  proceso: string;
  objetivo: string;
  fechaInicio: string;
  fechaFin: string;
  lugar: string;
  responsableNombre: string;
  facilitadorNombre: string;
  revision?: number;
  estado: string;
  documentos: Array<{ codigo: string; version: string }>;
  participantes: ParticipantePdf[];
  cerradoPorNombre?: string | null;
  cerradoAt?: string | null;
  cerradoExcepcional?: boolean;
  motivoCierreExcepcional?: string | null;
  evidencias?: Array<{
    nombre: string;
    categoria: string;
    descripcion?: string | null;
    hashSha256?: string | null;
    createdAt: string;
  }>;
}

function fecha(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  });
}

export async function generateEventoAsistenciaPDF(evento: EventoPdf) {
  const jspdfModule = await import("jspdf");
  const JsPdf = (jspdfModule as any).jsPDF || (jspdfModule as any).default || jspdfModule;
  const doc = new JsPdf({ orientation: "landscape", unit: "mm", format: "letter" });
  const width = 279.4;
  const height = 215.9;
  const margin = 10;
  const rowsPerPage = 14;
  const pages = Math.max(1, Math.ceil(evento.participantes.length / rowsPerPage));
  const documento = evento.documentos.find((item) => item.codigo === "TH-FOR-03") || evento.documentos[0];
  const codigo = documento?.codigo || "TH-FOR-03";
  const version = documento?.version || "03";

  for (let page = 0; page < pages; page += 1) {
    if (page > 0) doc.addPage("letter", "landscape");
    try { doc.addImage(LOGO_TRANSSERVICES_BASE64, "PNG", margin + 3, 7, 34, 13, undefined, "FAST"); } catch {}
    doc.setDrawColor(148, 163, 184);
    doc.rect(margin, 6, width - margin * 2, 18);
    doc.line(margin + 42, 6, margin + 42, 24);
    doc.line(width - margin - 48, 6, width - margin - 48, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SISTEMA INTEGRADO DE GESTIÓN (HSEQ - PESV)", width / 2, 12, { align: "center" });
    doc.setFontSize(11);
    doc.text("REGISTRO DE ASISTENCIA", width / 2, 19, { align: "center" });
    doc.setFontSize(7);
    doc.text(`CÓDIGO: ${codigo}`, width - margin - 45, 11);
    doc.text(`VERSIÓN: ${version}`, width - margin - 45, 16);
    doc.text(`PÁGINA: ${page + 1} de ${pages}`, width - margin - 45, 21);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${COMPANY_INFO.name || "TRANS SERVICES A&B S.A.S."} · ${COMPANY_INFO.nit}`, margin, 29);
    doc.setFont("helvetica", "bold");
    doc.text(`${evento.consecutivo} · ${evento.nombre}`, margin, 35);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${fecha(evento.fechaInicio)} a ${fecha(evento.fechaFin)}`, margin, 40);
    doc.text(`Lugar: ${evento.lugar}`, margin + 92, 40);
    doc.text(`Responsable: ${evento.responsableNombre}`, margin, 45);
    doc.text(`Facilitador: ${evento.facilitadorNombre}`, margin + 92, 45);
    const objectiveLines = doc.splitTextToSize(`Objetivo: ${evento.objetivo}`, width - margin * 2);
    doc.text(objectiveLines.slice(0, 2), margin, 50);

    const startY = 61;
    const columns = [10, 18, 70, 95, 125, 150, 174, 215, 269];
    const headers = ["N.º", "Nombre", "Documento", "Convocatoria", "Condición", "Entrada", "Resultado", "Firma"];
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, startY, width - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    headers.forEach((header, index) => doc.text(header, columns[index] + 1, startY + 5));
    doc.setFont("helvetica", "normal");

    const pageRows = evento.participantes.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    pageRows.forEach((p, index) => {
      const y = startY + 8 + index * 7.6;
      const result = p.resultadoDefinitivo || p.resultadoPreliminar;
      const values = [
        String(page * rowsPerPage + index + 1),
        p.personaNombre,
        p.personaDocumento || "—",
        p.tipoConvocatoria,
        p.condicionLaboral,
        p.horaEntrada ? fecha(p.horaEntrada).split(", ").pop() || "—" : "—",
        result.replaceAll("_", " "),
      ];
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, width - margin * 2, 7.6);
      for (let column = 1; column < columns.length - 1; column += 1) doc.line(columns[column], y, columns[column], y + 7.6);
      doc.setFontSize(6.2);
      values.forEach((value, column) => {
        const maxWidth = columns[column + 1] - columns[column] - 2;
        const clipped = doc.splitTextToSize(value, maxWidth)[0] || "";
        doc.text(clipped, columns[column] + 1, y + 4.8);
      });
      if (p.firmaUrl?.startsWith("data:image/")) {
        try {
          const format = p.firmaUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          doc.addImage(p.firmaUrl, format, columns[7] + 2, y + 0.8, 28, 5.8, undefined, "FAST");
        } catch {}
      } else {
        doc.setFontSize(5.8);
        doc.text("Sin firma", columns[7] + 2, y + 4.8);
      }
    });

    if (page === pages - 1 && evento.estado === "cerrado") {
      const signY = 180;
      doc.setDrawColor(148, 163, 184);
      doc.rect(margin, signY, 84, 21);
      try { doc.addImage(FIRMA_HSEQ_BASE64, "PNG", margin + 23, signY + 1, 36, 11, undefined, "FAST"); } catch {}
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(evento.cerradoPorNombre || "COORDINADOR HSEQ", margin + 42, signY + 15, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(`Cierre administrativo${evento.cerradoAt ? ` · ${fecha(evento.cerradoAt)}` : ""}`, margin + 42, signY + 19, { align: "center" });
      if (evento.cerradoExcepcional) {
        doc.setTextColor(180, 83, 9);
        doc.text(`CIERRE EXCEPCIONAL: ${evento.motivoCierreExcepcional || "motivo registrado en auditoría"}`, margin + 90, signY + 8);
        doc.setTextColor(71, 85, 105);
      }
    }

    const footerY = height - 12;
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    const generated = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
    doc.text(`Expediente ${evento.consecutivo} · Revisión ${evento.revision || 1} · Estado ${evento.estado} · Generado bajo demanda: ${generated}`, margin, footerY);
    doc.text(`${codigo} v${version}`, width - margin, footerY, { align: "right" });
    if (evento.estado !== "cerrado") {
      doc.setTextColor(190, 24, 93);
      doc.setFontSize(26);
      doc.text("BORRADOR", width / 2, height / 2, { align: "center", angle: 25 });
    }
  }

  if (evento.evidencias?.length) {
    doc.addPage("letter", "landscape");
    doc.setDrawColor(148, 163, 184);
    doc.rect(margin, 8, width - margin * 2, 18);
    try { doc.addImage(LOGO_TRANSSERVICES_BASE64, "PNG", margin + 3, 9, 34, 13, undefined, "FAST"); } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ANEXO DE EVIDENCIAS DEL EXPEDIENTE", width / 2, 18, { align: "center" });
    doc.setFontSize(7);
    doc.text(`${evento.consecutivo} · ${evento.nombre}`, margin, 34);
    let y = 43;
    evento.evidencias.slice(0, 18).forEach((item, index) => {
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, width - margin * 2, 8);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${item.nombre}`, margin + 2, y + 3.5);
      doc.setFont("helvetica", "normal");
      const meta = `${item.categoria.replaceAll("_", " ")} · ${fecha(item.createdAt)}${item.hashSha256 ? ` · SHA-256 ${item.hashSha256.slice(0, 20)}…` : ""}`;
      doc.text(meta, margin + 2, y + 6.5);
      y += 8;
    });
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text("Los archivos originales y sus metadatos se conservan en el expediente digital.", margin, height - 12);
  }

  const safeName = evento.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
  doc.save(`${codigo}_${evento.consecutivo}_${safeName}.pdf`);
}
