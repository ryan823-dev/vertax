"use server";

/**
 * RadarContentLink Server Actions
 *
 * 管理雷达候选 ↔ 内容的双向关联，支持手动绑定/解绑、查询已关联内容/候选。
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ContentLinkType, Prisma } from "@prisma/client";

// ==================== 类型 ====================

export type RadarContentLinkData = {
  id: string;
  candidateId: string;
  candidateName: string;
  contentId: string;
  contentTitle: string;
  contentSlug: string;
  linkType: ContentLinkType;
  matchScore: number | null;
  outreachStatus: string | null;
  clickCount: number;
  leadGenerated: boolean;
  createdAt: Date;
};

type RadarContentLinkWithRelations = Prisma.RadarContentLinkGetPayload<{
  include: {
    candidate: { select: { displayName: true } };
    content: { select: { title: true; slug: true } };
  };
}>;

// ==================== 绑定内容到候选 ====================

export async function linkContentToCandidate(input: {
  candidateId: string;
  contentId: string;
  linkType?: ContentLinkType;
  matchScore?: number;
  matchDetails?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return { success: false, error: "用户不存在" };
  const tenantId = user.tenantId as string;

  // 验证候选和内容都属于该租户
  const [candidate, content] = await Promise.all([
    prisma.radarCandidate.findFirst({
      where: { id: input.candidateId, tenantId },
      select: { id: true },
    }),
    prisma.seoContent.findFirst({
      where: { id: input.contentId, tenantId, deletedAt: null },
      select: { id: true },
    }),
  ]);

  if (!candidate) return { success: false, error: "候选不存在" };
  if (!content) return { success: false, error: "内容不存在" };

  try {
    const link = await prisma.radarContentLink.upsert({
      where: {
        candidateId_contentId: {
          candidateId: input.candidateId,
          contentId: input.contentId,
        },
      },
      create: {
        tenantId,
        candidateId: input.candidateId,
        contentId: input.contentId,
        linkType: input.linkType ?? "MANUAL",
        matchScore: input.matchScore ?? null,
        matchDetails: input.matchDetails
          ? (input.matchDetails as Prisma.InputJsonValue)
          : undefined,
      },
      update: {
        linkType: input.linkType ?? "MANUAL",
        matchScore: input.matchScore ?? null,
        matchDetails: input.matchDetails
          ? (input.matchDetails as Prisma.InputJsonValue)
          : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return { success: true, id: link.id };
  } catch (err) {
    console.error("[linkContentToCandidate]", err);
    return { success: false, error: "绑定失败" };
  }
}

// ==================== 解绑 ====================

export async function unlinkContentFromCandidate(
  candidateId: string,
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return { success: false, error: "用户不存在" };
  const tenantId = user.tenantId as string;

  try {
    await prisma.radarContentLink.deleteMany({
      where: { candidateId, contentId, tenantId },
    });
    return { success: true };
  } catch (err) {
    console.error("[unlinkContentFromCandidate]", err);
    return { success: false, error: "解绑失败" };
  }
}

// ==================== 查询候选关联的内容 ====================

export async function getLinkedContents(candidateId: string): Promise<RadarContentLinkData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user.tenantId as string;

  const links: RadarContentLinkWithRelations[] = await prisma.radarContentLink.findMany({
    where: { candidateId, tenantId },
    include: {
      candidate: { select: { displayName: true } },
      content: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return links.map((l) => ({
    id: l.id,
    candidateId: l.candidateId,
    candidateName: l.candidate.displayName,
    contentId: l.contentId,
    contentTitle: l.content.title,
    contentSlug: l.content.slug,
    linkType: l.linkType,
    matchScore: l.matchScore,
    outreachStatus: l.outreachStatus,
    clickCount: l.clickCount,
    leadGenerated: l.leadGenerated,
    createdAt: l.createdAt,
  }));
}

// ==================== 查询内容关联的候选 ====================

export async function getLinkedCandidates(contentId: string): Promise<RadarContentLinkData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user.tenantId as string;

  const links: RadarContentLinkWithRelations[] = await prisma.radarContentLink.findMany({
    where: { contentId, tenantId },
    include: {
      candidate: { select: { displayName: true } },
      content: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return links.map((l) => ({
    id: l.id,
    candidateId: l.candidateId,
    candidateName: l.candidate.displayName,
    contentId: l.contentId,
    contentTitle: l.content.title,
    contentSlug: l.content.slug,
    linkType: l.linkType,
    matchScore: l.matchScore,
    outreachStatus: l.outreachStatus,
    clickCount: l.clickCount,
    leadGenerated: l.leadGenerated,
    createdAt: l.createdAt,
  }));
}

// ==================== 自动匹配建议（关键词交集） ====================

export async function suggestLinksForCandidate(
  candidateId: string,
  limit = 5
): Promise<{ contentId: string; title: string; slug: string; score: number; matchedKeywords: string[] }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user.tenantId as string;

  const candidate = await prisma.radarCandidate.findFirst({
    where: { id: candidateId, tenantId },
    select: { displayName: true, industry: true, description: true, aiRelevance: true },
  });
  if (!candidate) return [];

  // 提取候选关键词
  const aiRel = candidate.aiRelevance as { matchedKeywords?: string[] } | null;
  const candidateKeywords = [
    ...(aiRel?.matchedKeywords ?? []),
    ...(candidate.industry?.split(/[,，]/).map(k => k.trim()) ?? []),
  ].filter(Boolean).map(k => k.toLowerCase());

  if (candidateKeywords.length === 0) return [];

  // 找近期已发布内容
  const contents = await prisma.seoContent.findMany({
    where: { tenantId, status: { in: ["published", "draft"] }, deletedAt: null },
    select: { id: true, title: true, slug: true, keywords: true, metaDescription: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  // 简单关键词交集评分
  const scored = contents.map(c => {
    const contentText = [
      c.title,
      c.keywords,
      c.metaDescription,
    ].filter(Boolean).join(" ").toLowerCase();

    const matched = candidateKeywords.filter(kw => contentText.includes(kw));
    return {
      contentId: c.id,
      title: c.title,
      slug: c.slug,
      score: matched.length,
      matchedKeywords: matched,
    };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

// ==================== 自动匹配建议 (ProspectCompany 视角) ====================

export async function suggestLinksForProspect(
  prospectId: string,
  limit = 5
): Promise<{ contentId: string; title: string; slug: string; score: number; matchedKeywords: string[]; reason: string }[]> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) return [];
  const tenantId = session.user.tenantId;

  const prospect = await prisma.prospectCompany.findUnique({
    where: { id: prospectId, tenantId },
    select: { 
      name: true, 
      industry: true, 
      description: true, 
      matchReasons: true, 
      approachAngle: true 
    },
  });
  if (!prospect) return [];

  // 提取关键词
  const matchReasons = (prospect.matchReasons as string[]) || [];
  const prospectKeywords = [
    ...matchReasons,
    prospect.industry,
    prospect.approachAngle,
  ].filter(Boolean).map(k => k!.toLowerCase());

  if (prospectKeywords.length === 0) return [];

  // 找已发布内容
  const contents = await prisma.seoContent.findMany({
    where: { tenantId, status: "published", deletedAt: null },
    select: { id: true, title: true, slug: true, keywords: true, metaDescription: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const scored = contents.map(c => {
    const contentText = [
      c.title,
      c.keywords.join(' '),
      c.metaDescription,
    ].filter(Boolean).join(" ").toLowerCase();

    const matched = prospectKeywords.filter(kw => contentText.includes(kw));
    return {
      contentId: c.id,
      title: c.title,
      slug: c.slug,
      score: matched.length,
      matchedKeywords: matched,
      reason: matched.length > 0 ? `匹配关键词: ${matched.slice(0, 3).join(', ')}` : '潜在匹配'
    };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
