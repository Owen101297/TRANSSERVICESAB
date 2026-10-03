ALTER TABLE "EventoAsistencia"
ADD COLUMN "materialOrigen" TEXT NOT NULL DEFAULT 'no_aplica',
ADD COLUMN "validacionTipo" TEXT NOT NULL DEFAULT 'solo_asistencia',
ADD COLUMN "enlaceReunion" TEXT,
ADD COLUMN "evidenciaTipo" TEXT NOT NULL DEFAULT 'no_aplica';

UPDATE "EventoAsistencia"
SET "materialOrigen" = CASE
  WHEN "facilitadorTipo" = 'externo' THEN 'facilitador_externo'
  WHEN "materialUrl" IS NOT NULL THEN 'empresa'
  ELSE 'no_aplica'
END,
"validacionTipo" = CASE
  WHEN "requiereEvaluacion" = TRUE AND "materialUrl" IS NOT NULL THEN 'formulario_aprobado'
  WHEN "materialUrl" IS NOT NULL THEN 'formulario_enviado'
  ELSE 'solo_asistencia'
END,
"evidenciaTipo" = CASE
  WHEN "requiereFoto" = TRUE AND "modalidad" = 'remota' THEN 'individual'
  WHEN "requiereFoto" = TRUE THEN 'general'
  WHEN "modalidad" IN ('presencial', 'virtual') THEN 'general'
  WHEN "modalidad" = 'mixta' THEN 'ambas'
  ELSE 'no_aplica'
END;

CREATE TABLE "EventoValidacionFormulario" (
  "id" TEXT NOT NULL,
  "eventoId" TEXT NOT NULL,
  "personaDocumento" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "calificacion" DOUBLE PRECISION,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventoValidacionFormulario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventoValidacionFormulario_eventoId_responseId_key"
ON "EventoValidacionFormulario"("eventoId", "responseId");

CREATE INDEX "EventoValidacionFormulario_eventoId_personaDocumento_idx"
ON "EventoValidacionFormulario"("eventoId", "personaDocumento");

CREATE INDEX "EventoValidacionFormulario_eventoId_estado_idx"
ON "EventoValidacionFormulario"("eventoId", "estado");

ALTER TABLE "EventoValidacionFormulario"
ADD CONSTRAINT "EventoValidacionFormulario_eventoId_fkey"
FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
