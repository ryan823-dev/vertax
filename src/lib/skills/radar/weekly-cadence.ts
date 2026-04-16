import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  targetingSpec: z.record(z.string(), z.unknown()).optional().describe('Targeting Spec'),
  channelMap: z.record(z.string(), z.unknown()).optional().describe('Channel Map'),
  currentStats: z.object({
    totalAccounts: z.number().optional(),
    qualifiedAccounts: z.number().optional(),
    contactsFound: z.number().optional(),
    outreachSent: z.number().optional(),
  }).optional().describe('当前统计'),
});

const dailyTaskSchema = z.object({
  day: z.string(),
  tasks: z.array(z.string()),
  targetOutput: z.record(z.string(), z.unknown()),
});

const taskListItemSchema = z.object({
  title: z.string(),
  assigneeRole: z.enum(['researcher', 'marketer', 'client']),
  dueInDays: z.number(),
});

const outputSchema = z.object({
  weeklyPlan: z.object({
    goals: z.array(z.string()),
    daily: z.array(dailyTaskSchema),
    qualityBar: z.array(z.string()),
    taskList: z.array(taskListItemSchema),
  }),
});

// ==================== Skill Definition ====================

export const weeklyCadenceSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_GENERATE_WEEKLY_CADENCE,
  displayName: '生成周计划',
  engine: 'radar',
  outputEntityType: 'WeeklyCadence',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [],
  model: 'qwen-plus',
  temperature: 0.3,
  
  systemPrompt: `你是获客运营主管。基于当前TargetingSpec、ChannelMap、现有AccountList的缺口，生成本周可执行的研究节奏。

要求：
1. 每天做什么（Mon-Fri）
2. 目标产出数量
3. 质量门槛
4. 如果卡住的替代动作
5. 输出可转成任务的taskList`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input } = ctx;
    
    return `
${input.targetingSpec ? `=== Targeting Spec ===\n${JSON.stringify(input.targetingSpec, null, 2)}` : ''}

${input.channelMap ? `=== Channel Map ===\n${JSON.stringify(input.channelMap, null, 2)}` : ''}

=== 当前统计 ===
${JSON.stringify(input.currentStats || {}, null, 2)}

=== 任务要求 ===
请生成本周的研究计划，包含每日任务安排、产出目标和可执行的任务清单。`;
  },
};
