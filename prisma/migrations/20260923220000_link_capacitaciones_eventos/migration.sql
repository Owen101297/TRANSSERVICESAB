-- Converge el histórico de capacitaciones con el expediente oficial de eventos.
-- La relación es opcional para preservar compatibilidad durante la transición.
ALTER TABLE "Capacitacion" ADD COLUMN "eventoId" TEXT;

INSERT INTO "EventoAsistencia" (
  "id", "consecutivo", "nombre", "tipo", "caracter", "proceso", "objetivo",
  "fechaInicio", "fechaFin", "modalidad", "lugar", "proyecto",
  "responsableNombre", "facilitadorTipo", "facilitadorNombre", "estado",
  "requiereEntrada", "requiereSalida", "requiereFirma", "requiereFoto",
  "requiereEvaluacion", "notaMinima", "contenido", "materialUrl",
  "creadoPorId", "creadoPorNombre", "aprobadoPorId", "aprobadoPorNombre",
  "aprobadoAt", "cerradoPorId", "cerradoPorNombre", "cerradoAt",
  "createdAt", "updatedAt"
)
SELECT
  'legacy-cap-' || c."id",
  'CAP-' || c."id",
  c."nombre",
  CASE
    WHEN c."categoria" = 'induccion' THEN 'induccion'
    WHEN c."categoria" = 'entrenamiento' THEN 'entrenamiento_practico'
    WHEN c."categoria" = 'charla_semanal' THEN 'charla_formativa'
    ELSE 'capacitacion'
  END,
  'formativo',
  CASE WHEN c."tipo" = 'sg-sst' THEN 'sg-sst' ELSE c."tipo" END,
  COALESCE(NULLIF(c."objetivo", ''), 'Actividad formativa migrada desde el módulo de capacitaciones.'),
  c."fecha",
  c."fecha" + (GREATEST(c."duracionHoras", 0.25) * interval '1 hour'),
  CASE WHEN COALESCE(c."lugar", '') ILIKE '%virtual%' OR COALESCE(c."lugar", '') ILIKE '%digital%' THEN 'virtual' ELSE 'presencial' END,
  COALESCE(NULLIF(c."lugar", ''), 'Por definir'),
  NULL,
  COALESCE(NULLIF(c."facilitador", ''), 'Coordinación HSEQ'),
  'interno',
  COALESCE(NULLIF(c."facilitador", ''), 'Coordinación HSEQ'),
  CASE WHEN c."estado" = 'realizada' THEN 'cerrado' WHEN c."estado" = 'cancelada' THEN 'cancelado' ELSE 'programado' END,
  TRUE, FALSE, c."requiereFirma", c."requiereSelfie",
  CASE WHEN jsonb_array_length(COALESCE(c."preguntas"::jsonb, '[]'::jsonb)) > 0 THEN TRUE ELSE FALSE END,
  CASE WHEN jsonb_array_length(COALESCE(c."preguntas"::jsonb, '[]'::jsonb)) > 0 THEN 80 ELSE NULL END,
  c."materialContenido", c."materialUrl",
  'migracion', 'Migración del sistema', 'migracion', 'Migración del sistema',
  c."createdAt",
  CASE WHEN c."estado" = 'realizada' THEN 'migracion' ELSE NULL END,
  CASE WHEN c."estado" = 'realizada' THEN 'Migración del sistema' ELSE NULL END,
  CASE WHEN c."estado" = 'realizada' THEN c."updatedAt" ELSE NULL END,
  c."createdAt", c."updatedAt"
FROM "Capacitacion" c
WHERE NOT EXISTS (
  SELECT 1 FROM "EventoAsistencia" e WHERE e."id" = 'legacy-cap-' || c."id"
);

UPDATE "Capacitacion"
SET "eventoId" = 'legacy-cap-' || "id"
WHERE "eventoId" IS NULL;

INSERT INTO "EventoDocumento" (
  "id", "eventoId", "codigo", "nombre", "version", "tipo", "obligatorio", "estadoDatos", "createdAt", "updatedAt"
)
SELECT
  'legacy-doc-' || c."id",
  c."eventoId",
  'TH-FOR-04',
  'Registro de capacitación',
  '02',
  'formato',
  TRUE,
  CASE WHEN c."estado" = 'realizada' THEN 'completo' ELSE 'pendiente' END,
  c."createdAt",
  c."updatedAt"
FROM "Capacitacion" c
WHERE c."eventoId" IS NOT NULL
ON CONFLICT ("eventoId", "codigo") DO NOTHING;

INSERT INTO "EventoParticipante" (
  "id", "eventoId", "personaId", "personaNombre", "personaDocumento", "tipoPersona",
  "cargo", "proyecto", "tipoConvocatoria", "condicionLaboral", "resultadoPreliminar",
  "resultadoDefinitivo", "horaEntrada", "firmaUrl", "fotoUrl", "calificacion",
  "evaluacionEstado", "observaciones", "registroManual", "createdAt", "updatedAt"
)
SELECT
  'legacy-part-' || a."id",
  c."eventoId",
  p."id",
  a."personaNombre",
  a."personaDocumento",
  CASE WHEN a."personaId" IS NULL THEN 'externo' ELSE 'interno' END,
  a."cargo", a."proyecto", 'obligatoria', 'disponible',
  CASE WHEN a."estado" = 'tardanza' THEN 'tardanza' WHEN a."asistio" THEN 'presente' ELSE 'pendiente' END,
  CASE WHEN a."estado" = 'tardanza' THEN 'tardanza' WHEN a."asistio" THEN 'presente' ELSE 'ausencia_no_justificada' END,
  a."fecha", a."firmaUrl", a."fotoUrl", a."calificacion",
  CASE WHEN a."calificacion" IS NULL THEN NULL WHEN a."calificacion" >= 80 THEN 'aprobada' ELSE 'no_aprobada' END,
  a."observaciones", TRUE, a."createdAt", a."updatedAt"
FROM "AsistenciaRegistro" a
JOIN "Capacitacion" c ON c."id" = a."capacitacionId"
LEFT JOIN "Persona" p ON p."id" = a."personaId"
WHERE c."eventoId" IS NOT NULL
ON CONFLICT ("eventoId", "personaId") DO NOTHING;

CREATE UNIQUE INDEX "Capacitacion_eventoId_key" ON "Capacitacion"("eventoId");
ALTER TABLE "Capacitacion"
  ADD CONSTRAINT "Capacitacion_eventoId_fkey"
  FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
