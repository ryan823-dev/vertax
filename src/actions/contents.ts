"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { chatCompletion } from "@/lib/ai-client";
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from "@/lib/utils/activity-logger";
import { createVersion } from "@/actions/versions";
import type { Prisma } from "@prisma/client";
import { runSeoGeoPipeline } from "@/lib/marketing/seo-geo-pipeline";
import { batchRegisterDistribution } from "@/actions/geo-distribution";
import type { GeoChannel } from "@/actions/geo-distribution";

// ==================== Types ====================

export type ContentPieceData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  status: string;
  // Phase 3 fields
  briefId: string | null;
  briefTitle?: string;
  outline: ContentOutline | null;
  evidenceRefs: string[];
  // Relations
  categoryId: string;
  categoryName?: string;
  authorName?: string;
  createdAt: Date;
  updatedAt: Date;
  // SEO-GEO pipeline fields
  schemaJson?: object | null;
  geoVersion?: string | null;
  seoFramework?: string | null;
  aiMetadata?: Record<string, unknown>;
};

export type ContentOutline = {
  sections: Array<{
    heading: string;
    keyPoints: string[];
  }>;
};

export type CreateContentInput = {
  briefId?: string;
  title: string;
  slug?: string;
  categoryId: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  outline?: ContentOutline;
  evidenceRefs?: string[];
};

export type UpdateContentInput = Partial<CreateContentInput> & {
  status?: string;
};

// ==================== Helpers ====================

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

// ==================== CRUD ====================

export async function getContentPieces(filters?: {
  briefId?: string;
  status?: string;
  search?: string;
}): Promise<ContentPieceData[]> {
  const session = await getSession();

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };

  if (filters?.briefId) where.briefId = filters.briefId;
  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { content: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.seoContent.findMany({
    where,
    include: {
      brief: { select: { title: true } },
      category: { select: { name: true } },
      author: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return items.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    excerpt: c.excerpt,
    content: c.content,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    keywords: c.keywords,
    status: c.status,
    briefId: c.briefId,
    briefTitle: c.brief?.title || undefined,
    outline: c.outline as ContentOutline | null,
    evidenceRefs: c.evidenceRefs,
    categoryId: c.categoryId,
    categoryName: c.category?.name || undefined,
    authorName: c.author?.name || undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export async function getContentPieceById(id: string): Promise<ContentPieceData | null> {
  const session = await getSession();

  const c = await prisma.seoContent.findFirst({
    where: { id, tenantId: session.user.tenantId, deletedAt: null },
    include: {
      brief: { select: { title: true, targetKeywords: true, intent: true } },
      category: { select: { name: true } },
      author: { select: { name: true } },
    },
  });

  if (!c) return null;

  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    excerpt: c.excerpt,
    content: c.content,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    keywords: c.keywords,
    status: c.status,
    briefId: c.briefId,
    briefTitle: c.brief?.title || undefined,
    outline: c.outline as ContentOutline | null,
    evidenceRefs: c.evidenceRefs,
    schemaJson: c.schemaJson as object | null,
    geoVersion: ((c.aiMetadata as Record<string, unknown>)?.geoVersion as string | null) || null,
    seoFramework: ((c.aiMetadata as Record<string, unknown>)?.seoFramework as string | null) || null,
    aiMetadata: c.aiMetadata as Record<string, unknown>,
    categoryId: c.categoryId,
    categoryName: c.category?.name || undefined,
    authorName: c.author?.name || undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function createContentPiece(input: CreateContentInput): Promise<ContentPieceData> {
  const session = await getSession();

  const slug = input.slug || generateSlug(input.title);

  const content = await prisma.seoContent.create({
    data: {
      tenantId: session.user.tenantId,
      authorId: session.user.id,
      categoryId: input.categoryId,
      briefId: input.briefId || null,
      title: input.title,
      slug,
      content: input.content || "",
      excerpt: input.excerpt || null,
      metaTitle: input.metaTitle || null,
      metaDescription: input.metaDescription || null,
      keywords: input.keywords || [],
      outline: input.outline ? (input.outline as Prisma.InputJsonValue) : undefined,
      evidenceRefs: input.evidenceRefs || [],
      status: "draft",
    },
  });

  // Fetch relations separately
  const [briefData, categoryData, authorData] = await Promise.all([
    content.briefId ? prisma.contentBrief.findUnique({ where: { id: content.briefId }, select: { title: true } }) : null,
    prisma.contentCategory.findUnique({ where: { id: content.categoryId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: content.authorId }, select: { name: true } }),
  ]);

  // Create initial version snapshot
  await createVersion("SeoContent", content.id, {
    title: content.title,
    content: content.content,
    outline: content.outline,
    evidenceRefs: content.evidenceRefs,
  }, { generatedBy: "human" });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.CONTENT_CREATED,
    entityType: "SeoContent",
    entityId: content.id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "info",
    context: { title: content.title, briefId: content.briefId },
  });

  revalidatePath("/customer/marketing");

  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt,
    content: content.content,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    keywords: content.keywords,
    status: content.status,
    briefId: content.briefId,
    briefTitle: briefData?.title || undefined,
    outline: content.outline as ContentOutline | null,
    evidenceRefs: content.evidenceRefs,
    categoryId: content.categoryId,
    categoryName: categoryData?.name || undefined,
    authorName: authorData?.name || undefined,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

export async function updateContentPiece(id: string, input: UpdateContentInput): Promise<void> {
  const session = await getSession();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.content !== undefined) data.content = input.content;
  if (input.excerpt !== undefined) data.excerpt = input.excerpt || null;
  if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle || null;
  if (input.metaDescription !== undefined) data.metaDescription = input.metaDescription || null;
  if (input.keywords !== undefined) data.keywords = input.keywords;
  if (input.outline !== undefined) data.outline = input.outline as Prisma.InputJsonValue;
  if (input.evidenceRefs !== undefined) data.evidenceRefs = input.evidenceRefs;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.briefId !== undefined) data.briefId = input.briefId || null;
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.seoContent.update({
    where: { id, tenantId: session.user.tenantId },
    data,
  });

  // Create version snapshot on significant changes
  if (input.content !== undefined || input.outline !== undefined) {
    await createVersion("SeoContent", id, {
      title: updated.title,
      content: updated.content,
      outline: updated.outline,
      evidenceRefs: updated.evidenceRefs,
    }, { generatedBy: "human" });
  }

  // Bump version on meaningful edits (prisma client may not know new field until migration runs)
  if (input.title !== undefined || input.content !== undefined || input.keywords !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.seoContent as any).update({
      where: { id, tenantId: session.user.tenantId },
      data: { version: { increment: 1 } },
    }).catch(() => {});
  }

  // Auto-push when content is published
  if (input.status === "published") {
    const { pushContentToWebsite } = await import("./publishing");
    pushContentToWebsite(id).catch((err: unknown) =>
      console.warn("[auto-push] Failed for", id, err)
    );
  }

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: ACTIVITY_ACTIONS.CONTENT_UPDATED,
    entityType: "SeoContent",
    entityId: id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "info",
    context: { updatedFields: Object.keys(data) },
  });

  revalidatePath("/customer/marketing");
}

export async function deleteContentPiece(id: string): Promise<void> {
  const session = await getSession();

  await prisma.seoContent.update({
    where: { id, tenantId: session.user.tenantId },
    data: { deletedAt: new Date() },
  });

  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "content.deleted",
    entityType: "SeoContent",
    entityId: id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "warn",
    context: { softDelete: true },
  });

  revalidatePath("/customer/marketing");
}

// ==================== AI: Generate Outline from Brief ====================

const OUTLINE_GENERATION_PROMPT = `你是 B2B 内容策略专家。根据给定的内容规划（Brief）生成一份结构化的内容大纲。

内容规划信息：
- 标题：{title}
- 目标关键词：{keywords}
- 搜索意图：{intent}
- 备注：{notes}

请生成一份内容大纲，JSON 格式输出：

{
  "sections": [
    {
      "heading": "章节标题",
      "keyPoints": ["要点1", "要点2", "要点3"]
    }
  ]
}

要求：
- 只输出 JSON，不要额外文字
- 3-6 个章节
- 每个章节 2-4 个要点
- 符合 {intent} 搜索意图
- 覆盖"问题→方案→对比→决策"路径`;

export async function generateOutlineFromBrief(briefId: string): Promise<ContentOutline> {
  const session = await getSession();

  const brief = await prisma.contentBrief.findFirst({
    where: { id: briefId, tenantId: session.user.tenantId },
  });

  if (!brief) throw new Error("Brief 不存在");

  const prompt = OUTLINE_GENERATION_PROMPT
    .replace("{title}", brief.title)
    .replace("{keywords}", brief.targetKeywords.join("、"))
    .replace("{intent}", brief.intent)
    .replace("{notes}", brief.notes || "无")
    .replace("{intent}", brief.intent);

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { model: "qwen-plus", temperature: 0.4, maxTokens: 2048 }
  );

  let parsed: ContentOutline;
  try {
    let jsonStr = response.content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.warn('[generateContentOutline] JSON parse failed, using default outline:', error);
    parsed = {
      sections: [
        { heading: "问题背景", keyPoints: ["痛点分析", "现状挑战"] },
        { heading: "解决方案", keyPoints: ["核心功能", "技术优势"] },
        { heading: "案例对比", keyPoints: ["成功案例", "效果数据"] },
        { heading: "行动建议", keyPoints: ["下一步", "联系方式"] },
      ],
    };
  }

  return parsed;
}

// ==================== AI: Generate Content from Outline + Evidence ====================

const CONTENT_GENERATION_PROMPT = `你是 B2B 内容写作专家。根据大纲和证据库生成专业的营销内容。

标题：{title}
关键词：{keywords}
搜索意图：{intent}

大纲：
{outline}

可引用的证据（用 [E1]、[E2] 等标记引用）：
{evidences}

要求：
- 生成 Markdown 格式的正文
- 自然融入关键词（密度 1-2%）
- 引用证据时使用 [E1] 格式标记
- 专业、权威、可信的语气
- 800-1500 字`;

export async function generateContentFromOutline(
  briefId: string,
  outline: ContentOutline,
  evidenceIds: string[]
): Promise<{ content: string; usedEvidences: string[] }> {
  const session = await getSession();

  const brief = await prisma.contentBrief.findFirst({
    where: { id: briefId, tenantId: session.user.tenantId },
  });
  if (!brief) throw new Error("Brief 不存在");

  // Fetch evidences
  const evidences = await prisma.evidence.findMany({
    where: { id: { in: evidenceIds }, tenantId: session.user.tenantId },
  });

  const outlineText = outline.sections
    .map((s, i) => `${i + 1}. ${s.heading}\n   - ${s.keyPoints.join("\n   - ")}`)
    .join("\n");

  const evidenceText = evidences
    .map((e, i) => `[E${i + 1}] ${e.title}: ${e.content}`)
    .join("\n\n");

  const prompt = CONTENT_GENERATION_PROMPT
    .replace("{title}", brief.title)
    .replace("{keywords}", brief.targetKeywords.join("、"))
    .replace("{intent}", brief.intent)
    .replace("{outline}", outlineText)
    .replace("{evidences}", evidenceText || "（无可用证据）");

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { model: "qwen-plus", temperature: 0.5, maxTokens: 4096 }
  );

  return {
    content: response.content,
    usedEvidences: evidenceIds,
  };
}

// ==================== Get Categories ====================

export async function getContentCategories(): Promise<Array<{ id: string; name: string }>> {
  const session = await getSession();

  const categories = await prisma.contentCategory.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return categories;
}

// ==================== Stats ====================

export async function getContentStats(): Promise<{
  total: number;
  draft: number;
  review: number;
  published: number;
}> {
  const session = await getSession();

  const [total, draft, review, published] = await Promise.all([
    prisma.seoContent.count({
      where: { tenantId: session.user.tenantId, deletedAt: null },
    }),
    prisma.seoContent.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "draft" },
    }),
    prisma.seoContent.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "review" },
    }),
    prisma.seoContent.count({
      where: { tenantId: session.user.tenantId, deletedAt: null, status: "published" },
    }),
  ]);

  return { total, draft, review, published };
}

// ==================== AI: SEO-GEO Full Content Package (4-Block Pipeline) ====================

export type FullContentPackageResult = {
  contentId: string;
  title: string;
  slug: string;
  framework: string;
  wordCount: number;
  hasGeoVersion: boolean;
  hasSchemaJson: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
};

/**
 * Generates a full SEO+GEO content package from a ContentBrief.
 * Runs the 4-step seo-geo-pipeline (keyword research → SERP → article → 4 blocks).
 * Creates or updates a SeoContent record with all output fields populated.
 */
export async function generateFullContentPackage(briefId: string): Promise<FullContentPackageResult> {
  const session = await getSession();

  // Load brief with persona context
  const brief = await prisma.contentBrief.findFirst({
    where: { id: briefId, tenantId: session.user.tenantId, deletedAt: null },
    include: {
      targetPersona: { select: { name: true, title: true, concerns: true } },
    },
  });
  if (!brief) throw new Error("Brief not found");

  // Load company profile for context injection
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { tenantId: session.user.tenantId },
    select: { companyName: true, coreProducts: true, techAdvantages: true, targetRegions: true, targetIndustries: true },
  });

  // Load relevant evidence
  const evidenceIds = brief.evidenceIds || [];
  const evidence = evidenceIds.length > 0
    ? await prisma.evidence.findMany({
        where: { id: { in: evidenceIds }, tenantId: session.user.tenantId },
        select: { id: true, title: true, content: true },
        take: 8,
      })
    : [];

  // Build pipeline context
  const primaryKeyword = brief.targetKeywords[0] || brief.title;
  
  const products = Array.isArray(companyProfile?.coreProducts)
    ? (companyProfile.coreProducts as Array<{ name?: string }>).map(p => p?.name || '').filter(Boolean)
    : [];

  const advantages = Array.isArray(companyProfile?.techAdvantages)
    ? (companyProfile.techAdvantages as Array<{ title?: string }>).map(a => a?.title || '').filter(Boolean)
    : [];

  const pipelineCtx = {
    keyword: primaryKeyword,
    companyContext: companyProfile ? {
      name: companyProfile.companyName || session.user.tenantId,
      products,
      advantages,
      targetMarket: Array.isArray(companyProfile.targetRegions)
        ? (companyProfile.targetRegions as string[]).join(', ')
        : Array.isArray(companyProfile.targetIndustries)
          ? (companyProfile.targetIndustries as string[]).join(', ')
          : 'global B2B buyers',
    } : undefined,
    evidence: evidence.map(e => ({ id: e.id, title: e.title, content: e.content })),
    forceFramework: undefined,
  };

  // Run the 4-step pipeline
  const pkg = await runSeoGeoPipeline(pipelineCtx);

  // Find or create default category
  let categoryId = "";
  const defaultCategory = await prisma.contentCategory.findFirst({
    where: { tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (defaultCategory) {
    categoryId = defaultCategory.id;
  } else {
    const newCat = await prisma.contentCategory.create({
      data: { tenantId: session.user.tenantId, name: "SEO Content", slug: "seo-content" },
    });
    categoryId = newCat.id;
  }

  // Build slug (ensure uniqueness by appending timestamp if needed)
  let slug = pkg.slug;
  const existing = await prisma.seoContent.findFirst({
    where: { tenantId: session.user.tenantId, slug, deletedAt: null },
  });
  if (existing) slug = `${slug}-${Date.now()}`;

  // Prepare aiMetadata (includes geoVersion + pipeline metadata)
  const aiMetadata = {
    geoVersion: pkg.geoVersion,
    seoFramework: pkg.framework,
    primaryKeyword: pkg.primaryKeyword,
    supportingKeywords: pkg.supportingKeywords,
    wordCount: pkg.wordCount,
    generatedAt: new Date().toISOString(),
    generatedBy: 'seo-geo-pipeline',
  };

  // Create or update SeoContent record
  const fullContent = pkg.article + (pkg.faqMarkdown ? `

${pkg.faqMarkdown}` : '');

  const seoContent = await prisma.seoContent.create({
    data: {
      tenantId: session.user.tenantId,
      authorId: session.user.id,
      categoryId,
      briefId,
      title: pkg.metaTitle || brief.title,
      slug,
      content: fullContent,
      excerpt: pkg.metaDescription,
      metaTitle: pkg.metaTitle,
      metaDescription: pkg.metaDescription,
      keywords: [pkg.primaryKeyword, ...pkg.supportingKeywords],
      outline: {
        sections: pkg.serpAnalysis.mustCover.map(angle => ({
          heading: angle,
          keyPoints: [],
        })),
      } as Prisma.InputJsonValue,
      evidenceRefs: evidenceIds,
      schemaJson: pkg.schemaJsonLd as Prisma.InputJsonValue,
      aiMetadata: aiMetadata as Prisma.InputJsonValue,
      status: "draft",
    },
  });

  // Version snapshot
  await createVersion("SeoContent", seoContent.id, {
    title: seoContent.title,
    content: seoContent.content,
    outline: seoContent.outline,
    evidenceRefs: seoContent.evidenceRefs,
  }, { generatedBy: "ai", changeNote: `seo-geo-pipeline · ${pkg.framework}` });

  // Update brief status to in_progress
  await prisma.contentBrief.update({
    where: { id: briefId },
    data: { status: "in_progress" },
  });

  // Activity log
  logActivity({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "content.seo_geo_generated",
    entityType: "SeoContent",
    entityId: seoContent.id,
    eventCategory: EVENT_CATEGORIES.MARKETING,
    severity: "info",
    context: {
      briefId,
      keyword: primaryKeyword,
      framework: pkg.framework,
      wordCount: pkg.wordCount,
      hasGeoVersion: !!pkg.geoVersion,
    },
  });

  // Auto-register GEO distribution for all default AI channels
  if (pkg.geoVersion) {
    const defaultChannels: GeoChannel[] = [
      'CHATGPT', 'PERPLEXITY', 'CLAUDE', 'GEMINI', 'BING_COPILOT',
    ];
    try {
      await batchRegisterDistribution({
        contentId: seoContent.id,
        channels: defaultChannels,
        queryKeywords: [pkg.primaryKeyword, ...pkg.supportingKeywords.slice(0, 3)],
      });
    } catch (err) {
      // Non-fatal: log but don't fail the pipeline
      console.warn('[seo-geo-pipeline] Auto-register GEO distribution failed:', err);
    }
  }

  revalidatePath("/customer/marketing/contents");
  revalidatePath("/customer/marketing/briefs");
  revalidatePath("/customer/marketing/geo-center");

  return {
    contentId: seoContent.id,
    title: seoContent.title,
    slug: seoContent.slug,
    framework: pkg.framework,
    wordCount: pkg.wordCount,
    hasGeoVersion: !!pkg.geoVersion,
    hasSchemaJson: !!pkg.schemaJsonLd,
    metaTitle: pkg.metaTitle,
    metaDescription: pkg.metaDescription,
    keywords: seoContent.keywords as string[],
  };
}
