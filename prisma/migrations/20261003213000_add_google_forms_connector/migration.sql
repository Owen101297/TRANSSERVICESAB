ALTER TABLE "EventoAsistencia"
ADD COLUMN "googleFormAdminUrl" TEXT,
ADD COLUMN "googleFormId" TEXT,
ADD COLUMN "formConnectorStatus" TEXT NOT NULL DEFAULT 'no_aplica',
ADD COLUMN "formConnectedAt" TIMESTAMP(3),
ADD COLUMN "formLastSyncAt" TIMESTAMP(3),
ADD COLUMN "formLastSyncStatus" TEXT,
ADD COLUMN "formLastSyncError" TEXT,
ADD COLUMN "formResponseCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "EventoAsistencia_googleFormId_key" ON "EventoAsistencia"("googleFormId");
