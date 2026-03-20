import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerProfile, generatePersonalizedContent } from "@/lib/outreach/customer-profile";

/**
 * GET /api/outreach/customer-profile
 *
 * 获取客户背景画像
 *
 * Query: candidateId - 候选人ID
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    const profile = await getCustomerProfile(candidateId, session.user.tenantId);

    if (!profile) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("[customer-profile] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/customer-profile
 *
 * 生成个性化内容
 *
 * Body:
 * - candidateId: string - 候选人ID
 * - senderCompany: string - 发件公司名
 * - senderProduct: string - 发件产品/服务
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { candidateId, senderCompany, senderProduct } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    // 获取客户画像
    const profile = await getCustomerProfile(candidateId, session.user.tenantId);

    if (!profile) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // 生成个性化内容
    const content = await generatePersonalizedContent(
      profile,
      senderCompany || "Our Company",
      senderProduct || "Industrial Solutions"
    );

    return NextResponse.json({
      success: true,
      profile,
      content,
    });
  } catch (error) {
    console.error("[customer-profile POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
