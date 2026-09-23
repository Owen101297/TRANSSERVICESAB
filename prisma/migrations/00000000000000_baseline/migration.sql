-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'CC',
    "numeroDocumento" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "perfiles" TEXT[],
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contratistaId" TEXT,
    "contratistaNombre" TEXT,
    "fotoIniciales" TEXT NOT NULL,
    "pin" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenciaConduccion" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "categorias" TEXT[],
    "fechaVencimiento" TIMESTAMP(3),
    "organismoTransito" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenciaConduccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamenMedico" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'periodico',
    "fechaRealizacion" TIMESTAMP(3),
    "fechaVigencia" TIMESTAMP(3),
    "enfasis" TEXT[],
    "concepto" TEXT NOT NULL DEFAULT 'apto',
    "restricciones" TEXT,
    "centroMedico" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamenMedico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatosSalud" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "grupoSanguineoRH" TEXT NOT NULL,
    "eps" TEXT NOT NULL,
    "arl" TEXT NOT NULL,
    "fondoPensiones" TEXT,
    "alergias" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosSalud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactoEmergencia" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactoEmergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contratista" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "tipoOperacion" TEXT NOT NULL DEFAULT 'fija',
    "contactoNombre" TEXT,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "direccion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fechaVinculacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFinContrato" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contratista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "servicio" TEXT NOT NULL DEFAULT 'especial',
    "contratistaId" TEXT,
    "contratistaNombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "soatVencimiento" TIMESTAMP(3),
    "rtmVencimiento" TIMESTAMP(3),
    "polizaVencimiento" TIMESTAMP(3),
    "odometroActual" DOUBLE PRECISION DEFAULT 0,
    "odometroFecha" TIMESTAMP(3),
    "odometroFotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignacion" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "conductorNombre" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "contratistaId" TEXT,
    "contratistaNombre" TEXT NOT NULL,
    "tipoAsignacion" TEXT NOT NULL,
    "turno" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "observaciones" TEXT,
    "autorizacionOperativa" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoAdjunto" (
    "id" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "tamano" TEXT,
    "mimeType" TEXT,
    "fechaVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoAdjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viaje" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "conductorNombre" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "contratistaNombre" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "servicio" TEXT NOT NULL DEFAULT 'especial',
    "fechaSalida" TIMESTAMP(3) NOT NULL,
    "duracionEstimadaHoras" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "fechaLlegadaReal" TIMESTAMP(3),
    "horaSalida" TEXT,
    "horaLlegada" TEXT,
    "distanciaKm" DOUBLE PRECISION,
    "riskScore" INTEGER,
    "riskLevel" TEXT,
    "riskInputs" JSONB,
    "signatures" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovedadViaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovedadViaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoGPS" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoEvento" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "descripcion" TEXT NOT NULL,
    "velocidad" DOUBLE PRECISION,
    "limiteVelocidad" DOUBLE PRECISION,
    "odometro" DOUBLE PRECISION,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "ubicacion" TEXT,
    "conductorId" TEXT,
    "conductorNombre" TEXT,
    "conductorTelefono" TEXT,
    "conductorEmail" TEXT,
    "estadoRetroalimentacion" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaRetroalimentacion" TIMESTAMP(3),
    "observacionesGestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoGPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoTransporte" (
    "id" TEXT NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "contratanteNombre" TEXT NOT NULL,
    "contratanteNit" TEXT NOT NULL,
    "objetoContrato" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoTransporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fuec" (
    "id" TEXT NOT NULL,
    "numeroConsecutivo" SERIAL NOT NULL,
    "codigoFUEC" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "contratoNumero" TEXT NOT NULL,
    "contratante" TEXT NOT NULL,
    "objetoContrato" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "rutaDetalle" TEXT,
    "vehiculoId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tarjetaOperacionNumero" TEXT,
    "conductorPrincipalId" TEXT NOT NULL,
    "conductorPrincipalNombre" TEXT NOT NULL,
    "conductorSecundarioId" TEXT,
    "conductorSecundarioNombre" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'emitido',
    "qrCodeUrl" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fuec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovedadConductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "conductorNombre" TEXT NOT NULL,
    "vehiculoId" TEXT,
    "placa" TEXT,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovedadConductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspeccionPreoperacional" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "conductorNombre" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilometraje" DOUBLE PRECISION,
    "checklist" JSONB NOT NULL,
    "hallazgoDetectado" BOOLEAN NOT NULL DEFAULT false,
    "descripcionHallazgo" TEXT,
    "fotoEvidenciaUrl" TEXT,
    "estadoConcepto" TEXT NOT NULL DEFAULT 'apto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspeccionPreoperacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallazgoHseq" (
    "id" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'media',
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "vehiculoId" TEXT,
    "placa" TEXT,
    "conductorId" TEXT,
    "conductorNombre" TEXT,
    "responsable" TEXT NOT NULL,
    "fotosEvidencia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accionCorrectiva" TEXT,
    "responsableCierre" TEXT,
    "fechaReporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallazgoHseq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSgsst" (
    "id" TEXT NOT NULL,
    "numeral" TEXT NOT NULL,
    "estandarId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "responsable" TEXT,
    "documentoNombre" TEXT,
    "fechaActualizacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemSgsst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasoPesv" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fase" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "documentoNombre" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasoPesv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorPesv" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodicidad" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valorActual" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndicadorPesv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capacitacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'pesv',
    "programa" TEXT NOT NULL DEFAULT 'Plan de Capacitacion PESV (Paso 9/18)',
    "categoria" TEXT NOT NULL DEFAULT 'charla_semanal',
    "fecha" TIMESTAMP(3) NOT NULL,
    "duracionHoras" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "facilitador" TEXT DEFAULT 'Coordinador HSEQ / PESV',
    "objetivo" TEXT,
    "lugar" TEXT DEFAULT 'Plataforma Digital / Portal Conductor',
    "materialTipo" TEXT NOT NULL DEFAULT 'texto',
    "materialUrl" TEXT,
    "materialContenido" TEXT,
    "preguntas" JSONB DEFAULT '[]',
    "requiereSelfie" BOOLEAN NOT NULL DEFAULT true,
    "requiereFirma" BOOLEAN NOT NULL DEFAULT true,
    "asistentesEsperados" INTEGER NOT NULL DEFAULT 0,
    "asistentesReales" INTEGER DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'programada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaRegistro" (
    "id" TEXT NOT NULL,
    "capacitacionId" TEXT,
    "personaId" TEXT,
    "personaDocumento" TEXT,
    "personaNombre" TEXT NOT NULL,
    "cargo" TEXT,
    "proyecto" TEXT,
    "facilitador" TEXT,
    "lugar" TEXT,
    "duracionHoras" DOUBLE PRECISION DEFAULT 0.25,
    "asistio" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'presente',
    "horaLlegada" TEXT,
    "evento" TEXT DEFAULT 'Jornada Operativa / Capacitación',
    "tipoEvento" TEXT NOT NULL DEFAULT 'capacitacion',
    "firmaUrl" TEXT,
    "fotoUrl" TEXT,
    "calificacion" DOUBLE PRECISION DEFAULT 100.0,
    "respuestas" JSONB DEFAULT '{}',
    "tiempoLectura" INTEGER DEFAULT 0,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsistenciaRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuestaRiesgoVial" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "personaNombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respuestas" JSONB NOT NULL,
    "nivelRiesgo" TEXT NOT NULL DEFAULT 'medio',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncuestaRiesgoVial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolSistema" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "permisos" JSONB NOT NULL DEFAULT '[]',
    "esConfigurable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlLavado" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoVehiculo" TEXT NOT NULL DEFAULT 'Camioneta',
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "empresa" TEXT NOT NULL DEFAULT 'N/A',
    "conductorNombre" TEXT NOT NULL,
    "conductorDocumento" TEXT,
    "conductorId" TEXT,
    "firmaUrl" TEXT,
    "estadoElaboro" BOOLEAN NOT NULL DEFAULT true,
    "estadoReviso" BOOLEAN NOT NULL DEFAULT false,
    "estadoAprobo" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "operarioUid" TEXT DEFAULT 'operativo',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlLavado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlAseo" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoVehiculo" TEXT NOT NULL DEFAULT 'Camioneta',
    "conductorNombre" TEXT NOT NULL,
    "conductorDocumento" TEXT,
    "conductorId" TEXT,
    "responsableHseq" TEXT DEFAULT 'Coordinador HSEQ / Conductor',
    "kilometraje" INTEGER DEFAULT 0,
    "checklist" JSONB NOT NULL,
    "fotosEvidencia" JSONB DEFAULT '[]',
    "observaciones" TEXT,
    "firmaConductor" TEXT,
    "firmaInspector" TEXT,
    "conforme" BOOLEAN NOT NULL DEFAULT true,
    "estadoReviso" BOOLEAN NOT NULL DEFAULT false,
    "estadoAprobo" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlAseo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlExtintor" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoVehiculo" TEXT NOT NULL DEFAULT 'Camioneta',
    "conductorNombre" TEXT NOT NULL,
    "conductorDocumento" TEXT,
    "conductorId" TEXT,
    "responsableHseq" TEXT DEFAULT 'Coordinador HSEQ / Conductor',
    "tipoExtintor" TEXT NOT NULL DEFAULT 'ABC Polvo Químico Seco',
    "capacidad" TEXT NOT NULL DEFAULT '10 lbs',
    "fechaUltimaRecarga" TEXT,
    "fechaVencimientoRecarga" TEXT,
    "presionManometro" TEXT NOT NULL DEFAULT 'operativa',
    "checklist" JSONB NOT NULL,
    "fotosEvidencia" JSONB DEFAULT '[]',
    "observaciones" TEXT,
    "firmaConductor" TEXT,
    "firmaInspector" TEXT,
    "conforme" BOOLEAN NOT NULL DEFAULT true,
    "estadoReviso" BOOLEAN NOT NULL DEFAULT false,
    "estadoAprobo" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlExtintor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlBotiquin" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoVehiculo" TEXT NOT NULL DEFAULT 'Camioneta',
    "conductorNombre" TEXT NOT NULL,
    "conductorDocumento" TEXT,
    "conductorId" TEXT,
    "responsableHseq" TEXT DEFAULT 'Coordinador HSEQ / Conductor',
    "ubicacionBotiquin" TEXT NOT NULL DEFAULT 'Cabina del vehículo',
    "estadoGabinete" TEXT NOT NULL DEFAULT 'BUENO',
    "checklist" JSONB NOT NULL,
    "fotosEvidencia" JSONB DEFAULT '[]',
    "observaciones" TEXT,
    "firmaConductor" TEXT,
    "firmaInspector" TEXT,
    "conforme" BOOLEAN NOT NULL DEFAULT true,
    "itemsVencidosCount" INTEGER NOT NULL DEFAULT 0,
    "itemsFaltantesCount" INTEGER NOT NULL DEFAULT 0,
    "estadoReviso" BOOLEAN NOT NULL DEFAULT false,
    "estadoAprobo" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlBotiquin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuestaRespuesta" (
    "id" TEXT NOT NULL,
    "tipoEncuesta" TEXT NOT NULL DEFAULT 'satisfaccion_servicio',
    "titulo" TEXT NOT NULL DEFAULT 'Encuesta de Percepción y Satisfacción',
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "placa" TEXT,
    "tipoVehiculo" TEXT,
    "conductorNombre" TEXT,
    "conductorDocumento" TEXT,
    "nombreEncuestado" TEXT,
    "emailEncuestado" TEXT,
    "empresaCliente" TEXT DEFAULT 'TRANS SERVICES A&B',
    "calificacionGeneral" DOUBLE PRECISION DEFAULT 5.0,
    "limpiezaVehiculo" DOUBLE PRECISION DEFAULT 5.0,
    "atencionConductor" DOUBLE PRECISION DEFAULT 5.0,
    "puntualidad" DOUBLE PRECISION DEFAULT 5.0,
    "seguridadConfort" DOUBLE PRECISION DEFAULT 5.0,
    "seriaRecomendado" TEXT DEFAULT 'SI',
    "preguntasDetalle" JSONB DEFAULT '[]',
    "comentarios" TEXT,
    "firma" TEXT,
    "canal" TEXT NOT NULL DEFAULT 'qr_movil',
    "estado" TEXT NOT NULL DEFAULT 'completada',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncuestaRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoDigital" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT,
    "entidadNombre" TEXT,
    "archivoUrl" TEXT NOT NULL,
    "tamanoBytes" INTEGER,
    "mimeType" TEXT,
    "fechaExpedicion" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "diasAvisoVencer" INTEGER NOT NULL DEFAULT 30,
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoDigital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoDespacho" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT,
    "conductorNombre" TEXT NOT NULL,
    "conductorDocumento" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "vehiculoId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora" TEXT NOT NULL,
    "odometroInicial" DOUBLE PRECISION NOT NULL,
    "fotoOdometroUrl" TEXT NOT NULL,
    "fotoVehiculoUrl" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "ubicacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "odometroFinal" DOUBLE PRECISION,
    "fotoOdometroFinalUrl" TEXT,
    "horaCierre" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnoDespacho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_numeroDocumento_key" ON "Persona"("numeroDocumento");

-- CreateIndex
CREATE INDEX "Persona_numeroDocumento_idx" ON "Persona"("numeroDocumento");

-- CreateIndex
CREATE INDEX "Persona_estado_idx" ON "Persona"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "LicenciaConduccion_personaId_key" ON "LicenciaConduccion"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamenMedico_personaId_key" ON "ExamenMedico"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "DatosSalud_personaId_key" ON "DatosSalud"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactoEmergencia_personaId_key" ON "ContactoEmergencia"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "Contratista_nit_key" ON "Contratista"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE INDEX "Vehiculo_placa_idx" ON "Vehiculo"("placa");

-- CreateIndex
CREATE INDEX "Vehiculo_estado_idx" ON "Vehiculo"("estado");

-- CreateIndex
CREATE INDEX "Asignacion_conductorId_idx" ON "Asignacion"("conductorId");

-- CreateIndex
CREATE INDEX "Asignacion_vehiculoId_idx" ON "Asignacion"("vehiculoId");

-- CreateIndex
CREATE INDEX "Asignacion_estado_idx" ON "Asignacion"("estado");

-- CreateIndex
CREATE INDEX "DocumentoAdjunto_entidadTipo_entidadId_idx" ON "DocumentoAdjunto"("entidadTipo", "entidadId");

-- CreateIndex
CREATE INDEX "Viaje_conductorId_idx" ON "Viaje"("conductorId");

-- CreateIndex
CREATE INDEX "Viaje_vehiculoId_idx" ON "Viaje"("vehiculoId");

-- CreateIndex
CREATE INDEX "Viaje_estado_idx" ON "Viaje"("estado");

-- CreateIndex
CREATE INDEX "Viaje_placa_idx" ON "Viaje"("placa");

-- CreateIndex
CREATE INDEX "NovedadViaje_viajeId_idx" ON "NovedadViaje"("viajeId");

-- CreateIndex
CREATE INDEX "EventoGPS_placa_idx" ON "EventoGPS"("placa");

-- CreateIndex
CREATE INDEX "EventoGPS_fechaHora_idx" ON "EventoGPS"("fechaHora");

-- CreateIndex
CREATE INDEX "EventoGPS_prioridad_idx" ON "EventoGPS"("prioridad");

-- CreateIndex
CREATE INDEX "EventoGPS_conductorId_idx" ON "EventoGPS"("conductorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoTransporte_numeroContrato_key" ON "ContratoTransporte"("numeroContrato");

-- CreateIndex
CREATE UNIQUE INDEX "Fuec_codigoFUEC_key" ON "Fuec"("codigoFUEC");

-- CreateIndex
CREATE INDEX "Fuec_codigoFUEC_idx" ON "Fuec"("codigoFUEC");

-- CreateIndex
CREATE INDEX "Fuec_placa_idx" ON "Fuec"("placa");

-- CreateIndex
CREATE INDEX "Fuec_fechaInicio_fechaFin_idx" ON "Fuec"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "NovedadConductor_conductorId_idx" ON "NovedadConductor"("conductorId");

-- CreateIndex
CREATE INDEX "NovedadConductor_fecha_idx" ON "NovedadConductor"("fecha");

-- CreateIndex
CREATE INDEX "InspeccionPreoperacional_conductorId_idx" ON "InspeccionPreoperacional"("conductorId");

-- CreateIndex
CREATE INDEX "InspeccionPreoperacional_placa_idx" ON "InspeccionPreoperacional"("placa");

-- CreateIndex
CREATE INDEX "InspeccionPreoperacional_fecha_idx" ON "InspeccionPreoperacional"("fecha");

-- CreateIndex
CREATE INDEX "HallazgoHseq_estado_idx" ON "HallazgoHseq"("estado");

-- CreateIndex
CREATE INDEX "HallazgoHseq_severidad_idx" ON "HallazgoHseq"("severidad");

-- CreateIndex
CREATE INDEX "HallazgoHseq_placa_idx" ON "HallazgoHseq"("placa");

-- CreateIndex
CREATE INDEX "HallazgoHseq_fechaReporte_idx" ON "HallazgoHseq"("fechaReporte");

-- CreateIndex
CREATE INDEX "ItemSgsst_estandarId_idx" ON "ItemSgsst"("estandarId");

-- CreateIndex
CREATE INDEX "ItemSgsst_estado_idx" ON "ItemSgsst"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "PasoPesv_numero_key" ON "PasoPesv"("numero");

-- CreateIndex
CREATE INDEX "PasoPesv_fase_idx" ON "PasoPesv"("fase");

-- CreateIndex
CREATE INDEX "PasoPesv_estado_idx" ON "PasoPesv"("estado");

-- CreateIndex
CREATE INDEX "Capacitacion_tipo_idx" ON "Capacitacion"("tipo");

-- CreateIndex
CREATE INDEX "Capacitacion_programa_idx" ON "Capacitacion"("programa");

-- CreateIndex
CREATE INDEX "Capacitacion_categoria_idx" ON "Capacitacion"("categoria");

-- CreateIndex
CREATE INDEX "Capacitacion_estado_idx" ON "Capacitacion"("estado");

-- CreateIndex
CREATE INDEX "Capacitacion_fecha_idx" ON "Capacitacion"("fecha");

-- CreateIndex
CREATE INDEX "AsistenciaRegistro_capacitacionId_idx" ON "AsistenciaRegistro"("capacitacionId");

-- CreateIndex
CREATE INDEX "AsistenciaRegistro_personaId_idx" ON "AsistenciaRegistro"("personaId");

-- CreateIndex
CREATE INDEX "AsistenciaRegistro_personaDocumento_idx" ON "AsistenciaRegistro"("personaDocumento");

-- CreateIndex
CREATE INDEX "AsistenciaRegistro_proyecto_idx" ON "AsistenciaRegistro"("proyecto");

-- CreateIndex
CREATE INDEX "AsistenciaRegistro_fecha_idx" ON "AsistenciaRegistro"("fecha");

-- CreateIndex
CREATE INDEX "EncuestaRiesgoVial_personaId_idx" ON "EncuestaRiesgoVial"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "RolSistema_nombre_key" ON "RolSistema"("nombre");

-- CreateIndex
CREATE INDEX "ControlLavado_fecha_idx" ON "ControlLavado"("fecha");

-- CreateIndex
CREATE INDEX "ControlLavado_placa_idx" ON "ControlLavado"("placa");

-- CreateIndex
CREATE INDEX "ControlLavado_conductorDocumento_idx" ON "ControlLavado"("conductorDocumento");

-- CreateIndex
CREATE INDEX "ControlLavado_estadoAprobo_idx" ON "ControlLavado"("estadoAprobo");

-- CreateIndex
CREATE INDEX "ControlAseo_fecha_idx" ON "ControlAseo"("fecha");

-- CreateIndex
CREATE INDEX "ControlAseo_placa_idx" ON "ControlAseo"("placa");

-- CreateIndex
CREATE INDEX "ControlAseo_conductorDocumento_idx" ON "ControlAseo"("conductorDocumento");

-- CreateIndex
CREATE INDEX "ControlAseo_conforme_idx" ON "ControlAseo"("conforme");

-- CreateIndex
CREATE INDEX "ControlAseo_estadoAprobo_idx" ON "ControlAseo"("estadoAprobo");

-- CreateIndex
CREATE INDEX "ControlExtintor_fecha_idx" ON "ControlExtintor"("fecha");

-- CreateIndex
CREATE INDEX "ControlExtintor_placa_idx" ON "ControlExtintor"("placa");

-- CreateIndex
CREATE INDEX "ControlExtintor_conductorDocumento_idx" ON "ControlExtintor"("conductorDocumento");

-- CreateIndex
CREATE INDEX "ControlExtintor_conforme_idx" ON "ControlExtintor"("conforme");

-- CreateIndex
CREATE INDEX "ControlExtintor_fechaVencimientoRecarga_idx" ON "ControlExtintor"("fechaVencimientoRecarga");

-- CreateIndex
CREATE INDEX "ControlExtintor_estadoAprobo_idx" ON "ControlExtintor"("estadoAprobo");

-- CreateIndex
CREATE INDEX "ControlBotiquin_fecha_idx" ON "ControlBotiquin"("fecha");

-- CreateIndex
CREATE INDEX "ControlBotiquin_placa_idx" ON "ControlBotiquin"("placa");

-- CreateIndex
CREATE INDEX "ControlBotiquin_conductorDocumento_idx" ON "ControlBotiquin"("conductorDocumento");

-- CreateIndex
CREATE INDEX "ControlBotiquin_conforme_idx" ON "ControlBotiquin"("conforme");

-- CreateIndex
CREATE INDEX "ControlBotiquin_estadoAprobo_idx" ON "ControlBotiquin"("estadoAprobo");

-- CreateIndex
CREATE INDEX "EncuestaRespuesta_fecha_idx" ON "EncuestaRespuesta"("fecha");

-- CreateIndex
CREATE INDEX "EncuestaRespuesta_tipoEncuesta_idx" ON "EncuestaRespuesta"("tipoEncuesta");

-- CreateIndex
CREATE INDEX "EncuestaRespuesta_placa_idx" ON "EncuestaRespuesta"("placa");

-- CreateIndex
CREATE INDEX "EncuestaRespuesta_conductorNombre_idx" ON "EncuestaRespuesta"("conductorNombre");

-- CreateIndex
CREATE INDEX "DocumentoDigital_categoria_idx" ON "DocumentoDigital"("categoria");

-- CreateIndex
CREATE INDEX "DocumentoDigital_tipoDocumento_idx" ON "DocumentoDigital"("tipoDocumento");

-- CreateIndex
CREATE INDEX "DocumentoDigital_fechaVencimiento_idx" ON "DocumentoDigital"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "DocumentoDigital_entidadNombre_idx" ON "DocumentoDigital"("entidadNombre");

-- CreateIndex
CREATE INDEX "TurnoDespacho_placa_idx" ON "TurnoDespacho"("placa");

-- CreateIndex
CREATE INDEX "TurnoDespacho_conductorDocumento_idx" ON "TurnoDespacho"("conductorDocumento");

-- CreateIndex
CREATE INDEX "TurnoDespacho_fecha_idx" ON "TurnoDespacho"("fecha");

-- CreateIndex
CREATE INDEX "TurnoDespacho_estado_idx" ON "TurnoDespacho"("estado");

-- AddForeignKey
ALTER TABLE "LicenciaConduccion" ADD CONSTRAINT "LicenciaConduccion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamenMedico" ADD CONSTRAINT "ExamenMedico_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatosSalud" ADD CONSTRAINT "DatosSalud_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactoEmergencia" ADD CONSTRAINT "ContactoEmergencia_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "Contratista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "Contratista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadViaje" ADD CONSTRAINT "NovedadViaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fuec" ADD CONSTRAINT "Fuec_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoTransporte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaRegistro" ADD CONSTRAINT "AsistenciaRegistro_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoDespacho" ADD CONSTRAINT "TurnoDespacho_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
