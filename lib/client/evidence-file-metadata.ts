const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type EvidenceImageMimeType = keyof typeof IMAGE_EXTENSIONS;

export function evidenceFileMetadata(code: string, declaredType: string) {
  const type = declaredType.trim().toLowerCase() as EvidenceImageMimeType;
  const extension = IMAGE_EXTENSIONS[type];
  if (!extension) {
    throw new Error("El dispositivo no pudo exportar el collage en un formato compatible.");
  }

  const safeCode = code.replace(/[^A-Za-z0-9_-]/g, "-");
  return {
    name: `${safeCode}-evidencia.${extension}`,
    type,
  };
}
