import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { chatCompletion } from '@/lib/ai-client';

export const maxDuration = 60;

/**
 * 解析用户自然语言需求，创建扫描计划并启动搜索
 * POST /api/radar/parse-request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
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

    // AI解析用户需求
    const parseResult = await parseUserRequest(userRequest, companyName);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: 400 });
    }

    // 创建扫描计划
    const profile = await prisma.radarSearchProfile.create({
      data: {
        tenantId: session.user.tenantId,
        name: parseResult.name!,
        description: parseResult.description,
        keywords: parseResult.keywords!,
        negativeKeywords: parseResult.negativeKeywords || [],
        targetCountries: parseResult.targetCountries || [],
        enabledChannels: ['MAPS', 'DIRECTORY'],
        scheduleRule: '0 6 * * *',
        isActive: true,
        autoQualify: true,
        autoEnrich: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
      },
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
  name?: string;
  description?: string;
  keywords?: Record<string, string[]>;
  negativeKeywords?: string[];
  targetCountries?: string[];
}> {
  const systemPrompt = `你是一个B2B获客专家。将用户的自然语言需求解析为结构化的搜索参数。

用户公司：${companyName}

【解析规则】
1. 提取目标行业/产品关键词
2. 识别目标国家/地区（转换为ISO代码，如US, DE, JP）
3. 自动添加排除词（retail, shop, store, distributor, supplier, wholesale, sale, dealer）
4. 生成合适的计划名称

【输出格式】
{
  "name": "计划名称",
  "description": "计划描述",
  "keywords": { "en": ["keyword1", "keyword2"] },
  "negativeKeywords": ["retail", "shop"],
  "targetCountries": ["US"]
}`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `用户需求："${userRequest}"\n\n请解析为结构化的搜索参数。` },
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

    const defaultNegatives = ['retail', 'shop', 'store', 'distributor', 'supplier', 'wholesale', 'sale', 'dealer'];
    const negatives = [...new Set([...(parsed.negativeKeywords || []), ...defaultNegatives])];

    return {
      success: true,
      name: parsed.name || '智能搜索',
      description: parsed.description || userRequest,
      keywords: parsed.keywords || { en: [] },
      negativeKeywords: negatives,
      targetCountries: parsed.targetCountries || [],
    };
  } catch (error) {
    console.error('[parseUserRequest] Error:', error);
    return { success: false, error: 'AI parsing failed' };
  }
}
