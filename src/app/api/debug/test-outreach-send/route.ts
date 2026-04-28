import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOutreachEmail } from '@/lib/email/outreach-service';
import { sendEmail } from '@/lib/email/resend-client';

export const maxDuration = 60;

/**
 * 测试Outreach邮件发送
 * GET /api/debug/test-outreach-send?secret=xxx&candidateId=xxx&email=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const candidateId = searchParams.get('candidateId');
  const email = searchParams.get('email');

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

    const targetEmail = email || candidate.email || 'admin@tdpaint.com';

    // 获取租户信息
    const tenant = await prisma.tenant.findUnique({
      where: { id: candidate.tenantId },
      include: { companyProfile: { select: { companyName: true } } },
    });

    // 获取证据
    const evidences = await prisma.evidence.findMany({
      where: { tenantId: candidate.tenantId, status: 'active' },
      select: { title: true, content: true },
      take: 5,
    });

    // 生成个性化邮件
    const emailContent = await generateOutreachEmail({
      candidateName: candidate.displayName,
      candidateCompany: candidate.displayName,
      candidateIndustry: candidate.industry || undefined,
      candidateCountry: candidate.country || undefined,
      candidateWebsite: candidate.website || undefined,
      candidateDescription: candidate.description || undefined,
      senderName: tenant?.companyProfile?.companyName || 'VertaX',
      senderCompany: tenant?.companyProfile?.companyName || 'VertaX',
      valueProposition: 'We provide robotic spray painting automation for manufacturers.',
      evidencePoints: evidences.map(e => `${e.title}: ${e.content?.slice(0, 100)}...`),
      language: 'en',
    });

    if (!emailContent.success) {
      return NextResponse.json({
        error: 'Failed to generate email',
        details: emailContent.error,
      }, { status: 500 });
    }

    // 发送邮件
    const result = await sendEmail({
      to: targetEmail,
      tenantId: candidate.tenantId,
      subject: emailContent.subject,
      html: emailContent.html,
      tags: { type: 'outreach', candidate: candidateId },
    });

    if (result.success) {
      // 更新候选状态
      await prisma.radarCandidate.update({
        where: { id: candidateId },
        data: { status: 'IMPORTED', email: targetEmail },
      });

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        candidate: {
          name: candidate.displayName,
          tier: candidate.qualifyTier,
        },
        email: {
          to: targetEmail,
          subject: emailContent.subject,
          bodyLength: emailContent.html.length,
        },
      });
    } else {
      return NextResponse.json({
        error: 'Failed to send email',
        details: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[test-outreach-send] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
