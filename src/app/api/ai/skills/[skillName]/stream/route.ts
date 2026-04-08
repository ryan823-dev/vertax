import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createStreamingResponse } from '@/lib/ai-client';
import { hasSkill, ensureSkillsRegistered, getSkill } from '@/lib/skills/registry';
import { loadEvidenceContext } from '@/lib/skills/evidence-loader';
import { prisma } from '@/lib/prisma';
import {
  type SkillDefinition,
  type SkillRequest,
  type PromptContext,
  type CompanyProfileContext,
  COMMON_OUTPUT_INSTRUCTIONS,
} from '@/lib/skills/types';

// ==================== Streaming Skill Endpoint ====================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillName: string }> }
) {
  try {
    // 1. 认证
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { tenantId, id: userId } = session.user;
    const { skillName } = await params;
    
    // 2. 确保 Skills 已注册
    await ensureSkillsRegistered();
    
    // 3. 检查 Skill 是否存在
    if (!hasSkill(skillName)) {
      return NextResponse.json(
        { ok: false, error: `Skill not found: ${skillName}` },
        { status: 404 }
      );
    }
    
    // 4. 解析请求体
    const body = await request.json();
    
    // 5. 基础字段验证
    if (!body.entityType || !body.entityId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: entityType, entityId' },
        { status: 400 }
      );
    }
    
    // 6. 获取 Skill 定义
    const skill = getSkill(skillName)!;
    
    // 7. 验证输入
    const inputValidation = skill.inputSchema.safeParse(body.input || {});
    if (!inputValidation.success) {
      return NextResponse.json(
        { ok: false, error: `Input validation error: ${inputValidation.error.message}` },
        { status: 400 }
      );
    }
    
    // 8. 加载 Context（并发）
    const [companyProfile, evidenceContext, existingContent] = await Promise.all([
      body.useCompanyProfile !== false ? loadCompanyProfile(tenantId) : Promise.resolve(undefined),
      body.evidenceIds?.length ? loadEvidenceContext(tenantId, body.evidenceIds) : Promise.resolve([]),
      body.artifactVersionId ? loadExistingVersion(body.artifactVersionId) : Promise.resolve(undefined),
    ]);
    
    // 9. 构建 Prompt Context
    const promptContext: PromptContext = {
      input: inputValidation.data as Record<string, unknown>,
      companyProfile,
      evidences: evidenceContext,
      existingContent,
      mode: body.mode || 'generate',
    };
    
    // 10. 构建 Prompts
    const systemPrompt = buildSystemPrompt(skill);
    const userPrompt = skill.buildUserPrompt(promptContext);
    
    // 11. 返回流式响应
    const streamingResponse = createStreamingResponse(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: skill.model || 'qwen-plus',
        temperature: skill.temperature ?? 0.3,
        maxTokens: 4096,
      }
    );
    
    // 返回流式响应，携带 skill 元信息
    return new Response(streamingResponse.body, {
      headers: {
        ...Object.fromEntries(streamingResponse.headers.entries()),
        'X-Skill-Name': skillName,
        'X-Output-Entity-Type': skill.outputEntityType,
        'X-Entity-Id': body.entityId,
        'X-Tenant-Id': tenantId,
        'X-User-Id': userId,
      },
    });
    
  } catch (error) {
    console.error('[API] Streaming skill error:', error);
    
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ==================== Helper Functions ====================

function buildSystemPrompt(skill: SkillDefinition): string {
  return `${skill.systemPrompt}

${COMMON_OUTPUT_INSTRUCTIONS}`;
}

async function loadCompanyProfile(tenantId: string): Promise<CompanyProfileContext | undefined> {
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
  });
  
  if (!profile) return undefined;
  
  return {
    companyName: profile.companyName || '',
    companyIntro: profile.companyIntro || '',
    coreProducts: (profile.coreProducts as Array<{ name: string; description: string }>) || [],
    techAdvantages: (profile.techAdvantages as Array<{ title: string; description: string }>) || [],
    scenarios: (profile.scenarios as Array<{ industry: string; scenario: string }>) || [],
    differentiators: (profile.differentiators as Array<{ point: string; description: string }>) || [],
    targetIndustries: (profile.targetIndustries as string[]) || [],
    targetRegions: (profile.targetRegions as Array<{ region: string; countries: string[]; rationale: string }> | string[]) || [],
    buyerPersonas: (profile.buyerPersonas as Array<{ role: string; title: string; concerns: string[] }>) || [],
    painPoints: (profile.painPoints as Array<{ pain: string; howWeHelp: string }>) || [],
    buyingTriggers: (profile.buyingTriggers as string[]) || [],
  };
}

async function loadExistingVersion(versionId: string): Promise<Record<string, unknown> | undefined> {
  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: { content: true },
  });
  
  return version?.content as Record<string, unknown> | undefined;
}
