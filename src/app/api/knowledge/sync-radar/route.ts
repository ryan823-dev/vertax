import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 60;

const TARGETING_SPEC_PROMPT = `你是B2B出海获客专家。根据企业信息生成Targeting Spec（目标客户筛选规则）。
输出严格JSON格式：
{
  "targetingSpec": {
    "icpName": "理想客户画像名称",
    "segments": [
      {
        "segmentName": "细分市场",
        "firmographic": { "industries": [], "countries": [] },
        "triggers": [{ "name": "触发事件", "signals": [], "confidence": 0.7 }]
      }
    ],
    "exclusionRules": [{ "rule": "排除规则", "reason": "原因" }]
  }
}
只输出JSON。`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId, id: userId } = session.user as { tenantId: string; id: string };

    // 加载企业档案 + ICP/Persona
    const [companyProfile, icpSegments] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { tenantId } }),
      prisma.iCPSegment.findMany({
        where: { tenantId },
        include: { personas: true },
        orderBy: { order: 'asc' },
      }),
    ]);
    if (!companyProfile) {
      return NextResponse.json({ error: "请先完善企业认知" }, { status: 400 });
    }

    // 构建精简上下文
    let ctx = `企业：${companyProfile.companyName}\n简介：${(companyProfile.companyIntro || '').slice(0, 500)}`;

    // ICP Segments & Personas
    if (icpSegments.length > 0) {
      ctx += `\n\n已定义的ICP细分市场：`;
      for (const seg of icpSegments) {
        ctx += `\n- ${seg.name}${seg.industry ? ` (${seg.industry})` : ''}${seg.regions.length > 0 ? `: 区域[${seg.regions.join(', ')}]` : ''}`;
        for (const p of seg.personas) {
          ctx += `\n  - ${p.name} / ${p.title}${p.seniority ? ` (${p.seniority})` : ''}${p.concerns.length > 0 ? `: 关注[${p.concerns.slice(0, 5).join(', ')}]` : ''}`;
        }
      }
    }

    // 调用 DashScope AI（已验证可用）
    const aiResponse = await chatCompletion([
      { role: 'system', content: TARGETING_SPEC_PROMPT },
      { role: 'user', content: ctx }
    ], { model: 'qwen-plus', temperature: 0.3, maxTokens: 2048 });

    // 解析 JSON
    let parsed: object;
    try {
      let jsonStr = aiResponse.content.trim();
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { rawContent: aiResponse.content };
    }

    // 创建 ArtifactVersion
    const version = await prisma.artifactVersion.create({
      data: {
        tenantId,
        entityType: 'TargetingSpec',
        entityId: `targeting-spec-${tenantId}-${Date.now()}`,
        version: 1,
        status: 'draft',
        content: parsed as object,
        meta: { generatedBy: 'ai', model: aiResponse.model, tokens: aiResponse.usage.totalTokens } as object,
        createdById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      targetingSpecVersionId: version.id,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[sync-radar] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
