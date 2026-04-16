import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt, formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  persona: z.record(z.string(), z.unknown()).describe('买家 Persona'),
  messagingMatrix: z.record(z.string(), z.unknown()).optional().describe('消息矩阵'),
  tier: z.enum(['A', 'B', 'C']).optional().describe('目标客户层级'),
});

const playbookEntrySchema = z.object({
  replyType: z.enum([
    'interested', 'need_info', 'price_sensitive',
    'not_relevant', 'referral', 'unsubscribe'
  ]),
  goal: z.string(),
  responseTemplate: z.string(),
  nextStepTasks: z.array(z.string()),
  evidenceIds: z.array(z.string()),
});

const outputSchema = z.object({
  outreachPack: z.object({
    forPersona: z.string(),
    forTier: z.enum(['A', 'B', 'C']),
    openings: z.array(z.object({
      text: z.string(),
      evidenceIds: z.array(z.string()),
    })),
    emails: z.array(z.object({
      subject: z.string(),
      body: z.string(),
      evidenceIds: z.array(z.string()),
    })),
    whatsapps: z.array(z.object({
      text: z.string(),
      evidenceIds: z.array(z.string()),
    })),
    playbook: z.array(playbookEntrySchema),
    evidenceMap: z.array(z.object({
      label: z.string(),
      evidenceId: z.string(),
      why: z.string(),
    })),
    warnings: z.array(z.string()),
  }),
});

// ==================== Skill Definition ====================

export const outreachPackSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK,
  displayName: '生成外联包',
  engine: 'radar',
  outputEntityType: 'OutreachPack',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_GENERATE_WEEKLY_CADENCE,
  ],
  model: 'qwen-max',
  temperature: 0.4,
  
  systemPrompt: `你是B2B出海获客文案与合规官。基于Persona、Messaging Matrix、Evidence、BrandGuideline，为每个Tier输出外联包。

要求：
1. Opening lines 3-5条（短、具体、包含为何找你 + 1条证据 + 轻量下一步）
2. Email 2封（首封+跟进）
3. WhatsApp 2条（更短）
4. Follow-up Playbook（按回复类型分支）

合规约束：
1. 每条核心主张必须引用至少1条Evidence（用[E1]形式标注）
2. 禁词/合规边界命中要在warnings里输出
3. 语气真实克制，不夸大，不承诺无法证明的指标
4. 必须包含尊重隐私/退订选项的句子（英文版用opt-out）`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile, evidences } = ctx;
    
    let prompt = '';
    
    if (companyProfile) {
      prompt += formatCompanyProfileForPrompt(companyProfile);
    }
    
    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }
    
    prompt += `
=== Persona ===
${JSON.stringify(input.persona, null, 2)}

${input.messagingMatrix ? `=== Messaging Matrix ===\n${JSON.stringify(input.messagingMatrix, null, 2)}` : ''}

目标层级：${input.tier || 'A'}

=== 任务要求 ===
请生成外联包，包含开场白、邮件模板、WhatsApp消息和跟进剧本。所有核心主张必须引用证据。`;
    
    return prompt;
  },
};
