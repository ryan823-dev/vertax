import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

/**
 * 重置恶性排除规则并重新处理被排除的候选
 * GET /api/debug/reset-exclusion-rules?secret=xxx&profileId=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const profileId = searchParams.get('profileId');

  // 验证密钥
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 重置排除规则
    const profile = await prisma.radarSearchProfile.update({
      where: { id: profileId || 'cmmncn9qy000004la9trpcmj4' },
      data: {
        exclusionRules: {
          negativeKeywords: [],
          excludedCompanies: [],
        },
      },
    });

    // 2. 将所有 EXCLUDED 候选重置为 NEW（重新评分）
    const resetResult = await prisma.radarCandidate.updateMany({
      where: {
        status: 'EXCLUDED',
        profileId: profileId || 'cmmncn9qy000004la9trpcmj4',
      },
      data: {
        status: 'NEW',
        qualifyTier: null,
        qualifyReason: null,
        qualifiedAt: null,
        qualifiedBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        exclusionRules: profile.exclusionRules,
      },
      candidatesReset: resetResult.count,
      message: `已重置排除规则，${resetResult.count} 个候选将重新评分`,
    });
  } catch (error) {
    console.error('[reset-exclusion-rules] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
