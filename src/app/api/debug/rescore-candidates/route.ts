import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdapterRegistration, ensureAdaptersInitialized } from '@/lib/radar/adapters';

export const maxDuration = 60;

// 复用评分逻辑
function scoreCandidate(
  candidate: { displayName: string; website?: string | null; phone?: string | null; country?: string | null; industry?: string | null; matchScore?: number | null; description?: string | null },
  profile: { targetCountries: string[]; industryCodes: string[]; exclusionRules: unknown }
): 'A' | 'B' | 'C' | 'excluded' {
  const text = `${candidate.displayName} ${candidate.description || ''}`.toLowerCase();

  // 负向信号
  const excludeKeywords = [
    'supply', 'supplier', 'store', 'shop', 'warehouse',
    'paints', 'colors', 'parts',
    'repair', 'autobody', 'auto body', 'collision', 'restoration',
    'art studio', 'gallery', 'retail',
  ];

  if (excludeKeywords.some(kw => text.includes(kw))) {
    return 'excluded';
  }

  let score = 0;

  // 制造商信号
  if (['manufacturing', 'manufacturer', 'factory', 'mfg'].some(kw => text.includes(kw))) score += 5;
  // 工业涂装信号
  if (['industrial', 'powder coating', 'surface treatment', 'finishing', 'coating system'].some(kw => text.includes(kw))) score += 4;
  // 汽车相关
  if (text.includes('automotive')) score += 3;
  // 金属相关
  if (text.includes('metal') || text.includes('steel')) score += 2;
  // 工程公司
  if (text.includes('engineering') || text.includes('technology') || text.includes('systems')) score += 2;
  // 联系方式
  if (candidate.website) score += 2;
  if (candidate.phone) score += 1;
  // 国家匹配
  if (candidate.country) {
    const matched = profile.targetCountries.some(tc =>
      candidate.country!.toUpperCase().includes(tc.toUpperCase()) ||
      tc.toUpperCase().includes(candidate.country!.toUpperCase().slice(0, 2))
    );
    if (matched) score += 1;
  }
  // 匹配分数
  if (candidate.matchScore) score += Math.round(candidate.matchScore);

  // 排除规则
  const rules = (profile.exclusionRules as { excludedCompanies?: string[] }) || {};
  if (rules.excludedCompanies?.length) {
    const nameLower = candidate.displayName.toLowerCase();
    if (rules.excludedCompanies.some(e => nameLower.includes(e.toLowerCase()))) {
      return 'excluded';
    }
  }

  if (score >= 8) return 'A';
  if (score >= 5) return 'B';
  return 'C';
}

function needsEnrichment(candidate: { website?: string | null; phone?: string | null }): boolean {
  return !candidate.website && !candidate.phone;
}

/**
 * 重新评分所有候选
 * GET /api/debug/rescore-candidates?secret=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  ensureAdaptersInitialized();

  const stats = {
    total: 0,
    tierA: 0,
    tierB: 0,
    tierC: 0,
    excluded: 0,
    enriching: 0,
  };

  try {
    // 获取profile
    const profile = await prisma.radarSearchProfile.findFirst({
      where: { isActive: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No active profile' }, { status: 400 });
    }

    // 获取所有候选
    const candidates = await prisma.radarCandidate.findMany({
      include: { source: true },
    });

    stats.total = candidates.length;

    for (const candidate of candidates) {
      const tier = scoreCandidate(candidate, profile);

      if (tier === 'excluded') {
        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: {
            status: 'EXCLUDED',
            qualifyTier: 'excluded',
            qualifyReason: 'Negative keyword match',
            qualifiedAt: new Date(),
            qualifiedBy: 'rescore',
          },
        });
        stats.excluded++;
      } else {
        const shouldEnrich = needsEnrichment(candidate) &&
          candidate.source.storagePolicy !== 'ID_ONLY';
        const adapterReg = getAdapterRegistration(candidate.source.code);
        const supportsDetails = adapterReg?.features?.supportsDetails ?? false;
        const finalEnrich = shouldEnrich && supportsDetails;

        await prisma.radarCandidate.update({
          where: { id: candidate.id },
          data: {
            status: finalEnrich ? 'ENRICHING' : 'QUALIFIED',
            qualifyTier: tier,
            qualifyReason: finalEnrich ? `Tier ${tier}, needs enrichment` : `Tier ${tier}`,
            qualifiedAt: new Date(),
            qualifiedBy: 'rescore',
          },
        });

        if (tier === 'A') stats.tierA++;
        else if (tier === 'B') stats.tierB++;
        else stats.tierC++;

        if (finalEnrich) stats.enriching++;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `重新评分完成：A=${stats.tierA}, B=${stats.tierB}, C=${stats.tierC}, 排除=${stats.excluded}`,
    });
  } catch (error) {
    console.error('[rescore-candidates] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
