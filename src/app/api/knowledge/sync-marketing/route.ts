import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";

export const maxDuration = 60;

const TOPIC_CLUSTER_PROMPT = `你是B2B出海SEO/AEO内容策略专家。根据企业认知、ICP/Persona与证据，生成可执行的Topic Cluster（主题集群+内容地图）。

输出严格JSON格式：
{
  "topicCluster": {
    "name": "细分市场名称",
    "clusters": [
      {
        "clusterName": "主题集群名称",
        "coreKeywords": ["核心关键词1"],
        "longTailKeywords": ["长尾关键词1"],
        "aeoQuestions": ["用户会问的问题？"],
        "commercialKeywords": ["商业意图关键词"],
        "negatives": ["排除词"],
        "contentMap": [
          {
            "type": "BuyingGuide|FAQ|CaseStudy|Comparison|UseCasePage",
            "title": "内容标题",
            "briefGoal": "内容目标",
            "funnel": "TOFU|MOFU|BOFU",
            "intent": "informational|commercial|transactional"
          }
        ]
      }
    ]
  },
  "confidence": 0.8
}

规则：每个cluster至少3个contentMap条目，覆盖TOFU/MOFU/BOFU。至少生成2个cluster。只输出JSON。`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId, id: userId } = session.user as { tenantId: string; id: string };
    const body = await request.json().catch(() => ({})) as {
      focusSegment?: string;
    };

    // 加载企业档案 + 证据摘要
    const [companyProfile, evidences] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { tenantId } }),
      prisma.evidence.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, title: true },
      }),
    ]);

    if (!companyProfile) {
      return NextResponse.json({ error: "请先完善企业认知（Company Profile）" }, { status: 400 });
    }

    // 构建精简上下文
    const techAdvantages = (companyProfile.techAdvantages as Array<{ title: string; description: string }>) || [];
    const coreProducts = (companyProfile.coreProducts as Array<{ name: string; description: string }>) || [];

    let ctx = `企业：${companyProfile.companyName}\n简介：${(companyProfile.companyIntro || '').slice(0, 600)}`;
    if (coreProducts.length > 0) {
      ctx += `\n\n核心产品：\n${coreProducts.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;
    }
    if (techAdvantages.length > 0) {
      ctx += `\n\n技术优势：\n${techAdvantages.map(a => `- ${a.title}: ${a.description}`).join('\n')}`;
    }
    if (evidences.length > 0) {
      ctx += `\n\n已有证据：\n${evidences.map(e => `- [${e.id}] (${e.type}) ${e.title}`).join('\n')}`;
    }
    if (body.focusSegment) {
      ctx += `\n\n聚焦细分市场：${body.focusSegment}`;
    }

    // 直接调用 AI（绕过 Skill 系统，避免 Vercel serverless 动态 import 失败）
    const aiResponse = await chatCompletion([
      { role: 'system', content: TOPIC_CLUSTER_PROMPT },
      { role: 'user', content: ctx }
    ], { model: 'qwen-plus', temperature: 0.4, maxTokens: 4096 });

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
        entityType: 'TopicCluster',
        entityId: `topic-cluster-${tenantId}-${Date.now()}`,
        version: 1,
        status: 'draft',
        content: parsed as object,
        meta: { generatedBy: 'ai', model: aiResponse.model, tokens: aiResponse.usage.totalTokens } as object,
        createdById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      topicClusterVersionId: version.id,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[sync-marketing] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
