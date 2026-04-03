-- Add repliedAt and callResult to OutreachRecord
ALTER TABLE "outreach_records" ADD COLUMN "repliedAt" TIMESTAMP(3);
ALTER TABLE "outreach_records" ADD COLUMN "callResult" TEXT;
