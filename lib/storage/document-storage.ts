import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import {
  ALLOWED_FILES,
  detectDocumentMimeType,
  MAX_DOCUMENT_BYTES,
  safeStorageSegment,
  sanitizeDocumentName,
} from "@/lib/storage/document-validation";

const SIGNED_URL_TTL_SECONDS = 10 * 60;

function getStorageConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_DEFAULT_REGION || "auto";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("El almacenamiento privado de documentos no está configurado.");
  }

  return { endpoint, accessKeyId, secretAccessKey, bucket, region };
}

function getClient() {
  const config = getStorageConfig();
  return {
    bucket: config.bucket,
    client: new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

function storageUri(bucket: string, key: string) {
  return `s3://${bucket}/${key}`;
}

function parseStorageUri(uri: string) {
  if (!uri.startsWith("s3://")) return null;
  const withoutScheme = uri.slice(5);
  const slashIndex = withoutScheme.indexOf("/");
  if (slashIndex <= 0) return null;
  return {
    bucket: withoutScheme.slice(0, slashIndex),
    key: withoutScheme.slice(slashIndex + 1),
  };
}

export async function storeDocumentFile(
  file: File,
  scope: { entityType: string; entityId: string; documentType: string },
) {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Debes seleccionar un archivo.");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("El archivo supera el límite de 10 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMimeType = detectDocumentMimeType(bytes);
  if (!detectedMimeType) {
    throw new Error("El contenido del archivo no corresponde a PDF, JPG, PNG o WEBP.");
  }
  if (file.type && file.type !== detectedMimeType) {
    throw new Error("El tipo declarado del archivo no coincide con su contenido.");
  }

  const definition = ALLOWED_FILES[detectedMimeType];
  const safeName = sanitizeDocumentName(file.name || "documento", definition.extension);

  if (!process.env.AWS_ENDPOINT_URL && process.env.NODE_ENV !== "production") {
    return {
      uri: `data:${detectedMimeType};base64,${Buffer.from(bytes).toString("base64")}`,
      name: safeName,
      mimeType: detectedMimeType,
      size: file.size,
    };
  }

  const { client, bucket } = getClient();
  const key = [
    "documentos",
    safeStorageSegment(scope.entityType),
    safeStorageSegment(scope.entityId),
    safeStorageSegment(scope.documentType),
    `${randomUUID()}-${safeName}`,
  ].join("/");

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: detectedMimeType,
    ContentLength: file.size,
    ContentDisposition: `inline; filename="${safeName}"`,
  }));

  return { uri: storageUri(bucket, key), name: safeName, mimeType: detectedMimeType, size: file.size };
}

export async function resolveDocumentUrl(uri: string) {
  const stored = parseStorageUri(uri);
  if (!stored) return uri;

  const { client } = getClient();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: stored.bucket, Key: stored.key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}

export async function deleteStoredDocument(uri: string | null | undefined) {
  if (!uri) return;
  const stored = parseStorageUri(uri);
  if (!stored) return;

  const { client } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: stored.bucket, Key: stored.key }));
}

export function formatDocumentSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}
