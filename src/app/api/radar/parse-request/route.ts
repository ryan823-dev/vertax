import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { chatCompletion } from '@/lib/ai-client';
import {
  applyTargetingRefinement,
  buildCompanyProfileRefinementPatch,
  normalizeTargetingRefinement,
  type TargetingRefinement,
} from '@/lib/radar/targeting-refinement';

export const maxDuration = 60;

/**
 * 解析客户专家判断，写入目标客户画像
 * POST /api/radar/parse-request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { request: userRequest } = body;

    if (!userRequest || typeof userRequest !== 'string') {
      return NextResponse.json({ error: 'Request is required' }, { status: 400 });
    }

    // 获取租户信息
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    });

    const companyName = tenant?.name || '我们公司';

    // AI解析客户专家判断
    const parseResult = await parseUserRequest(userRequest, companyName);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: 400 });
    }

    const refinement = normalizeTargetingRefinement(
      parseResult as Record<string, unknown>,
      userRequest,
    );

    const [latestTargeting, companyProfile] = await Promise.all([
      prisma.artifactVersion.findFirst({
        where: {
          tenantId: session.user.tenantId,
          entityType: 'TargetingSpec',
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.companyProfile.findUnique({
        where: { tenantId: session.user.tenantId },
        select: {
          targetIndustries: true,
          targetRegions: true,
          sectionEdits: true,
        },
      }),
    ]);

    const entityId = latestTargeting?.entityId || `targeting-spec-${session.user.tenantId}`;
    const latestEntityVersion = await prisma.artifactVersion.findFirst({
      where: {
        tenantId: session.user.tenantId,
        entityType: 'TargetingSpec',
        entityId,
      },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const content = applyTargetingRefinement(latestTargeting?.content, refinement, {
      originalText: userRequest,
    });

    const profilePatch = buildCompanyProfileRefinementPatch(companyProfile, refinement, {
      originalText: userRequest,
    });

    const [targetingVersion] = await prisma.$transaction([
      prisma.artifactVersion.create({
        data: {
          tenantId: session.user.tenantId,
          entityType: 'TargetingSpec',
          entityId,
          version: (latestEntityVersion?.version ?? 0) + 1,
          status: 'draft',
          content: content as object,
          meta: {
            changeNote: '客户行业判断校正 TargetingSpec',
            generatedBy: 'human',
            refinementSource: 'customer_expert_input',
            originalRequest: userRequest,
            appliedAt: new Date().toISOString(),
          },
          createdById: session.user.id,
        },
      }),
      prisma.companyProfile.upsert({
        where: { tenantId: session.user.tenantId },
        create: {
          tenantId: session.user.tenantId,
          targetIndustries: profilePatch.targetIndustries as object,
          targetRegions: profilePatch.targetRegions as object,
          sectionEdits: profilePatch.sectionEdits as object,
        },
        update: {
          targetIndustries: profilePatch.targetIndustries as object,
          targetRegions: profilePatch.targetRegions as object,
          sectionEdits: profilePatch.sectionEdits as object,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      targetingSpec: {
        id: targetingVersion.id,
        version: targetingVersion.version,
        name: content.targetingSpec.icpName,
      },
      refinement,
    });
  } catch (error) {
    console.error('[parse-request] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}

/**
 * AI解析用户自然语言需求
 */
async function parseUserRequest(
  userRequest: string,
  companyName: string
): Promise<{
  success: boolean;
  error?: string;
  summary?: string;
  description?: string;
  targetIndustries?: string[];
  keywords?: string[];
  negativeKeywords?: string[];
  targetCountries?: string[];
  useCases?: string[];
  triggers?: string[];
}> {
  const systemPrompt = `你是一个B2B获客画像分析师。客户输入不是搜索词，而是行业专家对目标客户画像的校正。

用户公司：${companyName}

【解析规则】
1. 提取目标行业、应用场景、购买触发器和需求关键词。
2. 识别目标国家/地区，转换为ISO代码，如US, DE, JP。
3. 只在客户明确表达“不看/排除/不要”时提取排除词；不要默认排除 distributor、supplier、dealer，因为它们可能是有效买家。
4. summary 要表达这是哪一类目标客户画像补充，不要写成搜索任务名称。

【输出格式】
{
  "summary": "画像补充摘要",
  "description": "这条行业判断如何校正目标客户画像",
  "targetIndustries": ["industry or customer type"],
  "keywords": ["keyword1", "keyword2"],
  "negativeKeywords": ["noise target"],
  "targetCountries": ["US"],
  "useCases": ["use case"],
  "triggers": ["buying trigger"]
}`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `客户行业判断："${userRequest}"\n\n请解析为目标客户画像校正字段。` },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.3,
      }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse request' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const refinement: TargetingRefinement = normalizeTargetingRefinement(
      parsed as Record<string, unknown>,
      userRequest,
    );

    return {
      success: true,
      summary: refinement.summary,
      description: refinement.description,
      targetIndustries: refinement.targetIndustries,
      keywords: refinement.keywords,
      negativeKeywords: refinement.negativeKeywords,
      targetCountries: refinement.targetCountries,
      useCases: refinement.useCases,
      triggers: refinement.triggers,
    };
  } catch (error) {
    console.error('[parseUserRequest] Error:', error);
    return { success: false, error: 'AI parsing failed' };
  }
}
