import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  channelMap: z.record(z.string(), z.unknown()).describe('已生成的 Channel Map'),
  targetingSpec: z.record(z.string(), z.unknown()).optional().describe('Targeting Spec'),
});

const taskSchema = z.object({
  taskName: z.string(),
  channelRef: z.object({
    channelType: z.string(),
    name: z.string(),
  }),
  steps: z.array(z.string()),
  queries: z.array(z.string()),
  captureSchema: z.object({
    companyName: z.string(),
    website: z.string(),
    sourceUrl: z.string(),
    whyMatch: z.string(),
  }),
  expectedCount: z.number(),
  fallback: z.array(z.string()),
});

const outputSchema = z.object({
  discoveryPlan: z.object({
    tasks: z.array(taskSchema),
    qualityBar: z.array(z.string()),
  }),
});

// ==================== Skill Definition ====================

export const accountDiscoverySkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_PLAN_ACCOUNT_DISCOVERY,
  displayName: '规划发现任务',
  engine: 'radar',
  outputEntityType: 'AccountList',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_QUALIFY_ACCOUNTS,
  ],
  model: 'qwen-plus',
  temperature: 0.3,
  
  systemPrompt: `你是获客雷达的Research Lead。给定Channel Map，生成一份"发现任务清单"，让研究员/系统按步骤找到目标公司。

要求：
1. 每个任务必须：输入渠道条目、执行步骤、预期产出、失败替代方案、记录字段
2. 任务必须可执行，包含具体的搜索关键词和操作步骤
3. 质量门槛必须明确（如必须有官网、必须说明匹配理由）`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input } = ctx;
    
    return `
=== 输入数据 ===
Channel Map: ${JSON.stringify(input.channelMap, null, 2)}
${input.targetingSpec ? `Targeting Spec: ${JSON.stringify(input.targetingSpec, null, 2)}` : ''}

=== 任务要求 ===
请基于以上渠道地图，生成可执行的发现任务清单。每个任务必须包含具体的执行步骤和质量要求。`;
  },
};
