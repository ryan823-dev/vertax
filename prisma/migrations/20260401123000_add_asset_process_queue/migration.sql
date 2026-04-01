-- Migration: Add AssetProcessQueue model for background asset processing
-- Date: 2026-04-01

-- Create asset_process_queue table
CREATE TABLE IF NOT EXISTS "asset_process_queue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_process_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "asset_process_queue_batchId_key" UNIQUE ("batchId")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "asset_process_queue_tenantId_idx" ON "asset_process_queue"("tenantId");
CREATE INDEX IF NOT EXISTS "asset_process_queue_status_idx" ON "asset_process_queue"("status");
CREATE INDEX IF NOT EXISTS "asset_process_queue_batchId_idx" ON "asset_process_queue"("batchId");
CREATE INDEX IF NOT EXISTS "asset_process_queue_assetId_idx" ON "asset_process_queue"("assetId");
CREATE INDEX IF NOT EXISTS "asset_process_queue_tenantId_status_idx" ON "asset_process_queue"("tenantId", "status");

-- Add foreign key constraint
ALTER TABLE "asset_process_queue"
    ADD CONSTRAINT "asset_process_queue_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Add relation to Tenant model (Prisma requires this)
-- Note: We need to add the relation field to Tenant model's relation list
-- This is done via Prisma schema, not migration, but the FK above handles it at DB level
