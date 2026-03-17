// ==================== 营销文案服务 ====================
// 整合MarketingSkills框架：copywriting最佳实践

import { chatCompletion } from '@/lib/ai-client';

// ==================== 文案类型 ====================

export type CopyType =
  | 'homepage'        // 首页
  | 'landing_page'    // 落地页
  | 'product_page'    // 产品页
  | 'about_page'      // 关于我们
  | 'feature_page'    // 功能页
  | 'pricing_page';   // 定价页

export interface CopyRequest {
  type: CopyType;
  companyName: string;
  industry: string;
  targetAudience: string;
  mainProblem: string;           // 客户面临的主要问题
  solution: string;              // 解决方案
  keyBenefits: string[];         // 核心利益点
  differentiators: string[];     // 差异化因素
  proofPoints: string[];         // 证据点（数据、案例、证言）
  tone?: 'professional' | 'friendly' | 'technical';
  language?: 'en' | 'zh';
  maxLength?: number;            // 最大字数
}

export interface CopyResult {
  headline: string;              // 主标题
  subheadline: string;           // 副标题
  body: string;                  // 正文
  cta: string;                   // 行动号召
  sections?: CopySection[];      // 分段内容（用于长页面）
  success: boolean;
  error?: string;
}

export interface CopySection {
  title: string;
  content: string;
  type: 'problem' | 'solution' | 'proof' | 'features' | 'testimonials' | 'faq';
}

// ==================== 文案写作原则 ====================

const COPYWRITING_PRINCIPLES = `
【核心原则】
1. 清晰胜过巧妙：选择清晰而非创意
2. 利益胜过功能：说"能帮你做什么"而非"有什么"
3. 具体胜过模糊：避免"优化"、"提升"、"创新"等空词
4. 客户语言胜过公司语言：用客户的词，不是内部术语
5. 一段一个观点：每段推进一个论点

【写作规范】
- 简单词汇：用"使用"不用"利用"，用"帮助"不用"促进"
- 主动语态："我们生成报告"而非"报告被生成"
- 自信表达：删除"几乎"、"非常"、"相当"
- 展示而非讲述：描述结果而非堆砌形容词
- 诚实而非夸大：虚构数据会侵蚀信任

【禁止词汇】
- 营销腔："业界领先"、"一站式解决方案"、"赋能"
- 空洞词："优化"、"提升"、"革新"、"颠覆"
- AI痕迹："在当今快节奏的世界中"、"我们深知"
`;

/**
 * 生成营销文案
 */
export async function generateCopy(request: CopyRequest): Promise<CopyResult> {
  const {
    type,
    companyName,
    industry,
    targetAudience,
    mainProblem,
    solution,
    keyBenefits,
    differentiators,
    proofPoints,
    tone = 'professional',
    language = 'zh',
    maxLength,
  } = request;

  const typeNames: Record<CopyType, string> = {
    homepage: '首页',
    landing_page: '落地页',
    product_page: '产品页',
    about_page: '关于我们',
    feature_page: '功能页',
    pricing_page: '定价页',
  };

  const systemPrompt = language === 'zh'
    ? `你是专业的营销文案撰写专家。${COPYWRITING_PRINCIPLES}

【任务】
为${typeNames[type]}撰写营销文案。

【输出格式】
{
  "headline": "主标题（<15字，直击痛点或利益）",
  "subheadline": "副标题（<30字，补充说明价值）",
  "body": "正文（<200字，口语化，每段一个观点）",
  "cta": "行动号召（<10字，动词+结果）",
  "sections": [
    {
      "title": "段落标题",
      "content": "段落内容",
      "type": "problem|solution|proof|features|testimonials|faq"
    }
  ]
}`
    : `You are an expert conversion copywriter. ${COPYWRITING_PRINCIPLES}

【Task】
Write marketing copy for ${type}.

【Output Format】
{
  "headline": "Main headline (<15 words, hit pain point or benefit)",
  "subheadline": "Subheadline (<30 words, elaborate value)",
  "body": "Body copy (<200 words, conversational, one idea per paragraph)",
  "cta": "Call to action (<10 words, verb + result)",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content",
      "type": "problem|solution|proof|features|testimonials|faq"
    }
  ]
}`;

  const toneInstructions: Record<string, string> = {
    professional: '专业、正式的商务语气',
    friendly: '友好、轻松但专业',
    technical: '技术导向，使用行业术语展示专业度',
  };

  const userPrompt = language === 'zh'
    ? `公司：${companyName}
行业：${industry}
目标受众：${targetAudience}
主要问题：${mainProblem}
解决方案：${solution}
核心利益：${keyBenefits.join('、')}
差异化：${differentiators.join('、')}
证据点：${proofPoints.join('、')}
语气：${toneInstructions[tone]}
${maxLength ? `字数限制：${maxLength}字以内` : ''}

请生成${typeNames[type]}文案。`
    : `Company: ${companyName}
Industry: ${industry}
Target Audience: ${targetAudience}
Main Problem: ${mainProblem}
Solution: ${solution}
Key Benefits: ${keyBenefits.join(', ')}
Differentiators: ${differentiators.join(', ')}
Proof Points: ${proofPoints.join(', ')}
Tone: ${toneInstructions[tone]}
${maxLength ? `Max Length: ${maxLength} words` : ''}

Generate ${type} copy.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.5,
      }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { headline: '', subheadline: '', body: '', cta: '', success: false, error: 'Failed to parse' };
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      headline: data.headline || '',
      subheadline: data.subheadline || '',
      body: data.body || '',
      cta: data.cta || '',
      sections: data.sections || [],
      success: true,
    };
  } catch (error) {
    return {
      headline: '',
      subheadline: '',
      body: '',
      cta: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 生成产品描述
 */
export async function generateProductDescription(options: {
  productName: string;
  category: string;
  features: string[];
  targetUseCase: string;
  language?: 'en' | 'zh';
}): Promise<{ description: string; success: boolean; error?: string }> {
  const { productName, category, features, targetUseCase, language = 'zh' } = options;

  const systemPrompt = language === 'zh'
    ? `你是产品文案专家。撰写简洁、具体、有说服力的产品描述。

原则：
1. 第一句说清楚产品是什么、给谁用
2. 用具体数字和场景，不用空词
3. 每个功能说明对应的利益
4. 结尾是明确的下一步

输出JSON：{ "description": "产品描述（<150字）" }`
    : `You are a product copywriting expert. Write concise, specific, persuasive product descriptions.

Principles:
1. First sentence: what it is, who it's for
2. Use specific numbers and scenarios, no fluff
3. Each feature links to a benefit
4. End with clear next step

Output JSON: { "description": "Product description (<150 words)" }`;

  const userPrompt = language === 'zh'
    ? `产品：${productName}
类别：${category}
功能：${features.join('、')}
使用场景：${targetUseCase}

生成产品描述。`
    : `Product: ${productName}
Category: ${category}
Features: ${features.join(', ')}
Use Case: ${targetUseCase}

Generate product description.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.4,
      }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { description: '', success: false, error: 'Failed to parse' };
    }

    const data = JSON.parse(jsonMatch[0]);
    return { description: data.description, success: true };
  } catch (error) {
    return {
      description: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 优化现有文案
 */
export async function improveCopy(options: {
  currentCopy: string;
  goal: string;  // 改进目标：更清晰、更有说服力、更简洁等
  language?: 'en' | 'zh';
}): Promise<{ improvedCopy: string; changes: string[]; success: boolean; error?: string }> {
  const { currentCopy, goal, language = 'zh' } = options;

  const systemPrompt = language === 'zh'
    ? `你是文案编辑专家。根据目标改进现有文案。

改进原则：
1. 删除不推动行动的句子
2. 用具体数字替换模糊词
3. 主动语态替换被动语态
4. 删除营销腔和AI痕迹

输出JSON：
{
  "improvedCopy": "改进后的文案",
  "changes": ["改动1：原因", "改动2：原因"]
}`
    : `You are a copy editing expert. Improve existing copy based on the goal.

Improvement Principles:
1. Cut sentences that don't drive action
2. Replace vague words with specific numbers
3. Active voice over passive voice
4. Remove marketing speak and AI patterns

Output JSON:
{
  "improvedCopy": "Improved copy",
  "changes": ["Change 1: reason", "Change 2: reason"]
}`;

  const userPrompt = language === 'zh'
    ? `当前文案：
"${currentCopy}"

改进目标：${goal}

请改进并说明改动。`
    : `Current Copy:
"${currentCopy}"

Goal: ${goal}

Improve and explain changes.`;

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
      return { improvedCopy: '', changes: [], success: false, error: 'Failed to parse' };
    }

    const data = JSON.parse(jsonMatch[0]);
    return {
      improvedCopy: data.improvedCopy,
      changes: data.changes || [],
      success: true,
    };
  } catch (error) {
    return {
      improvedCopy: '',
      changes: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
