-- Expedientes de eventos y asistencia, convocatoria, novedades y evidencia documental.
CREATE TABLE "EventoAsistencia" (
    "id" TEXT NOT NULL,
    "consecutivo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "caracter" TEXT NOT NULL DEFAULT 'informativo',
    "proceso" TEXT NOT NULL DEFAULT 'hseq',
    "objetivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "modalidad" TEXT NOT NULL DEFAULT 'presencial',
    "lugar" TEXT NOT NULL,
    "proyecto" TEXT,
    "responsableId" TEXT,
    "responsableNombre" TEXT NOT NULL,
    "facilitadorTipo" TEXT NOT NULL DEFAULT 'interno',
    "facilitadorNombre" TEXT NOT NULL,
    "facilitadorEmpresa" TEXT,
    "facilitadorDocumento" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "toleranciaMinutos" INTEGER NOT NULL DEFAULT 15,
    "permanenciaMinima" INTEGER NOT NULL DEFAULT 80,
    "requiereEntrada" BOOLEAN NOT NULL DEFAULT true,
    "requiereSalida" BOOLEAN NOT NULL DEFAULT false,
    "requiereFirma" BOOLEAN NOT NULL DEFAULT true,
    "requiereFoto" BOOLEAN NOT NULL DEFAULT false,
    "requiereEvaluacion" BOOLEAN NOT NULL DEFAULT false,
    "notaMinima" DOUBLE PRECISION,
    "contenido" TEXT,
    "materialUrl" TEXT,
    "observacionesCierre" TEXT,
    "cerradoExcepcional" BOOLEAN NOT NULL DEFAULT false,
    "motivoCierreExcepcional" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "creadoPorNombre" TEXT NOT NULL,
    "aprobadoPorId" TEXT,
    "aprobadoPorNombre" TEXT,
    "aprobadoAt" TIMESTAMP(3),
    "cerradoPorId" TEXT,
    "cerradoPorNombre" TEXT,
    "cerradoAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventoAsistencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventoParticipante" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "personaId" TEXT,
    "personaNombre" TEXT NOT NULL,
    "personaDocumento" TEXT,
    "tipoPersona" TEXT NOT NULL DEFAULT 'interno',
    "empresa" TEXT,
    "cargo" TEXT,
    "proyecto" TEXT,
    "tipoConvocatoria" TEXT NOT NULL DEFAULT 'obligatoria',
    "condicionLaboral" TEXT NOT NULL DEFAULT 'disponible',
    "resultadoPreliminar" TEXT NOT NULL DEFAULT 'pendiente',
    "resultadoDefinitivo" TEXT,
    "horaEntrada" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "firmaUrl" TEXT,
    "fotoUrl" TEXT,
    "calificacion" DOUBLE PRECISION,
    "evaluacionEstado" TEXT,
    "justificacionTipo" TEXT,
    "justificacionDetalle" TEXT,
    "justificacionSoporteUrl" TEXT,
    "justificacionEstado" TEXT,
    "observaciones" TEXT,
    "registroManual" BOOLEAN NOT NULL DEFAULT false,
    "validadoPorId" TEXT,
    "validadoPorNombre" TEXT,
    "validadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventoParticipante_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NovedadPersonal" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "soporteUrl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "registradoPorId" TEXT NOT NULL,
    "registradoPorNombre" TEXT NOT NULL,
    "aprobadoPorId" TEXT,
    "aprobadoPorNombre" TEXT,
    "aprobadoAt" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NovedadPersonal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventoDocumento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'formato',
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "estadoDatos" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventoDocumento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventoEvidencia" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "archivoUrl" TEXT NOT NULL,
    "almacenamiento" TEXT NOT NULL DEFAULT 'externo',
    "visibleEnPdf" BOOLEAN NOT NULL DEFAULT true,
    "validada" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" TEXT NOT NULL,
    "creadoPorNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventoEvidencia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventoAsistencia_consecutivo_key" ON "EventoAsistencia"("consecutivo");
CREATE INDEX "EventoAsistencia_fechaInicio_idx" ON "EventoAsistencia"("fechaInicio");
CREATE INDEX "EventoAsistencia_estado_idx" ON "EventoAsistencia"("estado");
CREATE INDEX "EventoAsistencia_tipo_idx" ON "EventoAsistencia"("tipo");
CREATE INDEX "EventoAsistencia_proceso_idx" ON "EventoAsistencia"("proceso");
CREATE UNIQUE INDEX "EventoParticipante_eventoId_personaId_key" ON "EventoParticipante"("eventoId", "personaId");
CREATE INDEX "EventoParticipante_eventoId_resultadoDefinitivo_idx" ON "EventoParticipante"("eventoId", "resultadoDefinitivo");
CREATE INDEX "EventoParticipante_personaDocumento_idx" ON "EventoParticipante"("personaDocumento");
CREATE INDEX "NovedadPersonal_personaId_fechaInicio_fechaFin_idx" ON "NovedadPersonal"("personaId", "fechaInicio", "fechaFin");
CREATE INDEX "NovedadPersonal_estado_idx" ON "NovedadPersonal"("estado");
CREATE UNIQUE INDEX "EventoDocumento_eventoId_codigo_key" ON "EventoDocumento"("eventoId", "codigo");
CREATE INDEX "EventoEvidencia_eventoId_categoria_idx" ON "EventoEvidencia"("eventoId", "categoria");

ALTER TABLE "EventoParticipante" ADD CONSTRAINT "EventoParticipante_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoParticipante" ADD CONSTRAINT "EventoParticipante_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NovedadPersonal" ADD CONSTRAINT "NovedadPersonal_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoDocumento" ADD CONSTRAINT "EventoDocumento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoEvidencia" ADD CONSTRAINT "EventoEvidencia_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
