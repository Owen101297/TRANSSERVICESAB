export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_FILES = {
  "application/pdf": { extension: "pdf", signatures: [[0x25, 0x50, 0x44, 0x46, 0x2d]] },
  "image/jpeg": { extension: "jpg", signatures: [[0xff, 0xd8, 0xff]] },
  "image/png": { extension: "png", signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  "image/webp": { extension: "webp", signatures: [[0x52, 0x49, 0x46, 0x46]] },
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_FILES;
export type DocumentEntityType = "persona" | "vehiculo" | "contratista";

export function buildDocumentAttachmentScope(
  entityType: DocumentEntityType,
  entityId: string,
  documentId?: string,
) {
  const cleanEntityId = entityId.trim();
  const cleanDocumentId = documentId?.trim();
  if (!cleanEntityId || (documentId !== undefined && !cleanDocumentId)) {
    throw new Error("El identificador documental no es válido.");
  }

  return {
    entidadTipo: entityType,
    entidadId: cleanEntityId,
    ...(cleanDocumentId ? { id: cleanDocumentId } : {}),
  };
}

function matchesSignature(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function detectDocumentMimeType(bytes: Uint8Array): AllowedMimeType | null {
  if (
    bytes.length >= 12 &&
    matchesSignature(bytes, ALLOWED_FILES["image/webp"].signatures[0]) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  for (const [mimeType, definition] of Object.entries(ALLOWED_FILES)) {
    if (mimeType === "image/webp") continue;
    if (definition.signatures.some((signature) => matchesSignature(bytes, signature))) {
      return mimeType as AllowedMimeType;
    }
  }
  return null;
}

export function safeStorageSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "documento";
}

export function sanitizeDocumentName(name: string, extension: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  return `${safeStorageSegment(baseName)}.${extension}`;
}
