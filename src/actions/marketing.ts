"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiClient } from "@/lib/ai-client";
import { requireDecider } from "@/lib/permissions";

// ===================== Types =====================

export type ContentData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  featuredImage: string | null;
  status: string;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  autoPublishAt: Date | null;
  generatedBy: string | null;
  categoryId: string;
  categoryName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketingStats = {
  totalContents: number;
  published: number;
  draft: number;
  scheduled: number;
  awaitingPublish: number;
};

export type ContentCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type KeywordSuggestion = {
  keyword: string;
  searchVolume: string;
  difficulty: string;
  intent: string;
};

// ===================== Get Contents =====================

export async function getContents(): Promise<ContentData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const contents = await prisma.seoContent.findMany({
    where: {
      tenantId: tenantId,
      deletedAt: null,
    },
    include: {
      category: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return contents.map((content) => ({
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt,
    content: content.content,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    keywords: content.keywords,
    featuredImage: content.featuredImage,
    status: content.status,
    publishedAt: content.publishedAt,
    scheduledAt: content.scheduledAt,
    autoPublishAt: content.autoPublishAt,
    generatedBy: content.generatedBy,
    categoryId: content.categoryId,
    categoryName: content.category.name,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  }));
}

// ===================== Get Stats =====================

export async function getMarketingStats(): Promise<MarketingStats> {
  const session = await auth();
  if (!session?.user?.id) {
    return { totalContents: 0, published: 0, draft: 0, scheduled: 0, awaitingPublish: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) {
    return { totalContents: 0, published: 0, draft: 0, scheduled: 0, awaitingPublish: 0 };
  }
  const tenantId = user!.tenantId as string;

  const [total, published, draft, scheduled, awaitingPublish] = await Promise.all([
    prisma.seoContent.count({
      where: { tenantId: tenantId, deletedAt: null },
    }),
    prisma.seoContent.count({
      where: { tenantId: tenantId, deletedAt: null, status: "published" },
    }),
    prisma.seoContent.count({
      where: { tenantId: tenantId, deletedAt: null, status: "draft" },
    }),
    prisma.seoContent.count({
      where: { tenantId: tenantId, deletedAt: null, status: "scheduled" },
    }),
    prisma.seoContent.count({
      where: { tenantId: tenantId, deletedAt: null, status: "awaiting_publish" },
    }),
  ]);

  return {
    totalContents: total,
    published,
    draft,
    scheduled,
    awaitingPublish,
  };
}

// ===================== Get Categories =====================

export async function getCategories(): Promise<ContentCategory[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const categories = await prisma.contentCategory.findMany({
    where: { tenantId: tenantId },
    orderBy: { order: "asc" },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
  }));
}

// ===================== Ensure Default Category =====================

async function ensureDefaultCategory(tenantId: string): Promise<string> {
  let category = await prisma.contentCategory.findFirst({
    where: { tenantId, slug: "default" },
  });

  if (!category) {
    category = await prisma.contentCategory.create({
      data: {
        tenantId,
        name: "默认分类",
        slug: "default",
        description: "默认内容分类",
        order: 0,
      },
    });
  }

  return category.id;
}

// ===================== AI Generate Keywords =====================

export async function generateKeywords(topic: string): Promise<KeywordSuggestion[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  // 获取企业画像用于上下文
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) throw new Error("用户不存在");
  const tenantId = user!.tenantId as string;

  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: tenantId },
    select: {
      companyName: true,
      coreProducts: true,
      targetIndustries: true,
    },
  });

  const systemPrompt = `你是一位专业的SEO关键词策略师。
根据用户提供的主题和企业背景，生成5-8个相关的SEO关键词建议。

${profile ? `
企业背景：
- 公司：${profile.companyName || '未知'}
- 核心产品：${JSON.stringify(profile.coreProducts) || '未知'}
- 目标行业：${JSON.stringify(profile.targetIndustries) || '未知'}
` : ''}

请为每个关键词提供：
1. 关键词
2. 搜索量估算（高/中/低）
3. 竞争难度（高/中/低）
4. 搜索意图（信息/导航/商业/交易）

以JSON数组格式返回：
[{
  "keyword": "关键词",
  "searchVolume": "高/中/低",
  "difficulty": "高/中/低",
  "intent": "信息/导航/商业/交易"
}]

只返回JSON数组，不要其他文字。`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "deepseek-v3",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `主题：${topic}` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI未返回结果");

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI返回格式错误");

    return JSON.parse(jsonMatch[0]) as KeywordSuggestion[];
  } catch (error) {
    console.error("关键词生成失败:", error);
    throw new Error(`关键词生成失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

// ===================== AI Generate Content =====================

export async function generateContent(
  keyword: string,
  contentType: "article" | "product" | "case"
): Promise<{ title: string; content: string; metaTitle: string; metaDescription: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) throw new Error("用户不存在");
  const tenantId = user!.tenantId as string;

  // 获取企业画像
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: tenantId },
  });

  const typeLabels = {
    article: "SEO博客文章",
    product: "产品介绍页",
    case: "客户案例页",
  };

  const systemPrompt = `你是一位专业的SEO内容写手。
请根据目标关键词创建一篇优质的${typeLabels[contentType]}。

${profile ? `
企业信息：
- 公司名称：${profile.companyName || ''}
- 公司简介：${profile.companyIntro || ''}
- 核心产品：${JSON.stringify(profile.coreProducts) || ''}
- 技术优势：${JSON.stringify(profile.techAdvantages) || ''}
- 差异化卖点：${JSON.stringify(profile.differentiators) || ''}
` : ''}

内容要求：
1. 标题吸引人，包含目标关键词
2. 内容结构清晰，使用H2、H3标题
3. 自然融入关键词，关键词密度2-3%
4. 提供实用价值，解决读者问题
5. 字数800-1500字
6. 使用Markdown格式

请返回JSON格式：
{
  "title": "文章标题",
  "content": "Markdown格式的正文内容",
  "metaTitle": "SEO标题（60字符以内）",
  "metaDescription": "SEO描述（160字符以内）"
}

只返回JSON对象，不要其他文字。`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "deepseek-v3",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `目标关键词：${keyword}\n内容类型：${typeLabels[contentType]}` },
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI未返回结果");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI返回格式错误");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("内容生成失败:", error);
    throw new Error(`内容生成失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

// ===================== Save Content =====================

export async function saveContent(data: {
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  categoryId?: string;
  status?: string;
  generatedBy?: "ai" | "human"; // Mark content origin for auto-publish logic
}): Promise<ContentData> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, id: true },
  });
  if (!user) throw new Error("用户不存在");
  const tenantId = user!.tenantId as string;

  // 确保有默认分类
  const categoryId = data.categoryId || (await ensureDefaultCategory(tenantId));

  // 生成 slug
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) + "-" + Date.now().toString(36);

  // Determine status and autoPublishAt based on generatedBy
  const isAiGenerated = data.generatedBy === "ai";
  const status = isAiGenerated ? "awaiting_publish" : (data.status || "draft");
  const autoPublishAt = isAiGenerated ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

  const content = await prisma.seoContent.create({
    data: {
      tenantId: tenantId,
      authorId: user.id,
      categoryId,
      title: data.title,
      slug,
      content: data.content,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      keywords: data.keywords || [],
      status,
      autoPublishAt,
      generatedBy: data.generatedBy || null,
    },
    include: {
      category: { select: { name: true } },
    },
  });

  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt,
    content: content.content,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    keywords: content.keywords,
    featuredImage: content.featuredImage,
    status: content.status,
    publishedAt: content.publishedAt,
    scheduledAt: content.scheduledAt,
    autoPublishAt: content.autoPublishAt,
    generatedBy: content.generatedBy,
    categoryId: content.categoryId,
    categoryName: content.category.name,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

// ===================== Update Content Status =====================

export async function updateContentStatus(
  contentId: string,
  status: string
): Promise<ContentData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return null;
  const tenantId = user!.tenantId as string;

  const content = await prisma.seoContent.update({
    where: {
      id: contentId,
      tenantId: tenantId,
    },
    data: {
      status,
      publishedAt: status === "published" ? new Date() : undefined,
      // Clear autoPublishAt when manually publishing or changing status
      autoPublishAt: status === "published" ? null : undefined,
    },
    include: {
      category: { select: { name: true } },
    },
  });

  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt,
    content: content.content,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    keywords: content.keywords,
    featuredImage: content.featuredImage,
    status: content.status,
    publishedAt: content.publishedAt,
    scheduledAt: content.scheduledAt,
    autoPublishAt: content.autoPublishAt,
    generatedBy: content.generatedBy,
    categoryId: content.categoryId,
    categoryName: content.category.name,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

// ===================== Delete Content =====================

export async function deleteContent(contentId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return false;
  const tenantId = user!.tenantId as string;

  await prisma.seoContent.update({
    where: {
      id: contentId,
      tenantId: tenantId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return true;
}
