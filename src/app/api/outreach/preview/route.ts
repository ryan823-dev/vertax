/**
 * API: Outreach 邮件预览和模板生成
 * 
 * POST /api/outreach/preview
 * 
 * 为指定候选生成个性化邮件预览
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateOutreachEmail } from '@/lib/email/outreach-service';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { candidateId, customValueProp, language = 'en' } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    // 获取候选信息
    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (candidate.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 获取租户信息
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: {
        companyProfile: {
          select: {
            companyName: true,
            companyIntro: true,
            differentiators: true,
          },
        },
        evidences: {
          where: { status: 'active' },
          select: { id: true, title: true, content: true, type: true },
          take: 10,
        },
        personas: {
          select: { name: true, title: true, concerns: true },
          take: 3,
        },
      },
    });

    // 构建价值主张
    const valueProp = customValueProp || buildValueProposition(tenant);
    
    // 构建证据点
    const evidencePoints = tenant?.evidences?.slice(0, 5).map(e => 
      `${e.title}: ${e.content?.slice(0, 150)}...`
    ) || [];

    // 生成邮件
    const emailContent = await generateOutreachEmail({
      candidateName: candidate.displayName,
      candidateCompany: candidate.displayName,
      candidateIndustry: candidate.industry || undefined,
      candidateCountry: candidate.country || undefined,
      candidateWebsite: candidate.website || undefined,
      senderName: tenant?.companyProfile?.companyName || 'VertaX',
      senderCompany: tenant?.companyProfile?.companyName || 'VertaX',
      valueProposition: valueProp,
      evidencePoints,
      language: language as 'en' | 'zh',
    });

    return NextResponse.json({
      ok: true,
      candidate: {
        id: candidate.id,
        displayName: candidate.displayName,
        email: candidate.email,
        country: candidate.country,
        industry: candidate.industry,
        website: candidate.website,
        qualifyTier: candidate.qualifyTier,
      },
      email: emailContent,
      metadata: {
        valueProposition: valueProp,
        evidenceCount: evidencePoints.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[outreach/preview] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * 根据企业档案构建价值主张
 */
function buildValueProposition(tenant: {
  companyProfile?: {
    companyName?: string | null;
    companyIntro?: string | null;
    differentiators?: unknown;
  } | null;
  personas?: Array<{
    name: string;
    title: string;
    concerns: string[];
  }>;
} | null): string {
  const profile = tenant?.companyProfile;
  const differentiators = (profile?.differentiators as string[]) || [];
  
  if (differentiators.length > 0) {
    return differentiators.slice(0, 2).join('. ');
  }
  
  if (profile?.companyIntro) {
    return profile.companyIntro.slice(0, 200);
  }
  
  return 'We provide high-quality industrial automation solutions for manufacturers worldwide.';
}
