-- AlterTable: add channel column to outreach_records
ALTER TABLE "outreach_records" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'email';
