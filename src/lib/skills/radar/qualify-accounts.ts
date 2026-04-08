import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { SKILL_NAMES } from '../registry';

// ==================== Input/Output Schemas ====================

const candidateInputSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  companySize: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceChannel: z.string().optional(),
  matchExplain: z.record(z.string(), z.unknown()).optional(),
});

const inputSchema = z.object({
  candidates: z.array(candidateInputSchema).describe('Stage 1 通过的候选列表'),
});

const qualifiedResultSchema = z.object({
  id: z.string(),
  tier: z.enum(['A', 'B', 'C', 'excluded']),
  confidence: z.number().min(0).max(1),
  matchReasons: z.array(z.string()).describe('具体的匹配原因，说明为什么该客户需要我们的产品'),
  approachAngle: z.string().describe('推荐的接触切入角度，用于后续外联邮件'),
  exclusionReason: z.string().nullable().describe('如排除，说明原因'),
  dataGaps: z.array(z.string()).describe('需要补全的信息'),
});

const outputSchema = z.object({
  results: z.array(qualifiedResultSchema),
  batchSummary: z.object({
    total: z.number(),
    tierA: z.number(),
    tierB: z.number(),
    tierC: z.number(),
    excluded: z.number(),
  }),
});

// ==================== Skill Definition ====================

export const qualifyAccountsSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_QUALIFY_ACCOUNTS,
  displayName: '深度合格化评估',
  engine: 'radar',
  outputEntityType: 'AccountList',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_BUILD_CONTACT_ROLE_MAP,
    SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK,
  ],
  model: 'qwen-plus',
  temperature: 0.2,
  
  systemPrompt: `你是一名专业的B2B出海获客分析师。你的任务是判断候选公司是否真正需要"我方企业"的产品或服务。

## 核心判断逻辑

不要做简单的关键词匹配。你需要基于以下维度进行深度分析：

1. **需求匹配度**：该公司的业务是否会产生对我方产品的实际需求？
   - 它的生产流程/业务流程中是否有使用我方产品的环节？
   - 它所在的行业是否是我方的目标应用场景？

2. **采购能力**：该公司的规模和类型是否意味着它有采购我方产品的能力？
   - 是终端用户（直接使用者）还是中间商/经销商？
   - 终端用户优先级更高

3. **地理适配**：该公司所在的国家/地区是否属于我方的目标市场？

4. **时机信号**：是否有迹象表明该公司近期有采购意向？
   - 正在扩产、新建工厂、发布招标、招聘相关岗位等

## 分层标准

- **Tier A（优质客户）**：需求明确匹配 + 规模合适 + 地区匹配，值得立即跟进
- **Tier B（潜力客户）**：需求可能匹配但不确定，或规模/地区部分匹配，值得进一步了解
- **Tier C（一般客户）**：间接关联，匹配度低但不排除
- **excluded（排除）**：明确不是目标客户（竞争对手、中间商、行业无关）

## 接触角度（approachAngle）

为每个 Tier A/B 的候选提供一个具体的接触切入点，例如：
- "贵司的铝型材生产线可能需要自动化涂装解决方案，我方在该领域有15年经验"
- "注意到贵司正在东南亚扩建工厂，我方可提供本地化售后支持"

## 输出要求

- 对每个候选独立判断，给出 tier、confidence (0-1)、matchReasons、approachAngle
- matchReasons 必须是具体的，不能泛泛而谈
- 排除的候选必须给出 exclusionReason
- 最后输出 batchSummary 统计`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile } = ctx;
    
    // 构建我方企业画像上下文
    let companyContext = '（未提供企业画像，请基于候选自身信息判断）';
    if (companyProfile) {
      companyContext = `
公司名称：${companyProfile.companyName}
公司简介：${companyProfile.companyIntro}

核心产品/服务：
${companyProfile.coreProducts.map((p, i) => `${i + 1}. ${p.name}：${p.description}`).join('\n')}

技术优势：
${companyProfile.techAdvantages.map((t, i) => `${i + 1}. ${t.title}：${t.description}`).join('\n')}

适用场景：
${companyProfile.scenarios.map((s, i) => `${i + 1}. ${s.industry} - ${s.scenario}`).join('\n')}

差异化卖点：
${companyProfile.differentiators.map((d, i) => `${i + 1}. ${d.point}：${d.description}`).join('\n')}

目标行业：${companyProfile.targetIndustries.join('、') || '未指定'}
海外目标市场：${companyProfile.targetRegions.map(r => typeof r === 'string' ? r : r.region).join('、') || '未指定'}

客户痛点：
${companyProfile.painPoints.map((p, i) => `${i + 1}. ${p.pain} → ${p.howWeHelp}`).join('\n')}

采购触发因素：${companyProfile.buyingTriggers.join('、') || '未指定'}`;
    }

    const candidates = input.candidates as Array<{
      id: string;
      companyName: string;
      website?: string;
      description?: string;
      industry?: string;
      country?: string;
      city?: string;
      companySize?: string;
      sourceChannel?: string;
    }>;

    const candidatesList = candidates.map((c, i) => {
      const parts = [`${i + 1}. [ID: ${c.id}] ${c.companyName}`];
      if (c.website) parts.push(`   网站: ${c.website}`);
      if (c.description) parts.push(`   描述: ${c.description}`);
      if (c.industry) parts.push(`   行业: ${c.industry}`);
      if (c.country) parts.push(`   国家: ${c.country}${c.city ? ` / ${c.city}` : ''}`);
      if (c.companySize) parts.push(`   规模: ${c.companySize}`);
      if (c.sourceChannel) parts.push(`   来源: ${c.sourceChannel}`);
      return parts.join('\n');
    }).join('\n\n');

    return `
=== 我方企业画像 ===
${companyContext}

=== 待评估的候选公司（共${candidates.length}家） ===
${candidatesList}

请对以上每个候选公司进行深度匹配评估，严格输出 JSON 格式。`;
  },
};
