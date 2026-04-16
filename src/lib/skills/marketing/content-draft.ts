import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  brief: z.record(z.string(), z.unknown()).describe('内容简报'),
});

const faqItemSchema = z.object({
  q: z.string(),
  a: z.string(),
  evidenceIds: z.array(z.string()),
});

const warningSchema = z.object({
  type: z.enum(['forbidden_term', 'compliance']),
  detail: z.string(),
  locationHint: z.string(),
});

const outputSchema = z.object({
  contentPiece: z.object({
    title: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    slug: z.string(),
    quickAnswer: z.string().optional().describe('≤50词核心答案，Featured Snippet / AI引用目标'),
    bodyMarkdown: z.string(),
    faq: z.array(faqItemSchema),
    schemaJson: z.record(z.string(), z.unknown()),
    evidenceMap: z.array(z.object({
      label: z.string(),
      evidenceId: z.string(),
      why: z.string(),
    })),
    warnings: z.array(warningSchema),
  }),
});

// ==================== Skill Definition ====================

export const contentDraftSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.MARKETING_GENERATE_CONTENT_DRAFT,
  displayName: '生成内容初稿',
  engine: 'marketing',
  outputEntityType: 'ContentDraft',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.MARKETING_VERIFY_CLAIMS,
    SKILL_NAMES.MARKETING_BUILD_PUBLISH_PACK,
  ],
  model: 'qwen-max',
  temperature: 0.5,
  
  systemPrompt: `你是资深B2B英文内容写作与SEO/AEO编辑。根据Brief生成内容初稿。
整合自 knowledge-center-pipeline 最佳实践。

=== 8 条可读性法则 (MANDATORY) ===

1. 一段一个观点，最多2句话。超过3行的段落必须拆分。
2. 3个以上并列项必须用列表，不要用逗号连接的长句。
3. 表格是AI引用率最高的格式——对比数据、规格参数、决策矩阵必须用表格。
4. 决策流程用文本写（Step 1 → Yes/No），不要用图片流程图（AI无法解析）。
5. 每篇文章必须有 Quick Answer（≤50词），它是Google精选摘要和AI引用的首选目标。
6. FAQ问题从真实搜索查询中获取（Google PAA、Autocomplete），不要凭空编造。
7. 不要在内容中报价格，用"低/中/高成本"的相对比较即可。
8. 文章结尾用2-3个内链作为下一步CTA。

=== 文章结构模板 ===

买家指南（商业意图）:
H1 → Quick Answer → 决策流程 → 类型总览 → 选择步骤(H2) → 常见错误 → 行业推荐 → 合规清单 → Key Takeaways → Next Steps → FAQ

知识解说（信息意图）:
H1 → Quick Answer → 什么是X → 为什么重要 → 关键概念(H2/H3) → 如何应用 → 常见误区 → Key Takeaways → Next Steps → FAQ

对比文章（商业意图）:
H1 → Quick Answer(一句结论) → 对比总览表 → A概述 → B概述 → 关键差异(H2/H3) → 何时选A vs B → Key Takeaways → Next Steps → FAQ

=== SEO/AEO 元数据规范 ===
- metaTitle: ≤60字符，包含主关键词
- metaDescription: ≤160字符，行动导向，包含关键词
- H1: 只有一个，与页面意图匹配
- slug: kebab-case，包含关键词，无停用词
- quickAnswer: ≤50词，直接回答H1问题，无前言

=== Schema.org 结构化数据 ===
必须输出：BlogPosting JSON-LD（含speakable）+ FAQPage JSON-LD

=== 写作要求 ===
1. 文中所有关键主张用[E1]/[E2]标注证据
2. 不夸大、不写无法证明的数字
3. 结构符合SEO：清晰H2/H3，段落短，包含FAQ
4. 同时输出"禁词/合规命中列表"（仅提示不自动改写）
5. 内容长度 800-1500 字
6. 关键词密度 1-2%
7. 每个H2段落可独立阅读
8. 内部链接至少2-3个相关页面`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, evidences } = ctx;
    
    let prompt = '';
    
    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }
    
    prompt += `
=== Brief ===
${JSON.stringify(input.brief, null, 2)}

=== 任务要求 ===
请根据以上 Brief 生成内容初稿，使用 Markdown 格式。所有关键主张必须用 [E1]/[E2] 标注引用的证据。`;
    
    return prompt;
  },
};
