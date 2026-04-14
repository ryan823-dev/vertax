-- CreateTable
CREATE TABLE "radar_daily_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "rawCandidates" INTEGER NOT NULL DEFAULT 0,
    "qualifiedCompanies" INTEGER NOT NULL DEFAULT 0,
    "importedProspects" INTEGER NOT NULL DEFAULT 0,
    "contactsAdded" INTEGER NOT NULL DEFAULT 0,
    "readyCompanies" INTEGER NOT NULL DEFAULT 0,
    "workspaceTotal" INTEGER NOT NULL DEFAULT 0,
    "readyNowCount" INTEGER NOT NULL DEFAULT 0,
    "phonePriorityCount" INTEGER NOT NULL DEFAULT 0,
    "emailPriorityCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "avgReadyScore" INTEGER NOT NULL DEFAULT 0,
    "feedbackSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radar_daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "radar_daily_snapshots_tenantId_dayKey_key" ON "radar_daily_snapshots"("tenantId", "dayKey");

-- CreateIndex
CREATE INDEX "radar_daily_snapshots_tenantId_dayKey_idx" ON "radar_daily_snapshots"("tenantId", "dayKey");

-- AddForeignKey
ALTER TABLE "radar_daily_snapshots" ADD CONSTRAINT "radar_daily_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
