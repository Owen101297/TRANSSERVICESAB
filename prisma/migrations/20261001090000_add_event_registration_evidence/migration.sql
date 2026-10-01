-- Enlace individual y apertura manual del registro por actividad.
ALTER TABLE "EventoAsistencia"
  ADD COLUMN "tokenRegistro" TEXT,
  ADD COLUMN "registroAbierto" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "registroAbiertoAt" TIMESTAMP(3),
  ADD COLUMN "registroCerradoAt" TIMESTAMP(3),
  ADD COLUMN "permiteExternos" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "instruccionesRegistro" TEXT,
  ADD COLUMN "declaracionAsistencia" TEXT NOT NULL DEFAULT 'Confirmo que participé en esta actividad, recibí el contenido indicado y que los datos suministrados son correctos.';

UPDATE "EventoAsistencia"
SET "tokenRegistro" = md5("id" || clock_timestamp()::text || random()::text)
  || md5(random()::text || "id")
WHERE "tokenRegistro" IS NULL;

CREATE UNIQUE INDEX "EventoAsistencia_tokenRegistro_key"
  ON "EventoAsistencia"("tokenRegistro");

-- Evidencia individual de consentimiento y firma manuscrita electrónica.
ALTER TABLE "EventoParticipante"
  ADD COLUMN "tipoDocumento" TEXT,
  ADD COLUMN "firmaHash" TEXT,
  ADD COLUMN "firmaAt" TIMESTAMP(3),
  ADD COLUMN "declaracionFirmada" TEXT,
  ADD COLUMN "declaracionAceptadaAt" TIMESTAMP(3),
  ADD COLUMN "tratamientoDatosAt" TIMESTAMP(3),
  ADD COLUMN "registroCodigo" TEXT,
  ADD COLUMN "origenRegistro" TEXT NOT NULL DEFAULT 'convocatoria';

CREATE UNIQUE INDEX "EventoParticipante_registroCodigo_key"
  ON "EventoParticipante"("registroCodigo");

-- Metadatos de integridad para fotografías, capturas y reportes del evento.
ALTER TABLE "EventoEvidencia"
  ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'carga',
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "tamanoBytes" INTEGER,
  ADD COLUMN "hashSha256" TEXT,
  ADD COLUMN "capturadaAt" TIMESTAMP(3);

-- La firma del asistente es obligatoria en el flujo unificado.
UPDATE "EventoAsistencia" SET "requiereFirma" = true;
