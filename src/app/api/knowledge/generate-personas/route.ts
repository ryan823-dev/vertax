import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 60;

const PERSONA_PROMPT = `你是B2B出海获客专家。根据企业信息，分析其海外目标买家画像。

【核心业务语境】
本系统（VertaX）是一个“出海获客智能体”，帮助中国企业发现和开拓海外客户。
因此：
- targetRegions 必须是中国大陆以外的海外区域和国家
- 绝对不要输出“华东”、“华南”、“长三角”、“中国”等中国境内区域
- 即使企业资料中只提到国内案例，也要主动推断海外目标市场
- 推断时综合考虑：产品类型与海外需求、行业规模、认证门槛、采购习惯、价格竞争力、基建投资趋势

【市场区划参考】
targetRegions 的 region 字段请参考以下出海业务常用的市场区划（按市场特征相似性划分，非严格地理或政治分类）。
你可以直接使用下列区划名，也可以根据企业实际情况做合理细分（如单独拆出"北欧"强调环保认证）：
- 北美：美国、加拿大（成熟高端市场，强认证体系）
- 拉美：墨西哥、巴西、智利、哥伦比亚、阿根廷等（新兴工业化，价格敏感）
- 西欧：德国、法国、英国、意大利、西班牙、荷兰等（成熟市场，高合规门槛）
- 东欧：波兰、捷克、罗马尼亚、匈牙利等（制造业回流，性价比导向）
- 中东：阿联酋、沙特、土耳其、以色列等（基建投资驱动，项目制采购）
- 非洲：南非、尼日利亚、肯尼亚、埃及等（基础设施缺口大，长周期）
- 南亚：印度、巴基斯坦、孟加拉等（人口红利，制造业承接）
- 东南亚：越南、泰国、印尼、菲律宾、马来西亚等（制造业转移，中国供应链延伸）
- 东亚：日本、韩国（高端制造，技术互补）
- 大洋洲：澳大利亚、新西兰（资源型经济，认证严格）
- 独联体：俄罗斯、哈萨克斯坦、乌兹别克斯坦等（资源型需求，地缘敏感）
划分核心原则：同一个 region 里的国家，出海打法和客户画像大致相似。请根据企业实际产品与能力，选择最匹配的 2-5 个区域。

输出严格JSON格式：
{
  "buyerPersonas": [
    { "role": "角色名称", "title": "典型职位", "concerns": ["关注点1", "关注点2"] }
  ],
  "targetIndustries": ["行业1", "行业2"],
  "targetRegions": [
    { "region": "区域名", "countries": ["国家1", "国家2"], "rationale": "推荐该市场的判断依据" }
  ]
}

规则：
1. buyerPersonas 至少3个，最多6个，覆盖决策链（决策者/影响者/使用者）
2. concerns 每个角色2-5条，具体、可落地
3. targetIndustries 根据产品适用性推断，2-5个
4. targetRegions 必须是海外区域，每条包含 region、countries、rationale，2-5个
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
    let parsed: { buyerPersonas?: Array<{ role: string; title: string; concerns: string[] }>; targetIndustries?: string[]; targetRegions?: Array<{ region: string; countries: string[]; rationale: string }> | string[] };
    try {
      let jsonStr = aiResponse.content.trim();
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      console.error('[generate-personas] JSON parse failed:', String(error));
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
