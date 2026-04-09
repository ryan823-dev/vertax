// ==================== AI SEO 服务 ====================
// 整合MarketingSkills框架：ai-seo最佳实践
// 目标：让内容被AI搜索引擎（ChatGPT、Perplexity、Google AI Overviews）引用

import { chatCompletion } from '@/lib/ai-client';

// ==================== AI搜索平台 ====================

export type AIPlatform =
  | 'google_ai_overviews'  // Google AI概览
  | 'chatgpt'              // ChatGPT搜索
  | 'perplexity'           // Perplexity
  | 'gemini'               // Google Gemini
  | 'copilot';             // Bing Copilot

export interface PlatformRankingFactors {
  platform: AIPlatform;
  howItWorks: string;
  sourceSelection: string;
  keyFactors: string[];
}

export const PLATFORM_FACTORS: PlatformRankingFactors[] = [
  {
    platform: 'google_ai_overviews',
    howItWorks: '总结排名靠前的页面',
    sourceSelection: '与传统排名高度相关',
    keyFactors: ['传统SEO排名', '结构化数据', '内容质量', 'E-E-A-T信号'],
  },
  {
    platform: 'chatgpt',
    howItWorks: '搜索网页并引用来源',
    sourceSelection: '来源范围更广，不仅限排名靠前',
    keyFactors: ['内容可提取性', '权威性', '新鲜度', '引用其他来源'],
  },
  {
    platform: 'perplexity',
    howItWorks: '始终引用来源并附链接',
    sourceSelection: '偏好权威、最新、结构良好的内容',
    keyFactors: ['内容结构', '数据统计', '专家引用', '更新频率'],
  },
  {
    platform: 'gemini',
    howItWorks: 'Google索引 + 知识图谱',
    sourceSelection: 'Google索引 + 权威来源',
    keyFactors: ['Google排名', '知识图谱实体', 'Wikipedia引用', '结构化数据'],
  },
  {
    platform: 'copilot',
    howItWorks: 'Bing驱动的AI搜索',
    sourceSelection: 'Bing索引 + 权威来源',
    keyFactors: ['Bing排名', '权威链接', '内容深度', '技术SEO'],
  },
];

// ==================== AI可见性审计 ====================

export interface VisibilityAuditRequest {
  brandName: string;
  website: string;
  keyQueries: string[];       // 关键查询词
  competitors?: string[];     // 竞争对手
}

export interface QueryVisibilityResult {
  query: string;
  platform: AIPlatform;
  aiOverviewPresent: boolean;
  brandCited: boolean;
  competitorsCited: string[];
  citedSources: string[];     // 被引用的来源
}

export interface VisibilityAuditResult {
  brandName: string;
  overallScore: number;       // 0-100
  queryResults: QueryVisibilityResult[];
  recommendations: string[];
  success: boolean;
  error?: string;
}

/**
 * AI可见性审计（模拟版 - 实际需要调用各平台API）
 */
export async function auditAIVisibility(request: VisibilityAuditRequest): Promise<VisibilityAuditResult> {
  const { brandName, website, keyQueries, competitors = [] } = request;

  // 注意：实际实现需要调用各平台API或使用爬虫
  // 这里返回模拟结果，提示用户手动检查

  const systemPrompt = `你是AI搜索优化专家。分析品牌的AI搜索可见性。

【关键统计】
- Google AI Overviews出现在约45%的搜索中
- AI Overviews减少网站点击高达58%
- 品牌通过第三方来源被引用的可能性是自身域名的6.5倍
- 优化后的内容被引用频率提高3倍
- 统计数据和引用可提升40%+的可见性

【输出格式】
{
  "overallScore": 0-100,
  "recommendations": ["建议1", "建议2"],
  "manualCheckSteps": ["手动检查步骤1", "步骤2"]
}`;

  const userPrompt = `品牌：${brandName}
网站：${website}
关键查询：${keyQueries.join('、')}
竞争对手：${competitors.join('、') || '无'}

请分析AI搜索可见性并提供优化建议。`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.3,
      }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        brandName,
        overallScore: 0,
        queryResults: [],
        recommendations: [],
        success: false,
        error: 'Failed to parse',
      };
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      brandName,
      overallScore: data.overallScore || 50,
      queryResults: [],
      recommendations: data.recommendations || [],
      success: true,
    };
  } catch (error) {
    return {
      brandName,
      overallScore: 0,
      queryResults: [],
      recommendations: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== 内容可提取性优化 ====================

export interface ExtractabilityCheck {
  url: string;
  score: number;              // 0-100
  issues: ExtractabilityIssue[];
  recommendations: string[];
}

export interface ExtractabilityIssue {
  type: 'structure' | 'clarity' | 'freshness' | 'authority' | 'schema';
  severity: 'high' | 'medium' | 'low';
  description: string;
  fix: string;
}

/**
 * 检查内容可提取性
 */
export function checkExtractability(options: {
  title: string;
  content: string;
  hasSchema: boolean;
  lastUpdated: Date;
  citations: number;
  authorExpertise: string;
}): ExtractabilityCheck {
  const { content, hasSchema, lastUpdated, citations, authorExpertise } = options;

  const issues: ExtractabilityIssue[] = [];
  let score = 100;

  // 检查结构
  const hasHeadings = /^#{1,6}\s/m.test(content) || /<h[1-6]>/i.test(content);
  if (!hasHeadings) {
    issues.push({
      type: 'structure',
      severity: 'high',
      description: '内容缺少标题层级结构',
      fix: '添加H2/H3标题，使用清晰的层级结构',
    });
    score -= 20;
  }

  // 检查清晰度
  const wordCount = content.length;
  if (wordCount < 300) {
    issues.push({
      type: 'clarity',
      severity: 'medium',
      description: `内容过短（${wordCount}字），AI难以提取足够信息`,
      fix: '扩展内容至至少500字，提供完整解答',
    });
    score -= 15;
  }

  // 检查结构化数据
  if (!hasSchema) {
    issues.push({
      type: 'schema',
      severity: 'high',
      description: '缺少结构化数据（Schema markup）',
      fix: '添加FAQ Schema、Article Schema或Product Schema',
    });
    score -= 25;
  }

  // 检查新鲜度
  const daysSinceUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate > 365) {
    issues.push({
      type: 'freshness',
      severity: 'medium',
      description: `内容已${Math.floor(daysSinceUpdate / 30)}个月未更新`,
      fix: '更新内容并标注更新日期',
    });
    score -= 10;
  }

  // 检查权威性
  if (citations < 3) {
    issues.push({
      type: 'authority',
      severity: 'medium',
      description: '缺少引用和数据支撑',
      fix: '添加权威来源引用、统计数据、专家观点',
    });
    score -= 15;
  }

  // 检查作者专业性
  if (!authorExpertise || authorExpertise.length < 10) {
    issues.push({
      type: 'authority',
      severity: 'low',
      description: '缺少作者专业性说明',
      fix: '添加作者简介，说明专业背景和资质',
    });
    score -= 5;
  }

  // 生成建议
  const recommendations: string[] = [];
  if (!hasHeadings) recommendations.push('使用H2/H3组织内容结构');
  if (!hasSchema) recommendations.push('添加JSON-LD结构化数据');
  if (citations < 3) recommendations.push('引用权威来源和数据');
  if (daysSinceUpdate > 180) recommendations.push('定期更新内容保持新鲜度');

  return {
    url: '',
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

// ==================== AI SEO 内容优化 ====================

export interface OptimizeForAIRequest {
  content: string;
  targetQuery: string;
  platform?: AIPlatform;
  language?: 'en' | 'zh';
}

export interface OptimizeForAIResult {
  optimizedContent: string;
  changes: string[];
  schemaSuggestion: string;
  success: boolean;
  error?: string;
}

/**
 * 优化内容以被AI搜索引擎引用
 */
export async function optimizeForAI(request: OptimizeForAIRequest): Promise<OptimizeForAIResult> {
  const { content, targetQuery, platform = 'perplexity', language = 'zh' } = request;

  const platformInfo = PLATFORM_FACTORS.find(p => p.platform === platform);

  const systemPrompt = language === 'zh'
    ? `你是AI搜索优化专家。优化内容以提高被AI搜索引擎引用的概率。

【优化原则】
1. 直接回答问题：在第一段给出清晰、完整的答案
2. 使用结构化格式：标题、列表、表格便于AI提取
3. 添加统计数据：具体数字可提升40%可见性
4. 引用权威来源：链接到可信来源
5. 使用定义句："[概念]是[定义]"格式便于AI引用
6. 添加FAQ：问题和答案对AI友好

【平台特性】${platformInfo?.keyFactors.join('、')}

【输出格式】
{
  "optimizedContent": "优化后的内容",
  "changes": ["改动1", "改动2"],
  "schemaSuggestion": "建议的JSON-LD结构化数据"
}`
    : `You are an AI SEO expert. Optimize content to be cited by AI search engines.

【Optimization Principles】
1. Direct answer: Give a clear, complete answer in the first paragraph
2. Structured format: Headings, lists, tables for AI extraction
3. Add statistics: Specific numbers boost visibility by 40%
4. Cite authoritative sources: Link to trusted sources
5. Use definition sentences: "[Concept] is [definition]" format
6. Add FAQ: Q&A pairs are AI-friendly

【Platform Factors】${platformInfo?.keyFactors.join(', ')}

【Output Format】
{
  "optimizedContent": "Optimized content",
  "changes": ["Change 1", "Change 2"],
  "schemaSuggestion": "Suggested JSON-LD schema"
}`;

  const userPrompt = language === 'zh'
    ? `目标查询：${targetQuery}
平台：${platform}

原内容：
${content}

请优化内容以提高AI搜索可见性。`
    : `Target Query: ${targetQuery}
Platform: ${platform}

Original Content:
${content}

Optimize for AI search visibility.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.3,
      }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        optimizedContent: '',
        changes: [],
        schemaSuggestion: '',
        success: false,
        error: 'Failed to parse',
      };
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      optimizedContent: data.optimizedContent || content,
      changes: data.changes || [],
      schemaSuggestion: data.schemaSuggestion || '',
      success: true,
    };
  } catch (error) {
    return {
      optimizedContent: '',
      changes: [],
      schemaSuggestion: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== 统计数据增强 ====================

export interface StatisticEnhancement {
  originalText: string;
  enhancedText: string;
  statistic: string;
  source: string;
}

/**
 * 为内容添加统计数据（需要连接数据源）
 */
export function suggestStatistics(content: string): string[] {
  const suggestions: string[] = [];

  // 检测可增强的位置
  if (content.includes('提高') || content.includes('increase')) {
    suggestions.push('添加具体提升百分比（如"提升30%"）');
  }

  if (content.includes('节省') || content.includes('save')) {
    suggestions.push('添加具体节省时间/成本数据（如"节省4小时/周"）');
  }

  if (content.includes('客户') || content.includes('customer')) {
    suggestions.push('添加客户数量或案例数据');
  }

  if (content.includes('行业') || content.includes('industry')) {
    suggestions.push('添加行业规模或增长率数据');
  }

  return suggestions;
}
