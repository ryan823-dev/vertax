import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 60;

// TargetingSpec prompt (from skill definition)
const TARGETING_SPEC_PROMPT = `你是B2B出海获客专家。根据输入的企业认知、产品、优势证据、ICP/Persona与触发事件，产出"可执行筛选规则 Targeting Spec"。

输出严格JSON格式：
{
  "targetingSpec": {
    "icpName": "理想客户画像名称",
    "segments": [
      {
        "segmentName": "细分市场名称",
        "firmographic": {
          "industries": ["行业1"],
          "countries": ["国家1"],
          "companySize": { "min": 50, "max": 500, "metric": "employees" },
          "exclude": ["排除的公司类型"]
        },
        "technographic": {
          "keywords": ["技术关键词"],
          "standards": ["采用的标准"],
          "systems": ["使用的系统"],
          "exclude": ["排除的技术"]
        },
        "useCases": [{ "name": "使用场景", "signals": ["识别信号"], "excludeSignals": ["排除信号"] }],
        "triggers": [{ "name": "触发事件", "signals": ["触发信号"], "whereToObserve": ["观察渠道"], "confidence": 0.8 }],
        "exclusionRules": [{ "rule": "排除规则", "why": "原因" }],
        "decisionUnit": {
          "roles": [{ "role": "角色", "kpi": ["KPI"], "typicalTitleKeywords": ["职位关键词"], "influence": "decision_maker" }]
        },
        "successCriteria": [{ "metric": "指标", "direction": "increase", "typicalRange": "20-30%" }],
        "evidenceIds": []
      }
    ],
    "assumptions": ["假设"],
    "openQuestions": ["待确认问题"]
  }
}

规则：
1. segments 至少1个细分市场，每个包含完整firmographic/technographic/triggers/decisionUnit
2. 规则必须可落地执行
3. 不编造事实，标注假设
只输出JSON。`;

// ChannelMap prompt (from skill definition)
const CHANNEL_MAP_PROMPT = `你是B2B获客研究负责人。基于Targeting Spec与Persona，生成"渠道地图 Channel Map"。

输出严格JSON格式：
{
  "channelMap": {
    "forSegment": "细分市场名称",
    "forPersona": "目标角色",
    "channels": [
      {
        "channelType": "maps|tender|search|directory|tradeshow|hiring|ecosystem|linkedin|association",
        "name": "渠道名称",
        "discoveryMethod": {
          "searchQueries": ["搜索查询1"],
          "signalsToLookFor": ["识别信号"],
          "captureSchema": ["company_name", "website", "phone"]
        },
        "expectedYield": "low|medium|high",
        "dataToCapture": ["公司名", "网址"],
        "complianceNotes": ["合规注意事项"],
        "priority": 8
      }
    ],
    "evidenceIds": [],
    "assumptions": ["假设"],
    "openQuestions": ["待确认问题"]
  }
}

规则：至少包含5种渠道(maps/tender/search/directory + 1种以上)，每个渠道必须给出可执行的searchQueries和signalsToLookFor。只输出JSON。`;

function parseAIJson(content: string): object {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn('[radar-sync] JSON parse failed:', String(error));
    return { rawContent: content };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId, id: userId } = session.user as { tenantId: string; id: string };
    const body = await request.json().catch(() => ({})) as {
      focusIndustries?: string[];
      focusRegions?: string[];
    };

    // 1. 加载知识上下文
    const [companyProfile, evidences, icpSegments] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { tenantId } }),
      prisma.evidence.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, type: true, title: true, content: true },
      }),
      prisma.iCPSegment.findMany({
        where: { tenantId },
        include: { personas: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    if (!companyProfile) {
      return NextResponse.json({ error: "请先完善企业认知（Company Profile）" }, { status: 400 });
    }

    // 2. 构建 TargetingSpec 上下文
    const techAdvantages = (companyProfile.techAdvantages as Array<{ title: string; description: string }>) || [];
    const coreProducts = (companyProfile.coreProducts as Array<{ name: string; description: string }>) || [];
    const targetIndustries = (companyProfile.targetIndustries as string[]) || [];
    const targetRegions = (companyProfile.targetRegions as Array<{ region: string; countries: string[]; rationale: string }> | string[]) || [];

    let ctx = `企业：${companyProfile.companyName}\n简介：${(companyProfile.companyIntro || '').slice(0, 600)}`;
    if (coreProducts.length > 0) {
      ctx += `\n\n核心产品：\n${coreProducts.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (techAdvantages.length > 0) {
      ctx += `\n\n技术优势：\n${techAdvantages.map(a => `- ${a.title}: ${a.description}`).join('\n')}`;
    }
    if (evidences.length > 0) {
      ctx += `\n\n已有证据：\n${evidences.map(e => `- [${e.id}] (${e.type}) ${e.title}: ${(e.content || '').slice(0, 100)}`).join('\n')}`;
    }

    const focusIndustries = body.focusIndustries || targetIndustries;
    const focusRegions = body.focusRegions || targetRegions;
    if (focusIndustries.length > 0) ctx += `\n\n重点行业：${focusIndustries.join('、')}`;
    if (focusRegions.length > 0) ctx += `\n\n重点区域：${focusRegions.join('、')}`;

    // ICP Segments & Personas context
    if (icpSegments.length > 0) {
      ctx += `\n\n已定义的ICP细分市场：`;
      for (const seg of icpSegments) {
        ctx += `\n- ${seg.name}${seg.industry ? ` (${seg.industry})` : ''}${seg.regions.length > 0 ? `: 区域[${seg.regions.join(', ')}]` : ''}`;
        for (const p of seg.personas) {
          ctx += `\n  - ${p.name} / ${p.title}${p.seniority ? ` (${p.seniority})` : ''}${p.concerns.length > 0 ? `: 关注[${p.concerns.slice(0, 5).join(', ')}]` : ''}`;
        }
      }
    }

    ctx += `\n\nICP名称：${companyProfile.companyName} ICP`;

    // 3. 调用 AI 生成 TargetingSpec
    const targetingResponse = await chatCompletion([
      { role: 'system', content: TARGETING_SPEC_PROMPT },
      { role: 'user', content: ctx },
    ], { model: 'qwen-plus', temperature: 0.3, maxTokens: 4096 });

    const targetingParsed = parseAIJson(targetingResponse.content);

    // 创建 TargetingSpec ArtifactVersion
    const targetingVersion = await prisma.artifactVersion.create({
      data: {
        tenantId,
        entityType: 'TargetingSpec',
        entityId: `targeting-spec-${tenantId}-${Date.now()}`,
        version: 1,
        status: 'draft',
        content: targetingParsed as object,
        meta: { generatedBy: 'ai', model: targetingResponse.model, tokens: targetingResponse.usage.totalTokens } as object,
        createdById: userId,
      },
    });

    // 4. 调用 AI 生成 ChannelMap（基于 TargetingSpec + Persona）
    let channelCtx = `Targeting Spec: ${JSON.stringify(targetingParsed, null, 2)}\n目标 Persona: ${companyProfile.companyName} 采购决策者\n重点区域: ${focusRegions.join('、') || '全球'}`;
    if (icpSegments.length > 0) {
      const allPersonas = icpSegments.flatMap(s => s.personas);
      if (allPersonas.length > 0) {
        channelCtx += `\n\n已定义买家角色：\n${allPersonas.map(p => `- ${p.name} / ${p.title}${p.concerns.length > 0 ? `: 关注[${p.concerns.slice(0, 3).join(', ')}]` : ''}`).join('\n')}`;
      }
    }

    const channelResponse = await chatCompletion([
      { role: 'system', content: CHANNEL_MAP_PROMPT },
      { role: 'user', content: channelCtx },
    ], { model: 'qwen-plus', temperature: 0.3, maxTokens: 4096 });

    const channelParsed = parseAIJson(channelResponse.content);

    // 创建 ChannelMap ArtifactVersion
    const channelVersion = await prisma.artifactVersion.create({
      data: {
        tenantId,
        entityType: 'ChannelMap',
        entityId: `channel-map-${tenantId}-${Date.now()}`,
        version: 1,
        status: 'draft',
        content: channelParsed as object,
        meta: { generatedBy: 'ai', model: channelResponse.model, tokens: channelResponse.usage.totalTokens } as object,
        createdById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      targetingSpecVersionId: targetingVersion.id,
      channelMapVersionId: channelVersion.id,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[radar-sync] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
