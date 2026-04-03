import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../registry';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  prospectCompany: z.record(z.string(), z.unknown()).describe('目标客户公司信息'),
  contacts: z.array(z.record(z.string(), z.unknown())).describe('联系人列表'),
  opportunities: z.array(z.record(z.string(), z.unknown())).describe('关联商业机会'),
  candidateData: z.record(z.string(), z.unknown()).nullable().describe('原始候选数据（匹配分数等）'),
  intelligence: z.record(z.string(), z.unknown()).nullable().describe('情报数据（融资、新闻等）'),
});

const keyFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  source: z.string(),
});

const contactAnalysisSchema = z.object({
  name: z.string(),
  role: z.string(),
  seniority: z.string(),
  influence: z.string(),
  approachAngle: z.string(),
  source: z.string(),
});

const opportunityAnalysisSchema = z.object({
  title: z.string(),
  stage: z.string(),
  value: z.string(),
  deadline: z.string(),
  relevance: z.string(),
});

const riskAlertSchema = z.object({
  risk: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  basis: z.string(),
});

const nextStepSchema = z.object({
  action: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  rationale: z.string(),
});

const dataSourceSchema = z.object({
  field: z.string(),
  source: z.string(),
  status: z.enum(['available', 'missing']),
});

const outputSchema = z.object({
  dossier: z.object({
    companyOverview: z.object({
      summary: z.string(),
      keyFacts: z.array(keyFactSchema),
      dataGaps: z.array(z.string()),
    }),
    decisionMakerAnalysis: z.object({
      contacts: z.array(contactAnalysisSchema),
      orgStructureInsight: z.string(),
      dataGaps: z.array(z.string()),
    }),
    businessOpportunities: z.object({
      opportunities: z.array(opportunityAnalysisSchema),
      dataGaps: z.array(z.string()),
    }),
    intelligenceSummary: z.object({
      funding: z.string(),
      news: z.string(),
      competitors: z.string(),
      dataGaps: z.array(z.string()),
    }),
    matchAnalysis: z.object({
      overallScore: z.number().nullable(),
      matchReasons: z.array(z.string()),
      relevanceInsights: z.array(z.string()),
      dataGaps: z.array(z.string()),
    }),
    riskAlerts: z.array(riskAlertSchema),
    recommendedApproach: z.object({
      nextSteps: z.array(nextStepSchema),
      talkingPoints: z.array(z.string()),
      avoidTopics: z.array(z.string()),
    }),
    dataSources: z.array(dataSourceSchema),
  }),
});

// ==================== Skill Definition ====================

export const prospectDossierSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_GENERATE_PROSPECT_DOSSIER,
  displayName: '客户背调简报',
  engine: 'radar',
  outputEntityType: 'ProspectDossier',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK,
  ],
  model: 'qwen-max',
  temperature: 0.2,

  systemPrompt: `你是B2B客户背调分析师。你的任务是基于提供的数据生成客户背调评估简报。

核心原则：有什么说什么，没有的标注"数据待补充"。

严格约束：
1. 你只能使用下方提供的数据，绝不编造任何事实、数字、公司名、人名。
2. 每个关键数据点必须在 source 字段标注来源（如 "ProspectCompany.industry"、"intelligence.funding" 等）。
3. 当某个板块没有数据时，该板块的 dataGaps 数组必须列出缺失项，summary 中写明"数据待补充"。
4. 风险提示应基于数据空缺和已知信息推导，不要编造竞品或威胁。
5. 推荐策略必须是可执行的具体动作，基于已有数据推导。
6. 如果 matchScore 或 intelligence 为空，在对应板块标注"数据待补充"而非跳过。
7. dataSources 数组必须列出所有关键字段及其数据可用状态。
8. 输出语言：中文。`,

  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile } = ctx;

    let prompt = '';

    if (companyProfile) {
      prompt += formatCompanyProfileForPrompt(companyProfile);
    }

    const company = input.prospectCompany as Record<string, unknown> | null;
    const contacts = input.contacts as Array<Record<string, unknown>> | null;
    const opportunities = input.opportunities as Array<Record<string, unknown>> | null;
    const candidateData = input.candidateData as Record<string, unknown> | null;
    const intelligence = input.intelligence as Record<string, unknown> | null;

    prompt += `
=== 目标公司信息 ===
${company ? JSON.stringify(company, null, 2) : '暂无公司信息'}

=== 联系人数据 ===
${contacts && contacts.length > 0 ? JSON.stringify(contacts, null, 2) : '暂无联系人数据'}

=== 关联商业机会 ===
${opportunities && opportunities.length > 0 ? JSON.stringify(opportunities, null, 2) : '暂无关联机会'}

=== 候选匹配数据 ===
${candidateData ? JSON.stringify(candidateData, null, 2) : '暂无匹配分析数据'}

=== 情报数据 ===
${intelligence ? JSON.stringify(intelligence, null, 2) : '暂无情报数据'}

=== 任务要求 ===
请基于以上数据生成完整的客户背调评估简报。包含以下板块：
1. 公司概况：整合公司基本信息，提炼关键事实
2. 决策者分析：分析联系人角色、影响力和接触策略
3. 商业机会：分析关联机会的阶段和价值
4. 情报摘要：融资动态、新闻舆情、竞品态势
5. 匹配度分析：基于匹配分数和原因分析我方产品与目标的契合度
6. 风险提示：基于数据空缺和已知信息的风险评估
7. 建议策略：可执行的下一步动作和关键话题

重要：每个板块如果缺少数据，必须在 dataGaps 中列出缺失项。不要编造任何数据。`;

    return prompt;
  },
};
