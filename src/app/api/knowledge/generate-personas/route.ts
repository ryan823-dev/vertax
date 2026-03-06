import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 60;

const PERSONA_PROMPT = `你是B2B出海营销专家。根据企业信息，分析其目标买家画像。

输出严格JSON格式：
{
  "buyerPersonas": [
    { "role": "角色名称", "title": "典型职位", "concerns": ["关注点1", "关注点2"] }
  ],
  "targetIndustries": ["行业1", "行业2"],
  "targetRegions": ["区域1", "区域2"]
}

规则：
1. buyerPersonas 至少3个，最多6个，覆盖决策链（决策者/影响者/使用者）
2. concerns 每个角色2-5条，具体、可落地
3. targetIndustries 根据产品适用性推断，2-5个
4. targetRegions 根据企业定位推断
只输出JSON。`;

export async function POST() {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const profile = await prisma.companyProfile.findUnique({ where: { tenantId } });
    if (!profile) {
      return NextResponse.json({ error: "请先生成企业档案" }, { status: 400 });
    }

    // 构建上下文
    const coreProducts = (profile.coreProducts as Array<{ name: string; description: string }>) || [];
    const techAdvantages = (profile.techAdvantages as Array<{ title: string; description: string }>) || [];
    const scenarios = (profile.scenarios as Array<{ industry: string; scenario: string; value: string }>) || [];

    let ctx = `企业：${profile.companyName}\n简介：${(profile.companyIntro || '').slice(0, 800)}`;
    if (coreProducts.length > 0) {
      ctx += `\n\n核心产品：\n${coreProducts.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (techAdvantages.length > 0) {
      ctx += `\n\n技术优势：\n${techAdvantages.map(a => `- ${a.title}: ${a.description}`).join('\n')}`;
    }
    if (scenarios.length > 0) {
      ctx += `\n\n应用场景：\n${scenarios.map(s => `- ${s.industry}/${s.scenario}: ${s.value}`).join('\n')}`;
    }

    // 调用 AI
    const aiResponse = await chatCompletion([
      { role: 'system', content: PERSONA_PROMPT },
      { role: 'user', content: ctx },
    ], { model: 'qwen-plus', temperature: 0.3, maxTokens: 2048 });

    // 解析
    let parsed: { buyerPersonas?: Array<{ role: string; title: string; concerns: string[] }>; targetIndustries?: string[]; targetRegions?: string[] };
    try {
      let jsonStr = aiResponse.content.trim();
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "AI 返回格式异常", raw: aiResponse.content.slice(0, 200) }, { status: 500 });
    }

    // 写回 CompanyProfile
    const updateData: Record<string, unknown> = {};
    if (parsed.buyerPersonas && parsed.buyerPersonas.length > 0) {
      updateData.buyerPersonas = parsed.buyerPersonas;
    }
    if (parsed.targetIndustries && parsed.targetIndustries.length > 0) {
      updateData.targetIndustries = parsed.targetIndustries;
    }
    if (parsed.targetRegions && parsed.targetRegions.length > 0) {
      updateData.targetRegions = parsed.targetRegions;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.companyProfile.update({
        where: { tenantId },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      buyerPersonas: parsed.buyerPersonas || [],
      targetIndustries: parsed.targetIndustries || [],
      targetRegions: parsed.targetRegions || [],
      duration: Date.now() - startTime,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[generate-personas] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
