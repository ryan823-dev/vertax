import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt, formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== fixSeoIssues ====================

const fixSeoInputSchema = z.object({
  contentId: z.string().describe('SeoContent ID'),
  title: z.string().describe('当前标题'),
  slug: z.string().describe('当前 slug'),
  metaDescription: z.string().optional().describe('当前 meta description'),
  bodyHtml: z.string().optional().describe('正文 HTML 片段（前 3000 字符）'),
  seoHealthScore: z.number().describe('当前 SEO 健康分（0-100）'),
  issues: z.array(z.object({
    type: z.string(),
    message: z.string(),
  })).describe('当前检测到的 SEO 问题列表'),
  targetKeywords: z.array(z.string()).optional().describe('目标关键词'),
});

const fixSeoOutputSchema = z.object({
  fixedTitle: z.string().describe('修复后的标题（含核心关键词，50-60字符）'),
  fixedMetaDescription: z.string().describe('修复后的 meta description（150-160字符）'),
  fixedSlug: z.string().describe('修复后的 SEO 友好 slug'),
  fixedH1: z.string().describe('推荐的 H1 标签文本'),
  internalLinkingSuggestions: z.array(z.object({
    anchorText: z.string(),
    targetDescription: z.string(),
  })).describe('内链建议'),
  fixSummary: z.array(z.string()).describe('每项修复的说明'),
  estimatedScoreAfterFix: z.number().min(0).max(100).describe('修复后预估分数'),
});

export const fixSeoIssuesSkill: SkillDefinition<typeof fixSeoInputSchema, typeof fixSeoOutputSchema> = {
  name: SKILL_NAMES.MARKETING_FIX_SEO_ISSUES,
  displayName: 'AI 修复 SEO 问题',
  engine: 'marketing',
  outputEntityType: 'SeoContent',
  inputSchema: fixSeoInputSchema,
  outputSchema: fixSeoOutputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.MARKETING_OPTIMIZE_GEO,
  ],
  model: 'qwen-plus',
  temperature: 0.3,

  systemPrompt: `你是B2B出海SEO专家。针对检测到的SEO问题，给出具体可执行的修复方案。

## 修复优先级
1. Title Tag（含主关键词，50-60字符）
2. Meta Description（含CTA，150-160字符）  
3. URL Slug（简洁、含关键词、全小写连字符）
4. H1（与 Title 相关但不完全相同）
5. 内链建议（指向同主题集群内的相关页面）

## 输出格式
严格 JSON，不含 markdown code fence。所有修复后的文本必须：
- 用英文（面向海外读者）
- 自然地融入目标关键词
- 符合 B2B 专业语气`,

  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile, evidences } = ctx;

    let prompt = '';

    if (companyProfile) {
      prompt += formatCompanyProfileForPrompt(companyProfile);
    }

    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }

    const issues = input.issues as Array<{ type: string; message: string }>;
    const targetKeywords = input.targetKeywords as string[] | undefined;

    prompt += `
=== 当前内容信息 ===
Title: ${input.title}
Slug: ${input.slug}
Meta Description: ${input.metaDescription || '（未设置）'}
SEO健康分: ${input.seoHealthScore}/100
目标关键词: ${targetKeywords?.join(', ') || '（未指定）'}

=== 检测到的 SEO 问题 ===
${issues.map((i, idx) => `${idx + 1}. [${i.type}] ${i.message}`).join('\n')}

${input.bodyHtml ? `=== 正文片段（前3000字）===\n${(input.bodyHtml as string).slice(0, 3000)}` : ''}

=== 任务要求 ===
请针对以上问题给出具体修复方案。fixSummary 中每条对应一个问题的修复说明。
estimatedScoreAfterFix 基于修复力度给出合理预估。`;

    return prompt;
  },
};

// ==================== optimizeGeo ====================

const optimizeGeoInputSchema = z.object({
  contentId: z.string().describe('SeoContent ID'),
  title: z.string().describe('内容标题'),
  bodyHtml: z.string().describe('正文内容（HTML）'),
  targetEngines: z.array(z.enum(['chatgpt', 'perplexity', 'claude', 'gemini', 'copilot']))
    .default(['chatgpt', 'perplexity']).describe('目标AI引擎'),
  targetKeywords: z.array(z.string()).optional().describe('目标关键词'),
  currentAeoScore: z.number().optional().describe('当前 AEO 分数'),
});

const optimizeGeoOutputSchema = z.object({
  geoVersion: z.string().describe('优化后的GEO版本正文（纯文本，适合AI引擎引用）'),
  faqBlock: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).describe('FAQ 问答块（≥3条，面向AI搜索优化）'),
  citationSnippets: z.array(z.object({
    trigger: z.string().describe('触发引用的用户问题'),
    snippet: z.string().describe('100字内的精准答案片段'),
  })).describe('为不同AI引擎准备的引用片段'),
  structuredDataJson: z.string().describe('FAQPage Schema.org JSON-LD 字符串'),
  optimizationNotes: z.array(z.string()).describe('每项优化的说明'),
  estimatedAeoScore: z.number().min(0).max(100).describe('优化后预估 AEO 分数'),
});

export const optimizeGeoSkill: SkillDefinition<typeof optimizeGeoInputSchema, typeof optimizeGeoOutputSchema> = {
  name: SKILL_NAMES.MARKETING_OPTIMIZE_GEO,
  displayName: 'AI 优化 GEO 版本',
  engine: 'marketing',
  outputEntityType: 'SeoContent',
  inputSchema: optimizeGeoInputSchema,
  outputSchema: optimizeGeoOutputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.MARKETING_VERIFY_CLAIMS,
    SKILL_NAMES.MARKETING_BUILD_PUBLISH_PACK,
  ],
  model: 'qwen-max',
  temperature: 0.35,

  systemPrompt: `你是GEO（Generative Engine Optimization）专家，专注于让内容被ChatGPT、Perplexity、Claude等AI引擎引用。

## GEO优化原则
1. **直接回答性**：每段开头给出明确结论，AI喜欢直接可引用的答案
2. **结构化**：使用FAQ格式，每个问题对应独立的精准答案
3. **引用友好**：关键数据、对比、定义用独立段落包装，便于AI截取
4. **权威性信号**：引用具体数字、案例、技术标准
5. **Citation Snippet**：为每个目标问题准备100字内的最优引用片段

## 输出要求
- geoVersion：重写后的正文，保留核心信息但更结构化、更直接
- faqBlock：至少3个问答，覆盖用户可能问的核心问题
- citationSnippets：针对每个关键词/场景的最优引用片段
- structuredDataJson：合法的 FAQPage JSON-LD
- 所有输出用英文（面向海外AI引擎）
- 严格JSON格式，不含 markdown code fence`,

  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile, evidences } = ctx;

    let prompt = '';

    if (companyProfile) {
      prompt += formatCompanyProfileForPrompt(companyProfile);
    }

    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }

    const targetKeywords = input.targetKeywords as string[] | undefined;
    const targetEngines = input.targetEngines as string[];

    prompt += `
=== 当前内容 ===
标题: ${input.title}
目标关键词: ${targetKeywords?.join(', ') || '（未指定）'}
目标AI引擎: ${targetEngines.join(', ')}
当前AEO分: ${input.currentAeoScore ?? '未知'}/100

=== 正文内容 ===
${(input.bodyHtml as string).slice(0, 5000)}

=== 任务要求 ===
请将以上内容重写优化为适合AI引擎引用的GEO版本，并生成FAQ块、Citation Snippets和FAQPage结构化数据。
citationSnippets 中每条的 trigger 是用户可能输入到AI搜索的问题，snippet 是理想的100字内答案。`;

    return prompt;
  },
};
