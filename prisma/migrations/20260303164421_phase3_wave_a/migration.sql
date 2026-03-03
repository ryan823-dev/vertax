-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('claim', 'statistic', 'testimonial', 'case_study', 'certification');

-- CreateEnum
CREATE TYPE "GuidelineCategory" AS ENUM ('tone', 'terminology', 'visual', 'messaging');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('draft', 'in_review', 'client_feedback', 'revised', 'approved', 'published', 'archived');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "context" JSONB,
ADD COLUMN     "eventCategory" TEXT,
ADD COLUMN     "severity" TEXT;

-- AlterTable
ALTER TABLE "SeoContent" ADD COLUMN     "briefId" TEXT,
ADD COLUMN     "evidenceRefs" TEXT[],
ADD COLUMN     "outline" JSONB,
ADD COLUMN     "schemaJson" JSONB;

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT,
    "companyIntro" TEXT,
    "coreProducts" JSONB NOT NULL DEFAULT '[]',
    "techAdvantages" JSONB NOT NULL DEFAULT '[]',
    "scenarios" JSONB NOT NULL DEFAULT '[]',
    "differentiators" JSONB NOT NULL DEFAULT '[]',
    "targetIndustries" JSONB NOT NULL DEFAULT '[]',
    "targetRegions" JSONB NOT NULL DEFAULT '[]',
    "buyerPersonas" JSONB NOT NULL DEFAULT '[]',
    "painPoints" JSONB NOT NULL DEFAULT '[]',
    "buyingTriggers" JSONB NOT NULL DEFAULT '[]',
    "lastAnalyzedAt" TIMESTAMP(3),
    "analysisSource" JSONB NOT NULL DEFAULT '[]',
    "aiModel" TEXT,
    "rawAnalysis" TEXT,
    "sectionEdits" JSONB NOT NULL DEFAULT '{}',
    "evidenceRefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetChunk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "charStart" INTEGER,
    "charEnd" INTEGER,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL DEFAULT 'claim',
    "sourceLocator" JSONB NOT NULL DEFAULT '{}',
    "chunkId" TEXT,
    "assetId" TEXT,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandGuideline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "GuidelineCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "examples" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandGuideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICPSegment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "companySize" TEXT,
    "regions" TEXT[],
    "description" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICPSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seniority" TEXT,
    "concerns" TEXT[],
    "messagingPrefs" JSONB NOT NULL DEFAULT '{}',
    "evidenceRefs" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessagingMatrix" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "valueProp" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT,
    "evidenceRefs" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetPersonaId" TEXT,
    "targetKeywords" TEXT[],
    "intent" TEXT NOT NULL,
    "cta" TEXT,
    "evidenceIds" TEXT[],
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtifactComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtifactTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "references" JSONB,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_tenantId_key" ON "CompanyProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CompanyProfile_tenantId_idx" ON "CompanyProfile"("tenantId");

-- CreateIndex
CREATE INDEX "AssetChunk_assetId_idx" ON "AssetChunk"("assetId");

-- CreateIndex
CREATE INDEX "AssetChunk_tenantId_idx" ON "AssetChunk"("tenantId");

-- CreateIndex
CREATE INDEX "AssetChunk_assetId_chunkIndex_idx" ON "AssetChunk"("assetId", "chunkIndex");

-- CreateIndex
CREATE INDEX "Evidence_tenantId_idx" ON "Evidence"("tenantId");

-- CreateIndex
CREATE INDEX "Evidence_tenantId_type_idx" ON "Evidence"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Evidence_chunkId_idx" ON "Evidence"("chunkId");

-- CreateIndex
CREATE INDEX "Evidence_assetId_idx" ON "Evidence"("assetId");

-- CreateIndex
CREATE INDEX "BrandGuideline_tenantId_idx" ON "BrandGuideline"("tenantId");

-- CreateIndex
CREATE INDEX "BrandGuideline_tenantId_category_idx" ON "BrandGuideline"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ICPSegment_tenantId_idx" ON "ICPSegment"("tenantId");

-- CreateIndex
CREATE INDEX "Persona_tenantId_idx" ON "Persona"("tenantId");

-- CreateIndex
CREATE INDEX "Persona_segmentId_idx" ON "Persona"("segmentId");

-- CreateIndex
CREATE INDEX "MessagingMatrix_tenantId_idx" ON "MessagingMatrix"("tenantId");

-- CreateIndex
CREATE INDEX "MessagingMatrix_personaId_idx" ON "MessagingMatrix"("personaId");

-- CreateIndex
CREATE INDEX "ArtifactVersion_tenantId_idx" ON "ArtifactVersion"("tenantId");

-- CreateIndex
CREATE INDEX "ArtifactVersion_entityType_entityId_idx" ON "ArtifactVersion"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ArtifactVersion_tenantId_status_idx" ON "ArtifactVersion"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactVersion_entityType_entityId_version_key" ON "ArtifactVersion"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "ContentBrief_tenantId_idx" ON "ContentBrief"("tenantId");

-- CreateIndex
CREATE INDEX "ContentBrief_tenantId_status_idx" ON "ContentBrief"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ContentBrief_targetPersonaId_idx" ON "ContentBrief"("targetPersonaId");

-- CreateIndex
CREATE INDEX "ArtifactComment_versionId_idx" ON "ArtifactComment"("versionId");

-- CreateIndex
CREATE INDEX "ArtifactComment_tenantId_idx" ON "ArtifactComment"("tenantId");

-- CreateIndex
CREATE INDEX "ArtifactComment_parentId_idx" ON "ArtifactComment"("parentId");

-- CreateIndex
CREATE INDEX "ArtifactTask_versionId_idx" ON "ArtifactTask"("versionId");

-- CreateIndex
CREATE INDEX "ArtifactTask_tenantId_status_idx" ON "ArtifactTask"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ArtifactTask_assigneeId_idx" ON "ArtifactTask"("assigneeId");

-- CreateIndex
CREATE INDEX "ChatConversation_tenantId_userId_idx" ON "ChatConversation"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "SeoContent_briefId_idx" ON "SeoContent"("briefId");

-- AddForeignKey
ALTER TABLE "SeoContent" ADD CONSTRAINT "SeoContent_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetChunk" ADD CONSTRAINT "AssetChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetChunk" ADD CONSTRAINT "AssetChunk_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "AssetChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGuideline" ADD CONSTRAINT "BrandGuideline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICPSegment" ADD CONSTRAINT "ICPSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "ICPSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagingMatrix" ADD CONSTRAINT "MessagingMatrix_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagingMatrix" ADD CONSTRAINT "MessagingMatrix_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_targetPersonaId_fkey" FOREIGN KEY ("targetPersonaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComment" ADD CONSTRAINT "ArtifactComment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ArtifactVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComment" ADD CONSTRAINT "ArtifactComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComment" ADD CONSTRAINT "ArtifactComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ArtifactComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactTask" ADD CONSTRAINT "ArtifactTask_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ArtifactVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactTask" ADD CONSTRAINT "ArtifactTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactTask" ADD CONSTRAINT "ArtifactTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
