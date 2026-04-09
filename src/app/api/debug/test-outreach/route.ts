/**
 * Debug: 测试 Outreach 功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOutreachEmail } from '@/lib/email/outreach-service';
import { sendEmail } from '@/lib/email/resend-client';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get('action') || 'status';
  const tenantId = 'cmmanspb30000anfp2ldflrov'; // 涂豆科技

  try {
    // 状态检查
    if (action === 'status') {
      const candidates = await prisma.radarCandidate.findMany({
        where: {
          tenantId,
          status: 'QUALIFIED',
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          qualifyTier: true,
          country: true,
          industry: true,
        },
        take: 20,
      });

      const withEmail = candidates.filter(c => c.email);
      const withoutEmail = candidates.filter(c => !c.email);

      return NextResponse.json({
        ok: true,
        summary: {
          totalQualified: candidates.length,
          withEmail: withEmail.length,
          withoutEmail: withoutEmail.length,
          canSendOutreach: withEmail.length,
        },
        candidatesWithEmail: withEmail.slice(0, 5),
        candidatesWithoutEmail: withoutEmail.slice(0, 5).map(c => ({
          id: c.id,
          displayName: c.displayName,
          qualifyTier: c.qualifyTier,
        })),
      });
    }

    // 生成预览
    if (action === 'preview') {
      const candidateId = req.nextUrl.searchParams.get('candidateId');

      // 如果没有指定候选，使用模拟数据测试
      if (!candidateId || candidateId === 'mock') {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: {
            companyProfile: { select: { companyName: true } },
            evidences: { where: { status: 'active' }, select: { title: true, content: true }, take: 5 },
          },
        });

        // 模拟候选数据
        const mockCandidate = {
          displayName: 'Automotive Coating Solutions GmbH',
          email: 'contact@autocoating.de',
          country: 'Germany',
          industry: 'Automotive Manufacturing',
          website: 'https://autocoating.de',
        };

        const emailContent = await generateOutreachEmail({
          candidateName: mockCandidate.displayName,
          candidateCompany: mockCandidate.displayName,
          candidateIndustry: mockCandidate.industry,
          candidateCountry: mockCandidate.country,
          candidateWebsite: mockCandidate.website,
          senderName: tenant?.companyProfile?.companyName || 'VertaX',
          senderCompany: tenant?.companyProfile?.companyName || 'VertaX',
          valueProposition: 'We help manufacturers optimize their coating processes with advanced automation solutions.',
          evidencePoints: tenant?.evidences.slice(0, 3).map(e => `${e.title}: ${e.content?.slice(0, 100)}...`) || [],
          language: 'en',
        });

        return NextResponse.json({
          ok: true,
          mock: true,
          candidate: mockCandidate,
          email: emailContent,
        });
      }

      const candidate = await prisma.radarCandidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          companyProfile: { select: { companyName: true } },
          evidences: { where: { status: 'active' }, select: { title: true, content: true }, take: 5 },
        },
      });

      const emailContent = await generateOutreachEmail({
        candidateName: candidate.displayName,
        candidateCompany: candidate.displayName,
        candidateIndustry: candidate.industry || undefined,
        candidateCountry: candidate.country || undefined,
        candidateWebsite: candidate.website || undefined,
        senderName: tenant?.companyProfile?.companyName || 'VertaX',
        senderCompany: tenant?.companyProfile?.companyName || 'VertaX',
        valueProposition: 'We help manufacturers optimize their coating processes with advanced automation solutions.',
        evidencePoints: tenant?.evidences.slice(0, 3).map(e => `${e.title}: ${e.content?.slice(0, 100)}...`) || [],
        language: 'en',
      });

      return NextResponse.json({
        ok: true,
        candidate: {
          id: candidate.id,
          displayName: candidate.displayName,
          email: candidate.email,
          country: candidate.country,
          industry: candidate.industry,
        },
        email: emailContent,
      });
    }

    // 测试发送（发送到测试邮箱）
    if (action === 'test-send') {
      const testEmail = req.nextUrl.searchParams.get('email') || 'test@example.com';

      const result = await sendEmail({
        to: testEmail,
        tenantId, // 使用租户配置
        subject: '[Test] VertaX Outreach Email Test',
        html: `
          <h1>Test Email from VertaX</h1>
          <p>This is a test email to verify the Outreach functionality.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
          <p>Tenant: ${tenantId}</p>
        `,
        tags: { type: 'test' },
      });

      return NextResponse.json({
        ok: true,
        result,
        tenantId,
        note: 'If RESEND_API_KEY is placeholder, this will fail with authentication error',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[test-outreach] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
