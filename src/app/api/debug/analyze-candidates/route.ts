import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 分析候选质量分布
 * GET /api/debug/analyze-candidates?secret=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 获取所有候选
  const candidates = await prisma.radarCandidate.findMany({
    select: {
      id: true,
      displayName: true,
      status: true,
      qualifyTier: true,
      industry: true,
      country: true,
      website: true,
      phone: true,
      description: true,
      qualifyReason: true,
    },
  });

  // 关键词分类
  const targetKeywords = [
    // 制造商/工厂
    'manufacturing', 'manufacturer', 'factory', 'industrial',
    'automotive', 'metal', 'steel', 'coating', 'painting',
    'powder coating', 'surface treatment', 'finishing',
    // 工程公司
    'engineering', 'technology', 'systems',
  ];

  const excludeKeywords = [
    // 零售/供应商
    'supply', 'supplier', 'store', 'shop', 'warehouse',
    'parts', 'paints', 'colors',
    // 维修服务
    'repair', 'service', 'autobody', 'auto body',
    'collision', 'restoration',
    // 非工业
    'art', 'studio', 'gallery', 'retail',
  ];

  const analysis = {
    total: candidates.length,
    byStatus: {} as Record<string, number>,
    byTier: {} as Record<string, number>,
    targetMatches: [] as string[],
    excludeMatches: [] as string[],
    noMatch: [] as string[],
    dataQuality: {
      withWebsite: 0,
      withPhone: 0,
      withBoth: 0,
      withNeither: 0,
    },
  };

  for (const c of candidates) {
    // 状态统计
    analysis.byStatus[c.status] = (analysis.byStatus[c.status] || 0) + 1;
    analysis.byTier[c.qualifyTier || 'null'] = (analysis.byTier[c.qualifyTier || 'null'] || 0) + 1;

    // 数据质量
    if (c.website) analysis.dataQuality.withWebsite++;
    if (c.phone) analysis.dataQuality.withPhone++;
    if (c.website && c.phone) analysis.dataQuality.withBoth++;
    if (!c.website && !c.phone) analysis.dataQuality.withNeither++;

    // 关键词匹配
    const text = `${c.displayName} ${c.description || ''}`.toLowerCase();

    const isTarget = targetKeywords.some(kw => text.includes(kw));
    const isExclude = excludeKeywords.some(kw => text.includes(kw));

    if (isExclude) {
      analysis.excludeMatches.push(c.displayName);
    } else if (isTarget) {
      analysis.targetMatches.push(c.displayName);
    } else {
      analysis.noMatch.push(c.displayName);
    }
  }

  return NextResponse.json({
    summary: {
      total: analysis.total,
      byStatus: analysis.byStatus,
      byTier: analysis.byTier,
      dataQuality: analysis.dataQuality,
    },
    classification: {
      targetCount: analysis.targetMatches.length,
      excludeCount: analysis.excludeMatches.length,
      noMatchCount: analysis.noMatch.length,
      targetSamples: analysis.targetMatches.slice(0, 10),
      excludeSamples: analysis.excludeMatches.slice(0, 10),
      noMatchSamples: analysis.noMatch.slice(0, 10),
    },
  });
}
