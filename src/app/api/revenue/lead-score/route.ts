import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { calculateLeadScore, isMQL, isSQL, type LeadScore } from '@/lib/revenue/lead-management';

export const maxDuration = 30;

/**
 * 线索评分API
 * POST /api/revenue/lead-score
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { interactiveData } = body;

    // 如果提供了候选ID，从数据库获取信息
    // 这里简化处理，直接使用传入的数据

    const score = calculateLeadScore(interactiveData || {});

    const result: {
      score: LeadScore;
      isMQL: boolean;
      isSQL: boolean;
      recommendation: string;
    } = {
      score,
      isMQL: isMQL(score),
      isSQL: isSQL(score),
      recommendation: getRecommendation(score),
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[lead-score] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}

function getRecommendation(score: LeadScore): string {
  if (score.negatives.length > 0) {
    return `负面因素：${score.negatives.join('、')}。建议：进一步验证或排除。`;
  }

  if (isSQL(score)) {
    return '高质量线索，建议立即安排销售跟进。';
  }

  if (isMQL(score)) {
    return '符合MQL标准，建议进入培育流程。';
  }

  if (score.fitScore >= 30) {
    return '画像匹配但互动不足，建议内容培育。';
  }

  if (score.engagementScore >= 20) {
    return '有互动但画像不匹配，建议进一步了解需求。';
  }

  return '线索质量较低，建议长期培育或排除。';
}
