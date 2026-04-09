import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateOutreachSequence } from '@/lib/research/email-sequence';

export const maxDuration = 60;

type CandidateResearchData = {
  companyResearch?: {
    painPoints?: {
      operational?: string[];
    };
    outreachStrategy?: {
      valueProposition?: string;
      talkingPoints?: string[];
      psychologicalHooks?: string[];
      socialProofAngles?: string[];
    };
  };
  emailSequence?: unknown;
};

/**
 * 生成邮件序列API
 * POST /api/research/email-sequence
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 });
    }

    // 获取候选信息
    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // 获取背调结果
    const rawData = candidate.rawData as CandidateResearchData | null;
    const research = rawData?.companyResearch;

    // 生成邮件序列
    const result = await generateOutreachSequence({
      companyName: candidate.displayName,
      industry: candidate.industry || undefined,
      painPoints: research?.painPoints?.operational || [],
      valueProposition: research?.outreachStrategy?.valueProposition,
      talkingPoints: research?.outreachStrategy?.talkingPoints || [],
      psychologicalHooks: research?.outreachStrategy?.psychologicalHooks || [],
      socialProofAngles: research?.outreachStrategy?.socialProofAngles || [],
      productInfo: '涂装设备、自动化涂装线、喷涂机器人、粉末喷涂系统、智能涂装解决方案',
    });

    if (!result.success || !result.data) {
      return NextResponse.json({
        error: 'Failed to generate sequence',
        details: result.error,
      }, { status: 500 });
    }

    // 保存邮件序列到候选记录
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        rawData: {
          ...(typeof candidate.rawData === 'object' && candidate.rawData !== null ? candidate.rawData : {}),
          emailSequence: JSON.parse(JSON.stringify(result.data)),
          sequenceGeneratedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      candidate: {
        id: candidate.id,
        name: candidate.displayName,
        tier: candidate.qualifyTier,
      },
    });
  } catch (error) {
    console.error('[email-sequence] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}

/**
 * 获取已保存的邮件序列
 * GET /api/research/email-sequence?candidateId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 });
    }

    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        displayName: true,
        rawData: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const rawData = candidate.rawData as CandidateResearchData | null;
    const sequence = rawData?.emailSequence || null;

    return NextResponse.json({
      success: true,
      data: sequence,
    });
  } catch (error) {
    console.error('[email-sequence GET] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
