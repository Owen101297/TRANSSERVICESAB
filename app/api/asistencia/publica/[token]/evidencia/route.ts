import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { validarTokenEvidencia } from "@/lib/eventos-asistencia";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  deleteDriveFile,
  parseDriveStorageUri,
  uploadEventEvidenceToDrive,
} from "@/lib/storage/google-drive";
import { detectDocumentMimeType } from "@/lib/storage/document-validation";

export const dynamic = "force-dynamic";

const MAX_REMOTE_EVIDENCE_BYTES = 5 * 1024 * 1024;

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const limit = consumeRateLimit(`attendance-evidence:${clientIp(req)}:${token.slice(0, 16)}`, 12, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Se alcanzó el límite de intentos para la evidencia. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let uploadedFileId: string | null = null;
  try {
    const formData = await req.formData();
    const authorization = validarTokenEvidencia(formData.get("evidenciaToken"));
    const file = formData.get("archivo");
    if (!(file instanceof File) || file.size === 0) throw new Error("Prepara la evidencia antes de continuar.");
    if (file.size > MAX_REMOTE_EVIDENCE_BYTES) throw new Error("La evidencia supera el límite de 5 MB.");

    const evento = await prisma.eventoAsistencia.findUnique({ where: { tokenRegistro: token } });
    if (!evento || evento.id !== authorization.eventoId) {
      return NextResponse.json({ success: false, error: "El enlace de asistencia no es válido." }, { status: 404 });
    }
    if (!evento.requiereFoto || evento.modalidad !== "remota") {
      return NextResponse.json({ success: false, error: "Esta actividad no requiere evidencia individual remota." }, { status: 409 });
    }
    if (evento.estado === "cancelado") {
      return NextResponse.json({ success: false, error: "La actividad fue cancelada." }, { status: 409 });
    }
    const participante = await prisma.eventoParticipante.findFirst({
      where: { id: authorization.participanteId, eventoId: evento.id, firmaAt: { not: null } },
    });
    if (!participante) {
      return NextResponse.json({ success: false, error: "No encontramos la asistencia firmada asociada." }, { status: 404 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectDocumentMimeType(bytes);
    if (!mimeType?.startsWith("image/")) throw new Error("La evidencia debe ser una imagen JPG, PNG o WEBP válida.");
    if (file.type && file.type !== mimeType) throw new Error("El tipo declarado no coincide con la imagen recibida.");
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    const stored = await uploadEventEvidenceToDrive({
      bytes,
      mimeType,
      fileName: `${evento.consecutivo}-${participante.registroCodigo || participante.id}-evidencia.${extension}`,
      eventoId: evento.id,
      consecutivo: evento.consecutivo,
      eventoNombre: evento.nombre,
      fechaInicio: evento.fechaInicio,
      participantId: participante.id,
      registroCodigo: participante.registroCodigo,
    });
    uploadedFileId = stored.id;
    const hashSha256 = createHash("sha256").update(bytes).digest("hex");
    const previous = await prisma.eventoEvidencia.findFirst({
      where: { eventoId: evento.id, participanteId: participante.id, categoria: "selfie_remota" },
      orderBy: { createdAt: "desc" },
    });

    const evidencia = await prisma.$transaction(async (tx) => {
      const saved = previous
        ? await tx.eventoEvidencia.update({
            where: { id: previous.id },
            data: {
              nombre: `Evidencia remota · ${participante.personaNombre}`,
              descripcion: "Collage normalizado con selfie, material consultado y constancia de asistencia.",
              archivoUrl: stored.uri,
              driveFileId: stored.id,
              almacenamiento: "drive",
              origen: "captura",
              mimeType: stored.mimeType,
              tamanoBytes: stored.size,
              hashSha256,
              capturadaAt: new Date(),
              visibleEnPdf: true,
            },
          })
        : await tx.eventoEvidencia.create({
            data: {
              eventoId: evento.id,
              participanteId: participante.id,
              categoria: "selfie_remota",
              nombre: `Evidencia remota · ${participante.personaNombre}`,
              descripcion: "Collage normalizado con selfie, material consultado y constancia de asistencia.",
              archivoUrl: stored.uri,
              driveFileId: stored.id,
              almacenamiento: "drive",
              origen: "captura",
              mimeType: stored.mimeType,
              tamanoBytes: stored.size,
              hashSha256,
              capturadaAt: new Date(),
              visibleEnPdf: true,
              creadoPorId: participante.personaId || participante.id,
              creadoPorNombre: participante.personaNombre,
            },
          });
      await tx.eventoParticipante.update({
        where: { id: participante.id },
        data: { fotoUrl: stored.uri },
      });
      await tx.auditLog.create({
        data: {
          actorId: participante.personaId || participante.id,
          actorName: participante.personaNombre,
          actorRole: participante.tipoPersona,
          action: previous ? "UPDATE" : "CREATE",
          entityType: "EventoEvidencia",
          entityId: saved.id,
          metadata: {
            operation: "REMOTE_ATTENDANCE_EVIDENCE",
            eventoId: evento.id,
            participanteId: participante.id,
            registroCodigo: participante.registroCodigo,
            hashSha256,
            storage: "google-drive",
          },
          ipAddress: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });
      return saved;
    });
    uploadedFileId = null;

    const previousFileId = previous?.driveFileId || parseDriveStorageUri(previous?.archivoUrl);
    if (previousFileId && previousFileId !== stored.id) {
      try {
        await deleteDriveFile(previousFileId);
      } catch {
        // El nuevo archivo ya es la evidencia canónica; la limpieza puede reintentarse manualmente.
      }
    }
    return NextResponse.json({
      success: true,
      evidencia: { id: evidencia.id, hashSha256, guardadaEn: "Google Drive" },
    });
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteDriveFile(uploadedFileId);
      } catch {
        // Evita ocultar el error original.
      }
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "No fue posible guardar la evidencia." },
      { status: 400 },
    );
  }
}
