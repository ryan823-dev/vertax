import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { batchSendToCandidates } from "@/lib/outreach/email-sequence";

export const maxDuration = 180;

/**
 * POST /api/outreach/batch
 *
 * 批量发送邮件到多个候选人
 *
 * Body:
 * - candidateIds: string[] - 候选人 IDs
 * - subject?: string - 邮件主题
 * - body?: string - 邮件正文
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const body = await request.json();
    const { candidateIds, subject, body: emailBody } = body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "candidateIds required" }, { status: 400 });
    }

    if (candidateIds.length > 100) {
      return NextResponse.json({ error: "最多一次发送100个候选人" }, { status: 400 });
    }

    // 批量发送
    const result = await batchSendToCandidates(candidateIds, tenantId, {
      subject,
      body: emailBody,
    });

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      totalCandidates: candidateIds.length,
      validCandidates: candidateIds.length - result.failed,
      errors: result.errors.slice(0, 5),
    });
  } catch (error) {
    console.error("[outreach/batch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/outreach/batch
 *
 * 获取批量发送记录
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");
    const limit = parseInt(searchParams.get("limit") || "20");

    // 获取外联记录
    const records = await prisma.outreachRecord.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(candidateId && { candidateId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        toEmail: true,
        toName: true,
        subject: true,
        status: true,
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: records,
      total: records.length,
    });
  } catch (error) {
    console.error("[outreach/batch GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
