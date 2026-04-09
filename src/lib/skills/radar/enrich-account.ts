import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';

const inputSchema = z.object({
  companyName: z.string().describe('公司名称'),
  website: z.string().optional().describe('公司官网'),
  country: z.string().optional().describe('国家'),
  targetRoles: z.array(z.string()).optional().describe('目标决策人角色 (e.g. CEO, Procurement)'),
});

const outputSchema = z.object({
  foundContacts: z.array(z.object({
    name: z.string(),
    title: z.string(),
    email: z.string().optional(),
    linkedIn: z.string().optional(),
    source: z.string(),
  })),
  enrichmentStatus: z.enum(['COMPLETED', 'FAILED', 'PARTIAL']),
});

export const enrichAccountSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: 'radar.enrichProspect', // 对应 SKILL_NAMES.RADAR_ENRICH_PROSPECT
  displayName: '深度丰富线索 (Decision-Maker Hunting)',
  engine: 'radar',
  outputEntityType: 'ProspectDossier',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    'radar.generateProspectDossier',
  ],
  model: 'qwen-plus',
  temperature: 0.1,
  
  systemPrompt: `你是一个专业的 B2B 猎头和情报分析师。
你的任务是基于搜索结果提取特定公司的决策人信息。

提取原则：
1. 优先提取 CEO, Founder, Owner, Procurement Manager, Purchasing Manager, Supply Chain Director。
2. 必须包含姓名和职位。
3. 如果有 LinkedIn URL 或邮箱，一并提取。
4. 只提取真实存在的信息，不编造。
5. 输出 JSON 格式。`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const input = ctx.input as z.infer<typeof inputSchema>;
    return `
=== 目标公司 ===
公司名称: ${input.companyName}
官网: ${input.website || '未知'}
国家: ${input.country || '未知'}
目标角色: ${(input.targetRoles || []).join(', ')}

请分析搜索结果并提取联系人。`;
  },
};
