import { z } from 'zod';
import { chatCompletion } from '@/lib/ai-client';
import { normalizeTopicClusterContent } from '@/lib/marketing/topic-cluster';
import { prisma } from '@/lib/prisma';
import { normalizeTargetRegions } from '@/lib/regions';
import { logActivity, ACTIVITY_ACTIONS, EVENT_CATEGORIES } from '@/lib/utils/activity-logger';
import { ensureSkillsRegistered, getSkill, getSkillNames } from './registry';
import { loadEvidenceContext } from './evidence-loader';
import {
  type SkillDefinition,
  type SkillRequest,
  type SkillResponse,
  type PromptContext,
  type CompanyProfileContext,
  skillOutputCommonSchema,
  COMMON_OUTPUT_INSTRUCTIONS,
  SkillNotFoundError,
  SkillInputValidationError,
  SkillOutputParseError,
} from './types';

// ==================== Runner Configuration ====================

interface RunnerConfig {
  tenantId: string;
  userId: string;
}

// ==================== Main Execution Function ====================

/**
 * 执行一个 Skill
 */
export async function executeSkill(
  skillName: string,
  request: SkillRequest,
  config: RunnerConfig
): Promise<SkillResponse> {
  const { tenantId } = config;
  await ensureSkillsRegistered();
  
  // 获取 Skill 定义（需要在调用前注册好）
  const skill = getSkill(skillName);
  if (!skill) {
    console.error(`[SkillRunner] Skill not found: ${skillName}`);
    console.log(`[SkillRunner] Available skills: ${Array.from(getSkillNames?.() || [])}`);
    throw new SkillNotFoundError(skillName);
  }
  
  // 2. 验证输入
  const inputValidation = skill.inputSchema.safeParse(request.input);
  if (!inputValidation.success) {
    throw new SkillInputValidationError(
      skillName,
      inputValidation.error.message
    );
  }
  
  // 3. 加载 Context（并发）
  const [companyProfile, evidenceContext, existingContent] = await Promise.all([
    request.useCompanyProfile ? loadCompanyProfile(tenantId) : Promise.resolve(undefined),
    request.evidenceIds?.length ? loadEvidenceContext(tenantId, request.evidenceIds) : Promise.resolve([]),
    request.artifactVersionId ? loadExistingVersion(request.artifactVersionId) : Promise.resolve(undefined),
  ]);
  
  // 4. 构建 Prompt Context
  const promptContext: PromptContext = {
    input: inputValidation.data as Record<string, unknown>,
    companyProfile,
    evidences: evidenceContext,
    existingContent,
    mode: request.mode,
  };
  
  // 5. 构建 Prompts
  const systemPrompt = buildSystemPrompt(skill);
  const userPrompt = skill.buildUserPrompt(promptContext);
  
  // 6. 调用 AI
  const aiResponse = await chatCompletion(
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
  
  // 7. 解析输出
  const parsedOutput = parseAIOutput(skillName, aiResponse.content, skill.outputSchema);
  
  // 8. 验证 Evidence 引用
  const evidenceIdsFromOutput = (parsedOutput.evidenceIds as string[] | undefined) || [];
  const validatedReferences = validateEvidenceReferences(
    evidenceIdsFromOutput,
    evidenceContext
  );
  
  // 9. 后处理流水线
  const { versionId, taskIds } = await postProcessPipeline({
    skill,
    request,
    output: parsedOutput,
    config,
    aiResponse,
    validatedReferences,
  });
  
  // 10. 构建响应
  const confidence = typeof parsedOutput.confidence === 'number' ? parsedOutput.confidence : 0.5;
  const openQuestions = Array.isArray(parsedOutput.openQuestions) ? parsedOutput.openQuestions as string[] : [];
  const missingProof = Array.isArray(parsedOutput.missingProof) ? parsedOutput.missingProof as string[] : [];
  const assumptions = Array.isArray(parsedOutput.assumptions) ? parsedOutput.assumptions as string[] : [];
  const aiSuggestedSkills = Array.isArray(parsedOutput.suggestedNextSkills) ? parsedOutput.suggestedNextSkills as string[] : [];
  
  return {
    ok: true,
    output: parsedOutput,
    references: validatedReferences,
    confidence,
    openQuestions,
    missingProof,
    assumptions,
    suggestedNextSkills: [
      ...skill.suggestedNextSkills,
      ...aiSuggestedSkills,
    ].filter((v, i, a) => a.indexOf(v) === i), // 去重
    versionId,
    taskIds,
  };
}

// ==================== Helper Functions ====================

/**
 * 构建 System Prompt
 */
function buildSystemPrompt(skill: SkillDefinition): string {
  return `${skill.systemPrompt}

${COMMON_OUTPUT_INSTRUCTIONS}`;
}

/**
 * 加载企业画像
 */
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
    targetRegions: normalizeTargetRegions(profile.targetRegions),
    buyerPersonas: (profile.buyerPersonas as Array<{ role: string; title: string; concerns: string[] }>) || [],
    painPoints: (profile.painPoints as Array<{ pain: string; howWeHelp: string }>) || [],
    buyingTriggers: (profile.buyingTriggers as string[]) || [],
  };
}

/**
 * 加载已有版本内容
 */
async function loadExistingVersion(versionId: string): Promise<Record<string, unknown> | undefined> {
  const version = await prisma.artifactVersion.findUnique({
    where: { id: versionId },
    select: { content: true },
  });
  
  return version?.content as Record<string, unknown> | undefined;
}

/**
 * 解析 AI 输出
 */
function parseAIOutput(
  skillName: string,
  rawContent: string,
  outputSchema: z.ZodTypeAny
): Record<string, unknown> {
  // 清理 markdown code fence
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  
  // JSON 解析
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new SkillOutputParseError(skillName, rawContent);
  }
  
  // 合并通用 Schema 验证
  parsed = normalizeSkillOutputShape(skillName, parsed);
  const combinedSchema = outputSchema.and(skillOutputCommonSchema);
  const validation = combinedSchema.safeParse(parsed);
  
  if (!validation.success) {
    // 宽松模式：即使验证失败也返回原始解析结果
    console.warn(`[Skill] Output validation warning for ${skillName}:`, validation.error.message);
    return parsed as Record<string, unknown>;
  }
  
  return validation.data;
}

/**
 * 验证 Evidence 引用
 */
function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function extractEvidenceIdsFromText(value: string): string[] {
  return Array.from(value.matchAll(/\[(E\d+)\]/g), (match) => match[1]);
}

function normalizeReplyType(value: string): string {
  const replyTypeMap: Record<string, string> = {
    positiveResponse: 'interested',
    neutralResponse: 'need_info',
    negativeResponse: 'not_relevant',
    noResponse: 'unsubscribe',
  };

  return replyTypeMap[value] ?? value;
}

function normalizeTierValue(...values: unknown[]): 'A' | 'B' | 'C' {
  for (const value of values) {
    if (value === 'A' || value === 'B' || value === 'C') {
      return value;
    }
  }

  return 'B';
}

function normalizeOutreachPackPayload(parsed: Record<string, unknown>): Record<string, unknown> | null {
  const source = isObjectRecord(parsed.outreachPack)
    ? parsed.outreachPack
    : isObjectRecord(parsed.outreachPackage)
      ? parsed.outreachPackage
      : parsed;

  const openings = Array.isArray(source.openings)
    ? source.openings.flatMap((entry) => {
        if (!isObjectRecord(entry) || typeof entry.text !== 'string') {
          return [];
        }

        return [{
          text: entry.text,
          evidenceIds: toStringList(entry.evidenceIds),
        }];
      })
    : Array.isArray(source.openingLines)
      ? source.openingLines.flatMap((entry) => {
          if (typeof entry !== 'string') {
            return [];
          }

          return [{
            text: entry,
            evidenceIds: extractEvidenceIdsFromText(entry),
          }];
        })
      : [];

  const emails = Array.isArray(source.emails)
    ? source.emails.flatMap((entry) => {
        if (!isObjectRecord(entry) || typeof entry.subject !== 'string' || typeof entry.body !== 'string') {
          return [];
        }

        return [{
          subject: entry.subject,
          body: entry.body,
          evidenceIds:
            toStringList(entry.evidenceIds).length > 0
              ? toStringList(entry.evidenceIds)
              : extractEvidenceIdsFromText(`${entry.subject}\n${entry.body}`),
        }];
      })
    : [];

  const whatsapps = Array.isArray(source.whatsapps)
    ? source.whatsapps.flatMap((entry) => {
        if (!isObjectRecord(entry) || typeof entry.text !== 'string') {
          return [];
        }

        return [{
          text: entry.text,
          evidenceIds: toStringList(entry.evidenceIds),
        }];
      })
    : Array.isArray(source.whatsAppMessages)
      ? source.whatsAppMessages.flatMap((entry) => {
          if (typeof entry !== 'string') {
            return [];
          }

          return [{
            text: entry,
            evidenceIds: extractEvidenceIdsFromText(entry),
          }];
        })
      : [];

  const playbook = Array.isArray(source.playbook)
    ? source.playbook.flatMap((entry) => {
        if (
          !isObjectRecord(entry) ||
          typeof entry.replyType !== 'string' ||
          typeof entry.goal !== 'string' ||
          typeof entry.responseTemplate !== 'string'
        ) {
          return [];
        }

        return [{
          replyType: entry.replyType,
          goal: entry.goal,
          responseTemplate: entry.responseTemplate,
          nextStepTasks: toStringList(entry.nextStepTasks),
          evidenceIds: toStringList(entry.evidenceIds),
        }];
      })
    : isObjectRecord(source.followUpPlaybook)
      ? Object.entries(source.followUpPlaybook).flatMap(([replyType, template]) => {
          if (!isObjectRecord(template)) {
            return [];
          }

          const emailTemplate = typeof template.email === 'string' ? template.email : '';
          const whatsappTemplate = typeof template.whatsApp === 'string' ? template.whatsApp : '';
          const responseTemplate = [emailTemplate, whatsappTemplate].filter(Boolean).join('\n\nWhatsApp:\n');
          if (!responseTemplate) {
            return [];
          }

          return [{
            replyType: normalizeReplyType(replyType),
            goal: `Handle ${replyType} replies`,
            responseTemplate,
            nextStepTasks: [],
            evidenceIds: extractEvidenceIdsFromText(responseTemplate),
          }];
        })
      : [];

  const evidenceMap = Array.isArray(source.evidenceMap)
    ? source.evidenceMap.flatMap((entry) => {
        if (
          !isObjectRecord(entry) ||
          typeof entry.label !== 'string' ||
          typeof entry.evidenceId !== 'string' ||
          typeof entry.why !== 'string'
        ) {
          return [];
        }

        return [{
          label: entry.label,
          evidenceId: entry.evidenceId,
          why: entry.why,
        }];
      })
    : [];

  const warnings = toStringList(source.warnings);
  const forPersona =
    typeof source.forPersona === 'string'
      ? source.forPersona
      : typeof parsed.forPersona === 'string'
        ? parsed.forPersona
        : '';
  const forTier = normalizeTierValue(source.forTier, parsed.forTier, parsed.tier);

  if (
    !forPersona &&
    openings.length === 0 &&
    emails.length === 0 &&
    whatsapps.length === 0 &&
    playbook.length === 0 &&
    evidenceMap.length === 0 &&
    warnings.length === 0
  ) {
    return null;
  }

  return {
    forPersona,
    forTier,
    openings,
    emails,
    whatsapps,
    playbook,
    evidenceMap,
    warnings,
  };
}

function normalizeSkillOutputShape(skillName: string, parsed: unknown): unknown {
  if (!isObjectRecord(parsed)) {
    return parsed;
  }

  if (skillName === 'radar.generateProspectDossier' && !isObjectRecord(parsed.dossier)) {
    const dossierKeys = [
      'companyOverview',
      'decisionMakerAnalysis',
      'businessOpportunities',
      'intelligenceSummary',
      'matchAnalysis',
      'riskAlerts',
      'recommendedApproach',
      'dataSources',
    ] as const;

    if (dossierKeys.some((key) => key in parsed)) {
      return {
        ...parsed,
        dossier: Object.fromEntries(
          dossierKeys
            .filter((key) => key in parsed)
            .map((key) => [key, parsed[key]])
        ),
      };
    }
  }

  if (skillName === 'radar.generateOutreachPack') {
    const normalizedOutreachPack = normalizeOutreachPackPayload(parsed);
    if (normalizedOutreachPack) {
      return {
        ...parsed,
        outreachPack: normalizedOutreachPack,
      };
    }
  }

  if (skillName === 'marketing.buildTopicCluster') {
    const normalizedTopicCluster = normalizeTopicClusterContent(parsed);
    if (normalizedTopicCluster) {
      return normalizedTopicCluster;
    }
  }

  return parsed;
}

function validateEvidenceReferences(
  referencedIds: string[],
  availableEvidences: Array<{ id: string; title: string }>
): Array<{ evidenceId: string; title: string; why: string }> {
  const availableMap = new Map(availableEvidences.map(e => [e.id, e]));
  
  return referencedIds
    .filter(id => {
      const exists = availableMap.has(id);
      if (!exists) {
        console.warn(`[Skill] Invalid evidence reference: ${id}`);
      }
      return exists;
    })
    .map(id => ({
      evidenceId: id,
      title: availableMap.get(id)!.title,
      why: 'AI referenced this evidence',
    }));
}

// ==================== Post-Processing Pipeline ====================

interface PostProcessInput {
  skill: SkillDefinition;
  request: SkillRequest;
  output: Record<string, unknown>;
  config: RunnerConfig;
  aiResponse: { model: string; usage: { totalTokens: number } };
  validatedReferences: Array<{ evidenceId: string; title: string; why: string }>;
}

async function postProcessPipeline(input: PostProcessInput): Promise<{
  versionId: string;
  taskIds: string[];
}> {
  const { skill, request, output, config, aiResponse, validatedReferences } = input;
  const { tenantId, userId } = config;
  
  // a. 创建 ArtifactVersion
  const latestVersion = await prisma.artifactVersion.findFirst({
    where: {
      tenantId,
      entityType: skill.outputEntityType,
      entityId: request.entityId,
    },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  
  const newVersionNumber = (latestVersion?.version ?? 0) + 1;
  
  const version = await prisma.artifactVersion.create({
    data: {
      tenantId,
      entityType: skill.outputEntityType,
      entityId: request.entityId,
      version: newVersionNumber,
      status: 'draft',
      content: output as object,
      meta: {
        generatedBy: 'ai',
        skillName: skill.name,
        model: aiResponse.model,
        tokens: aiResponse.usage.totalTokens,
        mode: request.mode,
        evidenceIds: validatedReferences.map(r => r.evidenceId),
      } as object,
      createdById: userId,
    },
  });
  
  // b. 写 Activity 日志
  try {
    await logActivity({
      tenantId,
      userId,
      action: ACTIVITY_ACTIONS.VERSION_CREATED,
      entityType: skill.outputEntityType,
      entityId: request.entityId,
      eventCategory: EVENT_CATEGORIES.SYSTEM,
      severity: 'info',
      context: {
        skillName: skill.name,
        versionId: version.id,
        version: newVersionNumber,
        tokens: aiResponse.usage.totalTokens,
        mode: request.mode,
      },
    });
  } catch (err) {
    console.error('[Skill] Failed to log activity:', err);
  }
  
  // c. openQuestions → Tasks
  const taskIds: string[] = [];
  const openQuestions = (output.openQuestions as string[]) || [];
  const missingProof = (output.missingProof as string[]) || [];
  
  for (const question of openQuestions) {
    try {
      const task = await prisma.artifactTask.create({
        data: {
          tenantId,
          versionId: version.id,
          title: `[待确认] ${question.slice(0, 100)}`,
          status: 'open',
          priority: 'normal',
          createdById: userId,
        },
      });
      taskIds.push(task.id);
    } catch (err) {
      console.error('[Skill] Failed to create task for openQuestion:', err);
    }
  }
  
  // d. missingProof → urgent Tasks
  for (const proof of missingProof) {
    try {
      const task = await prisma.artifactTask.create({
        data: {
          tenantId,
          versionId: version.id,
          title: `[缺证据] ${proof.slice(0, 100)}`,
          status: 'open',
          priority: 'urgent',
          createdById: userId,
        },
      });
      taskIds.push(task.id);
    } catch (err) {
      console.error('[Skill] Failed to create task for missingProof:', err);
    }
  }
  
  return {
    versionId: version.id,
    taskIds,
  };
}

// ==================== Batch Execution ====================

/**
 * 批量执行多个 Skills（串行）
 */
export async function executeSkillChain(
  skillNames: string[],
  initialRequest: SkillRequest,
  config: RunnerConfig
): Promise<SkillResponse[]> {
  const results: SkillResponse[] = [];
  let currentRequest = initialRequest;
  
  for (const skillName of skillNames) {
    const result = await executeSkill(skillName, currentRequest, config);
    results.push(result);
    
    // 将上一个 Skill 的输出作为下一个的输入
    currentRequest = {
      ...currentRequest,
      input: result.output,
      artifactVersionId: result.versionId,
      mode: 'refine',
    };
  }
  
  return results;
}
