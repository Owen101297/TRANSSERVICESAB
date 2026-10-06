ALTER TABLE "Persona" ADD COLUMN "rolAcceso" TEXT;
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_rolAcceso_check" CHECK ("rolAcceso" IS NULL OR "rolAcceso" IN ('administrativo', 'conductor'));
CREATE TABLE "CuentaGoogle" (
 "id" TEXT NOT NULL, "subject" TEXT NOT NULL, "email" TEXT NOT NULL, "nombre" TEXT NOT NULL,
 "estado" TEXT NOT NULL DEFAULT 'pendiente', "personaId" TEXT, "aprobadaPorId" TEXT, "aprobadaAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CuentaGoogle_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CuentaGoogle_estado_check" CHECK ("estado" IN ('pendiente','aprobada','revocada','rechazada'))
);
CREATE UNIQUE INDEX "CuentaGoogle_subject_key" ON "CuentaGoogle"("subject");
CREATE UNIQUE INDEX "CuentaGoogle_personaId_key" ON "CuentaGoogle"("personaId");
CREATE INDEX "CuentaGoogle_estado_idx" ON "CuentaGoogle"("estado");
ALTER TABLE "CuentaGoogle" ADD CONSTRAINT "CuentaGoogle_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
