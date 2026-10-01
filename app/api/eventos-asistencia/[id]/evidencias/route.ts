import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { textoOpcional, textoRequerido } from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";
import { deleteStoredDocument, storeDocumentFile } from "@/lib/storage/document-storage";

const CATEGORIES = new Set([
  "foto_presencial",
  "captura_virtual",
  "reporte_virtual",
  "practica",
  "material",
  "otro",
]);

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { id: eventoId } = await context.params;

  try {
    const evento = await prisma.eventoAsistencia.findUnique({ where: { id: eventoId } });
    if (!evento) {
      return NextResponse.json({ success: false, error: "Actividad no encontrada." }, { status: 404 });
    }
    if (evento.estado === "cancelado") {
      return NextResponse.json({ success: false, error: "La actividad cancelada no admite evidencias." }, { status: 409 });
    }

    const formData = await req.formData();
    const file = formData.get("archivo");
    if (!(file instanceof File)) throw new Error("Selecciona una fotografía, captura o reporte.");
    const requestedCategory = String(formData.get("categoria") || "otro");
    const categoria = CATEGORIES.has(requestedCategory) ? requestedCategory : "otro";
    const nombre = textoRequerido(formData.get("nombre") || file.name, "El nombre", 180);
    const descripcion = textoOpcional(formData.get("descripcion"), 800);
    const origen = formData.get("origen") === "captura" ? "captura" : "carga";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storeDocumentFile(file, {
      entityType: "evento-asistencia",
      entityId: eventoId,
      documentType: categoria,
    });

    const evidencia = await prisma.eventoEvidencia.create({
      data: {
        eventoId,
        categoria,
        nombre,
        descripcion,
        archivoUrl: stored.uri,
        almacenamiento: stored.uri.startsWith("s3://") ? "interno" : "local",
        origen,
        mimeType: stored.mimeType,
        tamanoBytes: stored.size,
        hashSha256: createHash("sha256").update(bytes).digest("hex"),
        capturadaAt: origen === "captura" ? new Date() : null,
        visibleEnPdf: formData.get("visibleEnPdf") !== "false",
        creadoPorId: auth.session.id,
        creadoPorNombre: auth.session.nombre,
      },
    });
    await recordAudit({ action: "CREATE", entityType: "EventoEvidencia", entityId: evidencia.id, after: evidencia, actor: auth.session });
    return NextResponse.json({ success: true, evidencia }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible guardar la evidencia.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(["hseq", "administrativo"]);
  if (auth.response) return auth.response;
  const { id: eventoId } = await context.params;
  const evidenceId = new URL(req.url).searchParams.get("evidenciaId");
  if (!evidenceId) {
    return NextResponse.json({ success: false, error: "La evidencia es obligatoria." }, { status: 400 });
  }
  const before = await prisma.eventoEvidencia.findFirst({ where: { id: evidenceId, eventoId } });
  if (!before) {
    return NextResponse.json({ success: false, error: "Evidencia no encontrada." }, { status: 404 });
  }
  await deleteStoredDocument(before.archivoUrl);
  await prisma.eventoEvidencia.delete({ where: { id: evidenceId } });
  await recordAudit({ action: "DELETE", entityType: "EventoEvidencia", entityId: evidenceId, before, actor: auth.session });
  return NextResponse.json({ success: true });
}
