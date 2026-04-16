import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt, formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  persona: z.record(z.string(), z.unknown()).describe('目标 Persona'),
  messagingMatrix: z.record(z.string(), z.unknown()).optional().describe('消息矩阵'),
  topic: z.string().optional().describe('选题'),
  keywords: z.array(z.string()).optional().describe('目标关键词'),
});

const proofPlanSchema = z.object({
  claim: z.string(),
  evidenceId: z.string(),
});

const faqSchema = z.object({
  q: z.string(),
  aAngle: z.string(),
  evidenceId: z.string(),
});

const outputSchema = z.object({
  brief: z.object({
    persona: z.string(),
    goal: z.string(),
    promise: z.string(),
    proofPlan: z.array(proofPlanSchema),
    outline: z.array(z.string()),
    faq: z.array(faqSchema),
    schemaJsonDraft: z.record(z.string(), z.unknown()),
    cta: z.string(),
    complianceNotes: z.array(z.string()),
    openQuestions: z.array(z.string()),
  }),
});

// ==================== Skill Definition ====================

export const contentBriefSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.MARKETING_GENERATE_CONTENT_BRIEF,
  displayName: '生成内容简报',
  engine: 'marketing',
  outputEntityType: 'ContentBrief',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.MARKETING_GENERATE_CONTENT_DRAFT,
  ],
  model: 'qwen-max',
  temperature: 0.3,
  
  systemPrompt: `你是内容主编。基于Persona、Messaging Matrix、Evidence与BrandGuideline，拼装一个可执行Brief。

要求：
1. 必须包含：目标读者、承诺（可证明）、文章结构、必须引用证据点、FAQ、schemaJson草案、CTA、禁词/合规注意事项
2. 不得凭空添加企业能力；缺证据则列为openQuestions
3. proofPlan 中的每个 claim 必须有对应的 evidenceId`,
  
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

${input.topic ? `选题：${input.topic}` : ''}
${input.keywords ? `目标关键词：${(input.keywords as string[]).join('、')}` : ''}

=== 任务要求 ===
请生成内容简报（Brief），包含目标读者、核心承诺、文章结构、证据引用计划、FAQ、结构化数据草案和 CTA。`;
    
    return prompt;
  },
};
