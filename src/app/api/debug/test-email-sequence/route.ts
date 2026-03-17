import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOutreachSequence } from '@/lib/research/email-sequence';

export const maxDuration = 60;

/**
 * 测试邮件序列生成
 * GET /api/debug/test-email-sequence?secret=xxx&candidateId=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const candidateId = searchParams.get('candidateId');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId required' }, { status: 400 });
  }

  try {
    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const rawData = candidate.rawData as { companyResearch?: any } | null;
    const research = rawData?.companyResearch;

    const result = await generateOutreachSequence({
      companyName: candidate.displayName,
      industry: candidate.industry || undefined,
      painPoints: research?.painPoints?.operational || [
        '设备老化导致涂层不均匀',
        '人工成本持续上升',
        '环保合规压力增大',
      ],
      valueProposition: research?.outreachStrategy?.valueProposition || '提供高效自动化涂装解决方案',
      talkingPoints: research?.outreachStrategy?.talkingPoints || [
        '帮助同行业客户提升30%产能',
        '降低VOC排放50%',
        '投资回报周期小于18个月',
      ],
      psychologicalHooks: research?.outreachStrategy?.psychologicalHooks || [
        '损失厌恶：不升级设备将失去竞争力',
        '社会证明：同行业成功案例',
      ],
      socialProofAngles: research?.outreachStrategy?.socialProofAngles || [
        '同规模企业成功案例',
        '行业认证和奖项',
      ],
      productInfo: '涂装设备、自动化涂装线、喷涂机器人、粉末喷涂系统',
    });

    if (!result.success || !result.data) {
      return NextResponse.json({
        error: 'Failed to generate sequence',
        details: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.displayName,
        tier: candidate.qualifyTier,
      },
      sequence: result.data,
    });
  } catch (error) {
    console.error('[test-email-sequence] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
