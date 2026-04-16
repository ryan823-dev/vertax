import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  persona: z.record(z.string(), z.unknown()).describe('买家 Persona'),
  targetingSpec: z.record(z.string(), z.unknown()).optional().describe('Targeting Spec'),
  objectionLibrary: z.array(z.object({
    objection: z.string(),
    response: z.string(),
  })).optional().describe('异议库'),
});

const roleSchema = z.object({
  priority: z.number(),
  role: z.string(),
  titleKeywords: z.array(z.string()),
  departments: z.array(z.string()),
  kpi: z.array(z.string()),
  likelyObjections: z.array(z.string()),
  requiredEvidenceTypes: z.array(z.string()),
});

const outputSchema = z.object({
  roleMap: z.object({
    persona: z.string(),
    roles: z.array(roleSchema),
  }),
});

// ==================== Skill Definition ====================

export const contactRoleMapSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_BUILD_CONTACT_ROLE_MAP,
  displayName: '生成联系人角色图',
  engine: 'radar',
  outputEntityType: 'ContactRoleMap',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK,
  ],
  model: 'qwen-plus',
  temperature: 0.3,
  
  systemPrompt: `你是B2B销售开发策略师。基于Persona与决策链，输出"该找哪些角色"的Role Map。

要求：
1. 包含优先角色顺序、title关键词、部门
2. 分析他们关心的KPI和常见反对点
3. 说明需要准备的证据类型
4. 角色按优先级排序（priority 从 1 开始）`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input } = ctx;
    
    return `
=== Persona ===
${JSON.stringify(input.persona, null, 2)}

${input.targetingSpec ? `=== Targeting Spec ===\n${JSON.stringify(input.targetingSpec, null, 2)}` : ''}

${input.objectionLibrary ? `=== 异议库 ===\n${JSON.stringify(input.objectionLibrary, null, 2)}` : ''}

=== 任务要求 ===
请基于以上 Persona 信息，生成联系人角色图（Role Map），包含应该联系的角色、优先级、职位关键词等。`;
  },
};
