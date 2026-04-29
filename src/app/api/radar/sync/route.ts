import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 120;

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
  // 1. 鉴权 — 非流式返回错误
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, id: userId } = session.user as { tenantId: string; id: string };
  const body = await request.json().catch(() => ({})) as {
    focusIndustries?: string[];
    focusRegions?: string[];
  };

  // 2. SSE 流式响应 — 心跳保活，避免连接空闲被重置
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
          );
        } catch {
          /* controller may be closed */
        }
      };

      // 每 5 秒发心跳，防止 CDN/代理切断空闲连接
      const heartbeat = setInterval(() => {
        send("heartbeat", { ts: Date.now() });
      }, 5000);

      try {
        const startTime = Date.now();
        send("progress", { message: "正在加载知识库..." });

        // 3. 加载知识上下文
        const [companyProfile, , icpSegments] = await Promise.all([
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
            orderBy: { order: "asc" },
          }),
        ]);

        if (!companyProfile) {
          send("error", { error: "请先完善企业认知（Company Profile）" });
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        // 4. 构建上下文
        const techAdvantages =
          (companyProfile.techAdvantages as Array<{
            title: string;
            description: string;
          }>) || [];
        const coreProducts =
          (companyProfile.coreProducts as Array<{
            name: string;
            description: string;
          }>) || [];
        const targetIndustries =
          (companyProfile.targetIndustries as string[]) || [];
        const targetRegions =
          (companyProfile.targetRegions as
            | Array<{ region: string; countries: string[]; rationale: string }>
            | string[]) || [];

        let ctx = `企业：${companyProfile.companyName}\n简介：${(companyProfile.companyIntro || "").slice(0, 400)}`;
        if (coreProducts.length > 0)
          ctx += `\n产品：${coreProducts.map((p) => p.name).join(", ")}`;
        if (techAdvantages.length > 0)
          ctx += `\n技术优势：${techAdvantages.map((a) => a.title).join(", ")}`;

        const focusIndustries = body.focusIndustries || targetIndustries;
        const focusRegions = body.focusRegions || targetRegions;
        if (focusIndustries.length > 0)
          ctx += `\n行业：${focusIndustries.join("、")}`;
        if (focusRegions.length > 0)
          ctx += `\n区域：${focusRegions.join("、")}`;

        if (icpSegments.length > 0) {
          ctx += `\nICP：`;
          for (const seg of icpSegments) {
            ctx += `\n- ${seg.name}${seg.industry ? `(${seg.industry})` : ""}`;
            for (const p of seg.personas.slice(0, 2)) {
              ctx += `\n  - ${p.name}/${p.title}`;
            }
          }
        }

        // 5. 并行调用两个 AI
        send("progress", { message: "AI 正在分析目标客户画像..." });
        console.log("[radar-sync] Starting parallel AI calls...");

        const [targetingResponse, channelResponse] = await Promise.all([
          chatCompletion(
            [
              { role: "system", content: TARGETING_SPEC_PROMPT },
              { role: "user", content: ctx },
            ],
            { model: "qwen-plus", temperature: 0.3, maxTokens: 3000 }
          ),
          chatCompletion(
            [
              { role: "system", content: CHANNEL_MAP_PROMPT },
              {
                role: "user",
                content: `企业：${companyProfile.companyName}\n行业：${focusIndustries.join("、") || "多行业"}\n区域：${focusRegions.join("、") || "全球"}\n\n请生成获客渠道地图。`,
              },
            ],
            { model: "qwen-plus", temperature: 0.3, maxTokens: 3000 }
          ),
        ]);

        console.log(
          `[radar-sync] AI calls completed in ${Date.now() - startTime}ms`
        );

        const targetingParsed = parseAIJson(targetingResponse.content);
        const channelParsed = parseAIJson(channelResponse.content);

        // 6. 并行保存到数据库
        send("progress", { message: "正在保存分析结果..." });

        const [targetingVersion, channelVersion] = await Promise.all([
          prisma.artifactVersion.create({
            data: {
              tenantId,
              entityType: "TargetingSpec",
              entityId: `targeting-spec-${tenantId}-${Date.now()}`,
              version: 1,
              status: "draft",
              content: targetingParsed as object,
              meta: {
                generatedBy: "ai",
                model: targetingResponse.model,
                tokens: targetingResponse.usage.totalTokens,
              } as object,
              createdById: userId,
            },
          }),
          prisma.artifactVersion.create({
            data: {
              tenantId,
              entityType: "ChannelMap",
              entityId: `channel-map-${tenantId}-${Date.now()}`,
              version: 1,
              status: "draft",
              content: channelParsed as object,
              meta: {
                generatedBy: "ai",
                model: channelResponse.model,
                tokens: channelResponse.usage.totalTokens,
              } as object,
              createdById: userId,
            },
          }),
        ]);

        const duration = Date.now() - startTime;
        console.log(`[radar-sync] Total completed in ${duration}ms`);

        send("done", {
          success: true,
          targetingSpecVersionId: targetingVersion.id,
          channelMapVersionId: channelVersion.id,
          duration,
        });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Internal server error";
        console.error("[radar-sync] error:", msg);
        send("error", { error: msg });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
