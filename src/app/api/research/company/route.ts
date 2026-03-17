import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { researchCompany, generateResearchSummary } from '@/lib/research/company-research';

export const maxDuration = 60;

/**
 * 客户背调API
 * POST /api/research/company
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { candidateId, additionalContext } = body;

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

    // 获取租户信息（用于上下文）
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: {
        companyProfile: {
          select: {
            companyName: true,
            targetIndustries: true,
          },
        },
      },
    });

    // 获取目标行业
    const targetIndustries = tenant?.companyProfile?.targetIndustries;
    const industriesStr = Array.isArray(targetIndustries)
      ? targetIndustries.join(', ')
      : String(targetIndustries || '');

    // 执行背调
    const result = await researchCompany({
      companyName: candidate.displayName,
      website: candidate.website || undefined,
      industry: candidate.industry || undefined,
      country: candidate.country || undefined,
      description: candidate.description || undefined,
      additionalContext,
      tenantIndustry: industriesStr,
      tenantProducts: '涂装设备、自动化涂装线、喷涂机器人、粉末喷涂系统',
    });

    if (!result.success || !result.data) {
      return NextResponse.json({
        error: 'Research failed',
        details: result.error,
      }, { status: 500 });
    }

    // 保存背调结果到候选记录
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        aiSummary: generateResearchSummary(result.data),
        rawData: {
          ...(typeof candidate.rawData === 'object' && candidate.rawData !== null ? candidate.rawData : {}),
          companyResearch: JSON.parse(JSON.stringify(result.data)),
          researchAt: new Date().toISOString(),
        } as any,
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
    console.error('[research/company] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}

/**
 * 获取已保存的背调结果
 * GET /api/research/company?candidateId=xxx
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
        aiSummary: true,
        rawData: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const rawData = candidate.rawData as { companyResearch?: unknown } | null;
    const research = rawData?.companyResearch || null;

    return NextResponse.json({
      success: true,
      data: research,
      summary: candidate.aiSummary,
    });
  } catch (error) {
    console.error('[research/company GET] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
