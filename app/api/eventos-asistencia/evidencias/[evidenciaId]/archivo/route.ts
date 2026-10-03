import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveDocumentUrl } from "@/lib/storage/document-storage";
import { getDriveFile, parseDriveStorageUri } from "@/lib/storage/google-drive";

export const dynamic = "force-dynamic";

function contentDisposition(name: string) {
  const safe = name.replace(/[\r\n"]/g, "-").slice(0, 180) || "evidencia";
  return `inline; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ evidenciaId: string }> },
) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  const { evidenciaId } = await context.params;
  const evidencia = await prisma.eventoEvidencia.findUnique({ where: { id: evidenciaId } });
  if (!evidencia) {
    return NextResponse.json({ success: false, error: "Evidencia no encontrada." }, { status: 404 });
  }

  const driveFileId = evidencia.driveFileId || parseDriveStorageUri(evidencia.archivoUrl);
  if (driveFileId) {
    try {
      const { metadata, response } = await getDriveFile(driveFileId);
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": metadata.mimeType || evidencia.mimeType || "application/octet-stream",
          "Content-Disposition": contentDisposition(metadata.name || evidencia.nombre),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : "No fue posible abrir la evidencia." },
        { status: 502 },
      );
    }
  }

  const legacyUrl = await resolveDocumentUrl(evidencia.archivoUrl);
  if (/^https?:\/\//i.test(legacyUrl)) return NextResponse.redirect(legacyUrl);
  return NextResponse.json(
    { success: false, error: "La evidencia histórica no tiene una ubicación disponible." },
    { status: 410 },
  );
}
