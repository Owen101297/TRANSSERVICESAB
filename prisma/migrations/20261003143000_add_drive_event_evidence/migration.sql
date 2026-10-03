-- Trazabilidad de evidencias alojadas en Google Drive y vínculo individual.
ALTER TABLE "EventoEvidencia"
  ADD COLUMN "participanteId" TEXT,
  ADD COLUMN "driveFileId" TEXT,
  ADD COLUMN "validadaPorId" TEXT,
  ADD COLUMN "validadaPorNombre" TEXT,
  ADD COLUMN "validadaAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "EventoEvidencia_driveFileId_key"
  ON "EventoEvidencia"("driveFileId");

CREATE INDEX "EventoEvidencia_participanteId_idx"
  ON "EventoEvidencia"("participanteId");

ALTER TABLE "EventoEvidencia"
  ADD CONSTRAINT "EventoEvidencia_participanteId_fkey"
  FOREIGN KEY ("participanteId") REFERENCES "EventoParticipante"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
