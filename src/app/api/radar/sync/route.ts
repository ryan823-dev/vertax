import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 60;

// TargetingSpec prompt (simplified for faster response)
const TARGETING_SPEC_PROMPT = `你是B2B出海获客专家。根据输入的企业信息，产出"可执行筛选规则 Targeting Spec"。

输出严格JSON格式：
{
  "targetingSpec": {
    "icpName": "理想客户画像名称",
    "segmentation": {
      "firmographic": {
        "industries": ["行业1"],
        "countries": ["国家1"],
        "companySize": { "min": 50, "max": 500 },
        "exclude": []
      },
      "technographic": {
        "keywords": ["技术关键词"],
        "standards": [],
        "systems": [],
        "exclude": []
      },
      "useCases": [{ "name": "场景", "signals": ["信号"], "excludeSignals": [] }],
      "triggers": [{ "name": "触发事件", "signals": ["信号"], "whereToObserve": ["渠道"], "confidence": 0.8 }],
      "decisionUnit": [{ "role": "角色", "influence": "decision_maker" }],
      "exclusionRules": [{ "rule": "规则", "why": "原因" }]
    },
    "evidenceUsed": [],
    "assumptions": [],
    "openQuestions": []
  },
  "openQuestions": [],
  "confidence": 0.85
}

只输出JSON。`;

// ChannelMap prompt (simplified for faster response)
const CHANNEL_MAP_PROMPT = `你是B2B获客专家。基于企业信息，生成"渠道地图 Channel Map"。

输出严格JSON格式：
{
  "channelMap": {
    "personaName": "目标角色",
    "channels": [
      {
        "channelType": "maps|tender|search|directory|tradeshow|hiring|ecosystem|linkedin|association",
        "name": "渠道名称",
        "priority": 1,
        "discoveryMethod": {
          "searchQueries": ["查询1"],
          "signalsToLookFor": ["信号"],
          "captureSchema": ["company_name", "website"]
        },
        "evidenceIds": []
      }
    ]
  },
  "openQuestions": [],
  "confidence": 0.8
}

规则：至少5种渠道。只输出JSON。`;

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

    // 2. 构建上下文
    const techAdvantages = (companyProfile.techAdvantages as Array<{ title: string; description: string }>) || [];
    const coreProducts = (companyProfile.coreProducts as Array<{ name: string; description: string }>) || [];
    const targetIndustries = (companyProfile.targetIndustries as string[]) || [];
    const targetRegions = (companyProfile.targetRegions as Array<{ region: string; countries: string[]; rationale: string }> | string[]) || [];

    let ctx = `企业：${companyProfile.companyName}\n简介：${(companyProfile.companyIntro || '').slice(0, 400)}`;
    if (coreProducts.length > 0) {
      ctx += `\n产品：${coreProducts.map(p => p.name).join(', ')}`;
    }
    if (techAdvantages.length > 0) {
      ctx += `\n技术优势：${techAdvantages.map(a => a.title).join(', ')}`;
    }

    const focusIndustries = body.focusIndustries || targetIndustries;
    const focusRegions = body.focusRegions || targetRegions;
    if (focusIndustries.length > 0) ctx += `\n行业：${focusIndustries.join('、')}`;
    if (focusRegions.length > 0) ctx += `\n区域：${focusRegions.join('、')}`;

    // ICP Segments & Personas
    if (icpSegments.length > 0) {
      ctx += `\nICP：`;
      for (const seg of icpSegments) {
        ctx += `\n- ${seg.name}${seg.industry ? `(${seg.industry})` : ''}`;
        for (const p of seg.personas.slice(0, 2)) {
          ctx += `\n  - ${p.name}/${p.title}`;
        }
      }
    }

    // 3. 并行调用两个AI（而非串行）
    console.log('[radar-sync] Starting parallel AI calls...');
    
    const [targetingResponse, channelResponse] = await Promise.all([
      // TargetingSpec AI
      chatCompletion([
        { role: 'system', content: TARGETING_SPEC_PROMPT },
        { role: 'user', content: ctx },
      ], { model: 'qwen-plus', temperature: 0.3, maxTokens: 3000 }),
      
      // ChannelMap AI (使用简化的上下文)
      chatCompletion([
        { role: 'system', content: CHANNEL_MAP_PROMPT },
        { role: 'user', content: `企业：${companyProfile.companyName}\n行业：${focusIndustries.join('、') || '多行业'}\n区域：${focusRegions.join('、') || '全球'}\n\n请生成获客渠道地图。` },
      ], { model: 'qwen-plus', temperature: 0.3, maxTokens: 3000 }),
    ]);

    console.log(`[radar-sync] AI calls completed in ${Date.now() - startTime}ms`);

    const targetingParsed = parseAIJson(targetingResponse.content);
    const channelParsed = parseAIJson(channelResponse.content);

    // 4. 并行保存到数据库
    const [targetingVersion, channelVersion] = await Promise.all([
      prisma.artifactVersion.create({
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
      }),
      prisma.artifactVersion.create({
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
      }),
    ]);

    console.log(`[radar-sync] Total completed in ${Date.now() - startTime}ms`);

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
