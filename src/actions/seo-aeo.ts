"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ============================================
// SEO 评分逻辑（纯函数，可复用）
// ============================================

export type SeoCheck = {
  key: string;
  label: string;
  passed: boolean;
  score: number;   // 该项满分
  earned: number;  // 实际得分
  detail: string;
};

export type SeoAeoItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  content: string;
  wordCount: number;
  hasSchemaJson: boolean;
  hasGeoVersion: boolean;
  hasFaqSection: boolean;
  hasConclusion: boolean;
  framework: string | null;
  primaryKeyword: string | null;
  seoHealthScore: number;
  aeoScore: number;
  checks: SeoCheck[];
  createdAt: Date;
  updatedAt: Date;
};

export type SeoAeoSummary = {
  total: number;
  avgSeoScore: number;
  avgAeoScore: number;
  withSchema: number;
  withGeo: number;
  belowThreshold: number; // score < 60
  items: SeoAeoItem[];
};

function scoreSeo(c: {
  metaTitle: string | null;
  metaDescription: string | null;
  content: string;
  keywords: string[];
  wordCount: number;
  hasSchemaJson: boolean;
  hasGeoVersion: boolean;
}): { seoScore: number; aeoScore: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];

  // 1. Meta Title (20 pts)
  const titleLen = (c.metaTitle || "").length;
  const titlePass = titleLen >= 30 && titleLen <= 60;
  checks.push({
    key: "meta_title",
    label: "Meta Title 长度 (30–60)",
    passed: titlePass,
    score: 20,
    earned: titlePass ? 20 : titleLen > 0 ? 10 : 0,
    detail: titleLen > 0 ? `${titleLen} 字符` : "未填写",
  });

  // 2. Meta Description (20 pts)
  const descLen = (c.metaDescription || "").length;
  const descPass = descLen >= 120 && descLen <= 160;
  const descPartial = descLen > 0 && !descPass;
  checks.push({
    key: "meta_desc",
    label: "Meta Description 长度 (120–160)",
    passed: descPass,
    score: 20,
    earned: descPass ? 20 : descPartial ? 10 : 0,
    detail: descLen > 0 ? `${descLen} 字符` : "未填写",
  });

  // 3. 字数 (20 pts)
  const wordPass = c.wordCount >= 1500;
  const wordPartial = c.wordCount >= 800 && c.wordCount < 1500;
  checks.push({
    key: "word_count",
    label: "字数达标 (≥1500 words)",
    passed: wordPass,
    score: 20,
    earned: wordPass ? 20 : wordPartial ? 10 : 0,
    detail: `${c.wordCount.toLocaleString()} words`,
  });

  // 4. 关键词出现 (15 pts)
  const kw = c.keywords[0] || "";
  const kwInContent = kw
    ? c.content.toLowerCase().includes(kw.toLowerCase())
    : false;
  const kwInTitle = kw
    ? (c.metaTitle || "").toLowerCase().includes(kw.toLowerCase())
    : false;
  const kwScore = (kwInContent ? 10 : 0) + (kwInTitle ? 5 : 0);
  checks.push({
    key: "keyword_presence",
    label: "主关键词出现 (内容+标题)",
    passed: kwInContent && kwInTitle,
    score: 15,
    earned: kw ? kwScore : 0,
    detail: kw
      ? `"${kw}" ${kwInContent ? "✓正文" : "✗正文"} ${kwInTitle ? "✓标题" : "✗标题"}`
      : "无关键词",
  });

  // 5. FAQPage Schema (15 pts)
  checks.push({
    key: "schema_json",
    label: "FAQPage JSON-LD",
    passed: c.hasSchemaJson,
    score: 15,
    earned: c.hasSchemaJson ? 15 : 0,
    detail: c.hasSchemaJson ? "已生成" : "未生成",
  });

  // 6. GEO 版本 (10 pts)
  checks.push({
    key: "geo_version",
    label: "GEO 优化版本",
    passed: c.hasGeoVersion,
    score: 10,
    earned: c.hasGeoVersion ? 10 : 0,
    detail: c.hasGeoVersion ? "已生成" : "未生成",
  });

  const seoScore = checks.reduce((acc, ch) => acc + ch.earned, 0);

  // AEO score: schema + geo + FAQ section + conclusion + keyword presence
  const faqInContent = /#{1,3}\s*(FAQ|常见问题|Frequently Asked)/i.test(
    c.content
  );
  const hasConclusion = /#{1,3}\s*(结论|总结|Conclusion|Summary)/i.test(
    c.content
  );
  let aeoScore = 0;
  if (c.hasSchemaJson) aeoScore += 35;
  if (c.hasGeoVersion) aeoScore += 25;
  if (faqInContent) aeoScore += 20;
  if (hasConclusion) aeoScore += 10;
  if (kwInContent) aeoScore += 10;

  return { seoScore, aeoScore, checks };
}

// ============================================
// Server Actions
// ============================================

/**
 * Load all SeoContent items with computed SEO/AEO scores.
 * Scores are computed on-the-fly; persisted versions (if any) are in aiMetadata.
 */
export async function getSeoAeoItems(): Promise<SeoAeoSummary> {
  const session = await auth();
  if (!session?.user?.id) {
    return { total: 0, avgSeoScore: 0, avgAeoScore: 0, withSchema: 0, withGeo: 0, belowThreshold: 0, items: [] };
  }

  const rows = await prisma.seoContent.findMany({
    where: { tenantId: session.user.tenantId, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      metaTitle: true,
      metaDescription: true,
      keywords: true,
      content: true,
      schemaJson: true,
      aiMetadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const items: SeoAeoItem[] = rows.map((row) => {
    const meta = (row.aiMetadata || {}) as Record<string, unknown>;
    const geoVersion = (meta.geoVersion as string | null) || null;
    const wordCount =
      (meta.wordCount as number | null) ||
      row.content.split(/\s+/).filter(Boolean).length;
    const hasSchemaJson = !!row.schemaJson;
    const hasGeoVersion = !!geoVersion;
    const hasFaqSection = /#{1,3}\s*(FAQ|常见问题|Frequently Asked)/i.test(row.content);
    const hasConclusion = /#{1,3}\s*(结论|总结|Conclusion|Summary)/i.test(row.content);

    const { seoScore, aeoScore, checks } = scoreSeo({
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      content: row.content,
      keywords: row.keywords as string[],
      wordCount,
      hasSchemaJson,
      hasGeoVersion,
    });

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      keywords: row.keywords as string[],
      content: row.content,
      wordCount,
      hasSchemaJson,
      hasGeoVersion,
      hasFaqSection,
      hasConclusion,
      framework: (meta.seoFramework as string | null) || null,
      primaryKeyword: (meta.primaryKeyword as string | null) || null,
      seoHealthScore: seoScore,
      aeoScore,
      checks,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  const total = items.length;
  const avgSeoScore = total ? Math.round(items.reduce((a, i) => a + i.seoHealthScore, 0) / total) : 0;
  const avgAeoScore = total ? Math.round(items.reduce((a, i) => a + i.aeoScore, 0) / total) : 0;
  const withSchema = items.filter((i) => i.hasSchemaJson).length;
  const withGeo = items.filter((i) => i.hasGeoVersion).length;
  const belowThreshold = items.filter((i) => i.seoHealthScore < 60).length;

  return { total, avgSeoScore, avgAeoScore, withSchema, withGeo, belowThreshold, items };
}

/**
 * Persist computed SEO health score back into aiMetadata for a single item.
 * Called after "批量扫描" so the marketing dashboard stat is accurate.
 */
export async function persistSeoScores(
  scores: Array<{ id: string; seoHealthScore: number; aeoScore: number }>
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await Promise.all(
    scores.map(async ({ id, seoHealthScore, aeoScore }) => {
      const row = await prisma.seoContent.findFirst({
        where: { id, tenantId: session.user.tenantId, deletedAt: null },
        select: { aiMetadata: true },
      });
      if (!row) return;
      const meta = ((row.aiMetadata || {}) as Record<string, unknown>);
      await prisma.seoContent.update({
        where: { id },
        data: {
          aiMetadata: {
            ...meta,
            seoHealthScore,
            aeoScore,
            scoredAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    })
  );
}
