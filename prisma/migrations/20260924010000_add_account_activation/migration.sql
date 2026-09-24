CREATE TABLE "CuentaAcceso" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadaHasta" TIMESTAMP(3),
    "ultimoAccesoAt" TIMESTAMP(3),
    "activadaAt" TIMESTAMP(3),
    "bloqueadaPorId" TEXT,
    "bloqueadaPorNombre" TEXT,
    "motivoBloqueo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CuentaAcceso_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnlaceActivacion" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tipoAcceso" TEXT NOT NULL DEFAULT 'portal',
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "abiertoAt" TIMESTAMP(3),
    "entregadoAt" TIMESTAMP(3),
    "medioEntrega" TEXT,
    "usadoAt" TIMESTAMP(3),
    "revocadoAt" TIMESTAMP(3),
    "creadoPorId" TEXT NOT NULL,
    "creadoPorNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnlaceActivacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CuentaAcceso_personaId_key" ON "CuentaAcceso"("personaId");
CREATE INDEX "CuentaAcceso_estado_idx" ON "CuentaAcceso"("estado");
CREATE INDEX "CuentaAcceso_bloqueadaHasta_idx" ON "CuentaAcceso"("bloqueadaHasta");
CREATE UNIQUE INDEX "EnlaceActivacion_tokenHash_key" ON "EnlaceActivacion"("tokenHash");
CREATE INDEX "EnlaceActivacion_personaId_createdAt_idx" ON "EnlaceActivacion"("personaId", "createdAt");
CREATE INDEX "EnlaceActivacion_expiraAt_idx" ON "EnlaceActivacion"("expiraAt");

ALTER TABLE "CuentaAcceso" ADD CONSTRAINT "CuentaAcceso_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnlaceActivacion" ADD CONSTRAINT "EnlaceActivacion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CuentaAcceso" ("id", "personaId", "estado", "activadaAt", "createdAt", "updatedAt")
SELECT
    'account_' || "id",
    "id",
    CASE WHEN "passwordHash" IS NOT NULL OR "pin" LIKE 'scrypt$%' THEN 'activa' ELSE 'pendiente' END,
    CASE WHEN "passwordHash" IS NOT NULL OR "pin" LIKE 'scrypt$%' THEN CURRENT_TIMESTAMP ELSE NULL END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Persona";
