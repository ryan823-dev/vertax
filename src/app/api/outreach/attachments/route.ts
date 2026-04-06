import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAttachmentTemplates,
  createAttachmentTemplate,
} from "@/lib/outreach/attachment-template";

/**
 * GET /api/outreach/attachments
 *
 * 获取附件模板列表
 *
 * Query: category - 可选，按分类筛选
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const templates = await getAttachmentTemplates(session.user.tenantId, {
      category,
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("[attachments GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/attachments
 *
 * 创建附件模板
 *
 * Body:
 * - name: string - 模板名称
 * - filename: string - 文件名
 * - contentType: string - MIME类型
 * - storageKey: string - OSS存储路径
 * - size: number - 文件大小
 * - category?: string - 分类
 * - industry?: string - 行业
 * - isDefault?: boolean - 是否默认
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      filename,
      contentType,
      storageKey,
      size,
      category,
      industry,
      isDefault,
    } = body;

    if (!name || !filename || !contentType || !storageKey || !size) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const template = await createAttachmentTemplate(
      session.user.tenantId,
      name,
      filename,
      contentType,
      storageKey,
      size,
      { category, industry, isDefault }
    );

    if (!template) {
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("[attachments POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
