import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import {
  ALLOWED_FILES,
  detectDocumentMimeType,
  safeStorageSegment,
  sanitizeDocumentName,
} from "../lib/storage/document-validation";

type Mode = "dry-run" | "apply" | "verify" | "rollback";
type Candidate = {
  table: "DocumentoAdjunto" | "DocumentoDigital";
  id: string;
  entityType: string;
  entityId: string;
  documentType: string;
  name: string;
  archivoUrl: string;
  mimeType: string | null;
};

const prisma = new PrismaClient();
const mode = (process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] || "dry-run") as Mode;
const supportedModes = new Set<Mode>(["dry-run", "apply", "verify", "rollback"]);

function storageConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_DEFAULT_REGION || "auto";
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Faltan variables del bucket S3.");
  }
  return {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function parseDataUrl(value: string) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);
  if (!match) throw new Error("DATA_URL_INVALID");
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  const detectedMime = detectDocumentMimeType(bytes);
  if (!detectedMime) throw new Error("SIGNATURE_INVALID");
  if (match[1] !== detectedMime) throw new Error("MIME_MISMATCH");
  return { bytes, mimeType: detectedMime };
}

function parseStorageUri(value: string) {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(value);
  return match ? { bucket: match[1], key: match[2] } : null;
}

function makeKey(candidate: Candidate, mimeType: keyof typeof ALLOWED_FILES) {
  const safeName = sanitizeDocumentName(candidate.name || candidate.documentType, ALLOWED_FILES[mimeType].extension);
  return [
    "documentos",
    safeStorageSegment(candidate.entityType),
    safeStorageSegment(candidate.entityId),
    safeStorageSegment(candidate.documentType),
    `legacy-${safeStorageSegment(candidate.table)}-${candidate.id}-${safeName}`,
  ].join("/");
}

async function listBase64Candidates(): Promise<Candidate[]> {
  const [adjuntos, digitales] = await Promise.all([
    prisma.documentoAdjunto.findMany({
      where: { archivoUrl: { startsWith: "data:" } },
      select: {
        id: true,
        entidadTipo: true,
        entidadId: true,
        tipoDocumento: true,
        nombre: true,
        archivoUrl: true,
        mimeType: true,
      },
    }),
    prisma.documentoDigital.findMany({
      where: { archivoUrl: { startsWith: "data:" } },
      select: {
        id: true,
        entidadTipo: true,
        entidadId: true,
        entidadNombre: true,
        tipoDocumento: true,
        nombre: true,
        archivoUrl: true,
        mimeType: true,
      },
    }),
  ]);

  return [
    ...adjuntos.map((row) => ({
      table: "DocumentoAdjunto" as const,
      id: row.id,
      entityType: row.entidadTipo,
      entityId: row.entidadId,
      documentType: row.tipoDocumento,
      name: row.nombre,
      archivoUrl: row.archivoUrl,
      mimeType: row.mimeType,
    })),
    ...digitales.map((row) => ({
      table: "DocumentoDigital" as const,
      id: row.id,
      entityType: row.entidadTipo,
      entityId: row.entidadId || row.entidadNombre || row.id,
      documentType: row.tipoDocumento,
      name: row.nombre,
      archivoUrl: row.archivoUrl,
      mimeType: row.mimeType,
    })),
  ];
}

async function updateUri(candidate: Candidate, from: string, to: string, mimeType: string, size: number) {
  if (candidate.table === "DocumentoAdjunto") {
    return prisma.documentoAdjunto.updateMany({
      where: { id: candidate.id, archivoUrl: from },
      data: { archivoUrl: to, mimeType, tamano: `${(size / 1024).toFixed(1)} KB` },
    });
  }
  return prisma.documentoDigital.updateMany({
    where: { id: candidate.id, archivoUrl: from },
    data: { archivoUrl: to, mimeType, tamanoBytes: size },
  });
}

async function dryRun() {
  const candidates = await listBase64Candidates();
  let valid = 0;
  let bytes = 0;
  const errors: Record<string, number> = {};
  for (const candidate of candidates) {
    try {
      const parsed = parseDataUrl(candidate.archivoUrl);
      valid += 1;
      bytes += parsed.bytes.length;
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      errors[code] = (errors[code] || 0) + 1;
    }
  }
  console.log(JSON.stringify({ mode, candidates: candidates.length, valid, invalid: candidates.length - valid, bytes, errors }));
  if (candidates.length !== valid) process.exitCode = 2;
}

async function applyMigration() {
  if (process.env.ALLOW_DOCUMENT_MIGRATION !== "true") {
    throw new Error("La aplicación requiere ALLOW_DOCUMENT_MIGRATION=true.");
  }
  const { client, bucket } = storageConfig();
  const candidates = await listBase64Candidates();
  let migrated = 0;
  let failed = 0;
  let bytes = 0;

  for (const candidate of candidates) {
    let key: string | null = null;
    try {
      const parsed = parseDataUrl(candidate.archivoUrl);
      key = makeKey(candidate, parsed.mimeType);
      const checksum = createHash("sha256").update(parsed.bytes).digest("hex");
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: parsed.bytes,
        ContentType: parsed.mimeType,
        ContentLength: parsed.bytes.length,
        Metadata: { sha256: checksum, migratedFrom: candidate.table.toLowerCase() },
      }));
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (head.ContentLength !== parsed.bytes.length || head.Metadata?.sha256 !== checksum) {
        throw new Error("OBJECT_VERIFICATION_FAILED");
      }
      const uri = `s3://${bucket}/${key}`;
      const updated = await updateUri(candidate, candidate.archivoUrl, uri, parsed.mimeType, parsed.bytes.length);
      if (updated.count !== 1) throw new Error("CONCURRENT_UPDATE");
      migrated += 1;
      bytes += parsed.bytes.length;
    } catch (error) {
      failed += 1;
      if (key) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
      console.error(JSON.stringify({ table: candidate.table, id: candidate.id, error: error instanceof Error ? error.message : "UNKNOWN" }));
    }
  }
  console.log(JSON.stringify({ mode, candidates: candidates.length, migrated, failed, bytes }));
  if (failed > 0) process.exitCode = 2;
}

async function listMigratedCandidates(): Promise<Candidate[]> {
  const [adjuntos, digitales] = await Promise.all([
    prisma.documentoAdjunto.findMany({ where: { archivoUrl: { startsWith: "s3://" } } }),
    prisma.documentoDigital.findMany({ where: { archivoUrl: { startsWith: "s3://" } } }),
  ]);
  return [
    ...adjuntos.map((row) => ({ table: "DocumentoAdjunto" as const, id: row.id, entityType: row.entidadTipo, entityId: row.entidadId, documentType: row.tipoDocumento, name: row.nombre, archivoUrl: row.archivoUrl, mimeType: row.mimeType })),
    ...digitales.map((row) => ({ table: "DocumentoDigital" as const, id: row.id, entityType: row.entidadTipo, entityId: row.entidadId || row.entidadNombre || row.id, documentType: row.tipoDocumento, name: row.nombre, archivoUrl: row.archivoUrl, mimeType: row.mimeType })),
  ].filter((row) => row.archivoUrl.includes("/legacy-"));
}

async function verifyMigration() {
  const { client } = storageConfig();
  const rows = await listMigratedCandidates();
  let verified = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const stored = parseStorageUri(row.archivoUrl);
      if (!stored) throw new Error("URI_INVALID");
      const head = await client.send(new HeadObjectCommand({ Bucket: stored.bucket, Key: stored.key }));
      if (!head.ContentLength || !head.Metadata?.sha256) throw new Error("METADATA_INVALID");
      verified += 1;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ table: row.table, id: row.id, error: error instanceof Error ? error.message : "UNKNOWN" }));
    }
  }
  console.log(JSON.stringify({ mode, records: rows.length, verified, failed }));
  if (failed > 0) process.exitCode = 2;
}

async function rollbackMigration() {
  if (process.env.ALLOW_DOCUMENT_ROLLBACK !== "true") {
    throw new Error("El rollback requiere ALLOW_DOCUMENT_ROLLBACK=true.");
  }
  const { client } = storageConfig();
  const rows = await listMigratedCandidates();
  let rolledBack = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const stored = parseStorageUri(row.archivoUrl);
      if (!stored) throw new Error("URI_INVALID");
      const object = await client.send(new GetObjectCommand({ Bucket: stored.bucket, Key: stored.key }));
      const bytes = Buffer.from(await object.Body!.transformToByteArray());
      const mimeType = detectDocumentMimeType(bytes);
      if (!mimeType) throw new Error("SIGNATURE_INVALID");
      const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
      const updated = await updateUri(row, row.archivoUrl, dataUrl, mimeType, bytes.length);
      if (updated.count !== 1) throw new Error("CONCURRENT_UPDATE");
      rolledBack += 1;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ table: row.table, id: row.id, error: error instanceof Error ? error.message : "UNKNOWN" }));
    }
  }
  console.log(JSON.stringify({ mode, records: rows.length, rolledBack, failed }));
  if (failed > 0) process.exitCode = 2;
}

async function main() {
  if (!supportedModes.has(mode)) throw new Error(`Modo no soportado: ${mode}`);
  if (mode === "dry-run") await dryRun();
  if (mode === "apply") await applyMigration();
  if (mode === "verify") await verifyMigration();
  if (mode === "rollback") await rollbackMigration();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
