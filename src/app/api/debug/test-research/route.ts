import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { researchCompany, generateResearchSummary } from '@/lib/research/company-research';

export const maxDuration = 60;

/**
 * 测试客户背调
 * GET /api/debug/test-research?secret=xxx&candidateId=xxx
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
    // 获取候选信息
    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // 执行背调
    const result = await researchCompany({
      companyName: candidate.displayName,
      website: candidate.website || undefined,
      industry: candidate.industry || undefined,
      country: candidate.country || undefined,
      description: candidate.description || undefined,
      tenantIndustry: '汽车制造、工业涂装',
      tenantProducts: '涂装设备、自动化涂装线、喷涂机器人、粉末喷涂系统',
    });

    if (!result.success || !result.data) {
      return NextResponse.json({
        error: 'Research failed',
        details: result.error,
      }, { status: 500 });
    }

    // 保存背调结果
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        aiSummary: generateResearchSummary(result.data),
        rawData: {
          ...(typeof candidate.rawData === 'object' && candidate.rawData !== null ? candidate.rawData : {}),
          companyResearch: JSON.parse(JSON.stringify(result.data)),
          researchAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.displayName,
        tier: candidate.qualifyTier,
      },
      research: result.data,
    });
  } catch (error) {
    console.error('[test-research] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
