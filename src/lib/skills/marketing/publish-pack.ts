import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  contentPiece: z.record(z.string(), z.unknown()).describe('内容片段'),
});

const outputSchema = z.object({
  publishPack: z.object({
    title: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    slug: z.string(),
    bodyMarkdown: z.string(),
    bodyHtml: z.string().optional(),
    faq: z.array(z.object({
      q: z.string(),
      a: z.string(),
    })),
    schemaJson: z.record(z.string(), z.unknown()),
    evidenceMap: z.array(z.object({
      label: z.string(),
      evidenceId: z.string(),
      why: z.string(),
    })),
    cta: z.string(),
    keywords: z.array(z.string()),
    wordCount: z.number(),
    readingTime: z.number(),
  }),
});

// ==================== Skill Definition ====================

export const publishPackSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.MARKETING_BUILD_PUBLISH_PACK,
  displayName: '生成发布包',
  engine: 'marketing',
  outputEntityType: 'PublishPack',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [],
  model: 'qwen-plus',
  temperature: 0.2,
  
  systemPrompt: `将contentPiece结构化为Publish Pack，准备发布。

要求：
1. 输出完整的发布包，包含所有必要字段
2. 计算字数和阅读时间
3. 提取关键词列表
4. 保留证据引用映射`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input } = ctx;
    
    return `
=== 内容片段 ===
${JSON.stringify(input.contentPiece, null, 2)}

=== 任务要求 ===
请将以上内容结构化为发布包（Publish Pack），包含所有发布所需的字段。`;
  },
};
