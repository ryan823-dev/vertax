import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateOutreachEmail } from '@/lib/email/outreach-service';
import { sendEmail } from '@/lib/email/resend-client';
import {
  formatCandidateContactHint,
  getCandidateOutreachContactProfile,
} from '@/lib/radar/contact-enrichment';

export const maxDuration = 60;

/**
 * 发送单封Outreach邮件
 * POST /api/outreach/send
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { candidateId, email: manualEmail, language = 'en' } = body;

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

    const contactProfile = getCandidateOutreachContactProfile(candidate, manualEmail);
    const targetEmail = contactProfile.email;
    if (!targetEmail) {
      return NextResponse.json({
        error: 'No email available',
        hint: formatCandidateContactHint(contactProfile) || 'Please provide an email address',
      }, { status: 400 });
    }

    // 获取租户信息
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: {
        companyProfile: { select: { companyName: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // 获取证据
    const evidences = await prisma.evidence.findMany({
      where: { tenantId: session.user.tenantId, status: 'active' },
      select: { title: true, content: true },
      take: 5,
    });

    // 生成个性化邮件（带追踪参数）
    const emailContent = await generateOutreachEmail({
      candidateName: candidate.displayName,
      candidateCompany: candidate.displayName,
      candidateIndustry: candidate.industry || undefined,
      candidateCountry: candidate.country || undefined,
      candidateWebsite: candidate.website || undefined,
      candidateDescription: candidate.description || undefined,
      recommendedContact: contactProfile.recommendedContact?.label,
      primaryEmail: contactProfile.primaryEmail?.value,
      complianceNote: contactProfile.complianceNote || undefined,
      senderName: tenant.companyProfile?.companyName || 'VertaX',
      senderCompany: tenant.companyProfile?.companyName || 'VertaX',
      valueProposition: 'We provide advanced coating solutions for manufacturers.',
      evidencePoints: evidences.map(e => `${e.title}: ${e.content?.slice(0, 100)}...`),
      language: language as 'en' | 'zh',
      // 追踪参数
      tenantId: session.user.tenantId,
      candidateId: candidateId,
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
      tenantId: session.user.tenantId,
      subject: emailContent.subject,
      html: emailContent.html,
      tags: {
        type: 'outreach',
        candidate: candidateId,
      },
    });

    if (result.success) {
      // 创建外联记录
      const outreachRecord = await prisma.outreachRecord.create({
        data: {
          tenantId: session.user.tenantId,
          candidateId: candidateId,
          toEmail: targetEmail,
          toName: candidate.displayName,
          subject: emailContent.subject || '',
          bodyHtml: emailContent.html,
          messageId: result.messageId,
          status: 'sent',
          sentAt: new Date(),
          metadata: {
            recommendedContact: contactProfile.recommendedContact?.label || null,
            primaryEmail: contactProfile.primaryEmail?.value || null,
            complianceNote: contactProfile.complianceNote || null,
          },
        },
      });

      // 更新候选状态
      await prisma.radarCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'IMPORTED',
          email: targetEmail,
        },
      });

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        outreachId: outreachRecord.id,
        message: `邮件已发送至 ${targetEmail}`,
      });
    } else {
      return NextResponse.json({
        error: 'Failed to send email',
        details: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[outreach/send] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
