-- Migration: add_missing_fields
-- Adds fields introduced after the content_push_pipeline migration

-- === WebsiteConfig: new adapter fields ===
ALTER TABLE "WebsiteConfig" ADD COLUMN IF NOT EXISTS "siteName" TEXT;
ALTER TABLE "WebsiteConfig" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "WebsiteConfig" ADD COLUMN IF NOT EXISTS "wpUrl" TEXT;
ALTER TABLE "WebsiteConfig" ADD COLUMN IF NOT EXISTS "wpUsername" TEXT;
ALTER TABLE "WebsiteConfig" ADD COLUMN IF NOT EXISTS "wpPassword" TEXT;
ALTER TABLE "WebsiteConfig" ADD COLUMN IF NOT EXISTS "customHeaders" JSONB;

-- === PushRecord: content version tracking ===
ALTER TABLE "PushRecord" ADD COLUMN IF NOT EXISTS "contentVersion" INTEGER;
ALTER TABLE "PushRecord" ADD COLUMN IF NOT EXISTS "contentSnapshot" JSONB;

-- === SeoContent: version counter ===
ALTER TABLE "SeoContent" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- === RadarCandidate: LinkedIn URL (Exa enrichment) ===
ALTER TABLE "RadarCandidate" ADD COLUMN IF NOT EXISTS "linkedInUrl" TEXT;

-- === RadarContentLink table ===
DO $$ BEGIN
  CREATE TYPE "ContentLinkType" AS ENUM ('KEYWORD_MATCH', 'INDUSTRY_MATCH', 'OUTREACH_EMBED', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "radar_content_links" (
    "id"               TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "candidateId"      TEXT NOT NULL,
    "contentId"        TEXT NOT NULL,
    "linkType"         "ContentLinkType" NOT NULL,
    "matchScore"       DOUBLE PRECISION,
    "matchDetails"     JSONB,
    "outreachStatus"   TEXT,
    "outreachRecordId" TEXT,
    "clickCount"       INTEGER NOT NULL DEFAULT 0,
    "leadGenerated"    BOOLEAN NOT NULL DEFAULT false,
    "conversionNote"   TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radar_content_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "radar_content_links_candidateId_contentId_key"
    ON "radar_content_links"("candidateId", "contentId");
CREATE INDEX IF NOT EXISTS "radar_content_links_tenantId_idx"
    ON "radar_content_links"("tenantId");
CREATE INDEX IF NOT EXISTS "radar_content_links_contentId_idx"
    ON "radar_content_links"("contentId");
CREATE INDEX IF NOT EXISTS "radar_content_links_candidateId_idx"
    ON "radar_content_links"("candidateId");

ALTER TABLE "radar_content_links"
    ADD CONSTRAINT "radar_content_links_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "RadarCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "radar_content_links"
    ADD CONSTRAINT "radar_content_links_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "SeoContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- === GeoDistributionRecord table ===
DO $$ BEGIN
  CREATE TYPE "GeoChannel" AS ENUM ('CHATGPT','PERPLEXITY','CLAUDE','GEMINI','BING_COPILOT','CUSTOM_SITE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CitationStatus" AS ENUM ('PENDING','CITED','NOT_CITED','PARTIAL','ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "geo_distribution_records" (
    "id"                  TEXT NOT NULL,
    "tenantId"            TEXT NOT NULL,
    "contentId"           TEXT NOT NULL,
    "channel"             "GeoChannel" NOT NULL,
    "channelDetail"       TEXT,
    "distributedVersion"  TEXT,
    "queryKeywords"       TEXT[] NOT NULL DEFAULT '{}',
    "citationStatus"      "CitationStatus" NOT NULL DEFAULT 'PENDING',
    "citationUrl"         TEXT,
    "citationSnippet"     TEXT,
    "citationScore"       DOUBLE PRECISION,
    "lastCheckedAt"       TIMESTAMP(3),
    "checkCount"          INTEGER NOT NULL DEFAULT 0,
    "checkHistory"        JSONB,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_distribution_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "geo_distribution_records_contentId_channel_key"
    ON "geo_distribution_records"("contentId", "channel");
CREATE INDEX IF NOT EXISTS "geo_distribution_records_tenantId_idx"
    ON "geo_distribution_records"("tenantId");
CREATE INDEX IF NOT EXISTS "geo_distribution_records_citationStatus_idx"
    ON "geo_distribution_records"("citationStatus");

ALTER TABLE "geo_distribution_records"
    ADD CONSTRAINT "geo_distribution_records_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "SeoContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
