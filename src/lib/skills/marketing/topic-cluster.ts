import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt, formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  profiles: z.record(z.string(), z.unknown()).optional().describe('ICP/Persona 数据'),
  advantages: z.array(z.string()).optional().describe('企业优势列表'),
  focusSegment: z.string().optional().describe('聚焦的细分市场'),
  company: z.record(z.string(), z.unknown()).optional().describe('企业认知详情'),
  targetCustomers: z.record(z.string(), z.unknown()).optional().describe('目标客户画像与细分市场'),
  inferredQuestionAngles: z.array(z.record(z.string(), z.unknown())).optional().describe('基于画像推导出的提问线索'),
  publishingHints: z.array(z.record(z.string(), z.unknown())).optional().describe('建议优先发布的渠道与内容类型'),
}).passthrough();

// Content type enum for content map
const contentTypeEnum = z.enum([
  'BuyingGuide',
  'Whitepaper', 
  'FAQ',
  'QnA',
  'KnowledgeBase',
  'Comparison',
  'UseCasePage',
  'CaseStudy',
  'TechnicalDoc',
  'Checklist',
]);

// Content map item schema
const contentMapItemSchema = z.object({
  type: contentTypeEnum,
  title: z.string(),
  briefGoal: z.string(),
  funnel: z.enum(['TOFU', 'MOFU', 'BOFU']),
  intent: z.enum(['informational', 'commercial', 'transactional']),
  mustUseEvidenceIds: z.array(z.string()),
  targetQuestion: z.string().optional(),
  targetRole: z.string().optional(),
  targetPersonaId: z.string().optional(),
  targetPersonaName: z.string().optional(),
  primaryPublishTarget: z.string().optional(),
  suggestedDistributionTargets: z.array(z.string()).optional(),
});

const questionDirectionSchema = z.object({
  persona: z.string().optional(),
  role: z.string().optional(),
  scenario: z.string().optional(),
  stage: z.enum(['TOFU', 'MOFU', 'BOFU']).optional(),
  intent: z.enum(['informational', 'commercial', 'transactional', 'navigational']).optional(),
  question: z.string(),
  whyThisQuestion: z.string().optional(),
});

const publishingDirectionSchema = z.object({
  mode: z.enum(['integrated', 'suggested']).default('suggested'),
  canAutoPublish: z.boolean().default(false),
  channel: z.string(),
  reason: z.string().optional(),
  purpose: z.string().optional(),
  contentTypes: z.array(contentTypeEnum).default([]),
});

// Persona reference
const personaRefSchema = z.object({
  entityId: z.string(),
  versionId: z.string().optional(),
}).optional();

// Cluster schema - 主题集群
const clusterSchema = z.object({
  clusterName: z.string().optional(),
  pillar: z.string().optional(),
  coreKeywords: z.array(z.string()),
  longTailKeywords: z.array(z.string()),
  aeoQuestions: z.array(z.string()),
  commercialKeywords: z.array(z.string()),
  negatives: z.array(z.string()),
  personaRef: personaRefSchema,
  targetRoles: z.array(z.string()).optional(),
  questionMap: z.array(questionDirectionSchema).default([]),
  primaryPublishTarget: z.string().optional(),
  suggestedDistributionTargets: z.array(z.string()).optional(),
  intent: z.string(),
  requiredEvidenceIds: z.array(z.string()),
  contentMap: z.array(contentMapItemSchema),
});

// Output schema
const outputSchema = z.object({
  topicCluster: z.object({
    name: z.string(),
    customerUnderstanding: z.array(z.string()).default([]),
    buyerUnderstanding: z.array(z.string()).default([]),
    questionDirections: z.array(questionDirectionSchema).default([]),
    publishingDirections: z.array(publishingDirectionSchema).default([]),
    clusters: z.array(clusterSchema),
  }),
  openQuestions: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// ==================== Skill Definition ====================

export const topicClusterSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.MARKETING_BUILD_TOPIC_CLUSTER,
  displayName: '生成主题集群',
  engine: 'marketing',
  outputEntityType: 'TopicCluster',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.MARKETING_GENERATE_CONTENT_BRIEF,
  ],
  model: 'qwen-max',
  temperature: 0.4,
  
  systemPrompt: `你是B2B出海 SEO/AEO/GEO 内容策略专家。你要先理解客户企业是谁、目标买家是谁、这些买家会在什么场景下如何提问，再生成可执行的 Topic Cluster（主题集群 + 问题地图 + 内容地图 + 发布方向）。

## 输出格式要求
输出严格的JSON，包含以下结构：
{
  "topicCluster": {
    "name": "细分市场名称",
    "customerUnderstanding": ["客户企业的核心认知1", "客户企业的核心认知2"],
    "buyerUnderstanding": ["目标客户画像洞察1", "画像洞察2"],
    "questionDirections": [
      {
        "persona": "目标买家名称",
        "role": "岗位/角色",
        "scenario": "触发搜索的问题场景",
        "stage": "TOFU|MOFU|BOFU",
        "intent": "informational|commercial|transactional|navigational",
        "question": "潜在客户在AI/搜索里会怎么问",
        "whyThisQuestion": "为什么会这样问"
      }
    ],
    "publishingDirections": [
      {
        "mode": "integrated|suggested",
        "canAutoPublish": true,
        "channel": "客户官网（API直发）/ 建议外部分发渠道",
        "purpose": "此渠道承接什么阶段的问题",
        "reason": "为什么适合放在这个渠道",
        "contentTypes": ["FAQ", "BuyingGuide"]
      }
    ],
    "clusters": [
      {
        "pillar": "内容支柱名称",
        "clusterName": "主题集群名称",
        "intent": "informational|commercial|transactional|navigational",
        "coreKeywords": ["核心关键词1", "核心关键词2"],
        "longTailKeywords": ["长尾关键词1", "长尾关键词2"],
        "aeoQuestions": ["用户会问的问题1？", "用户会问的问题2？"],
        "commercialKeywords": ["商业意图关键词1"],
        "negatives": ["排除词1"],
        "personaRef": { "entityId": "persona-id" },
        "targetRoles": ["采购经理", "技术负责人"],
        "questionMap": [
          {
            "persona": "目标买家名称",
            "role": "角色",
            "scenario": "搜索/咨询场景",
            "stage": "TOFU|MOFU|BOFU",
            "intent": "informational|commercial|transactional|navigational",
            "question": "这个支柱重点要回答的问题",
            "whyThisQuestion": "为什么重要"
          }
        ],
        "primaryPublishTarget": "客户官网（API直发）",
        "suggestedDistributionTargets": ["行业媒体投稿", "第三方平台案例页"],
        "requiredEvidenceIds": ["evidence-cuid-1"],
        "contentMap": [
          {
            "type": "BuyingGuide|FAQ|Whitepaper|QnA|KnowledgeBase|Comparison|UseCasePage|CaseStudy|TechnicalDoc|Checklist",
            "title": "内容标题",
            "briefGoal": "这篇内容要解决什么问题、达成什么目标",
            "funnel": "TOFU|MOFU|BOFU",
            "intent": "informational|commercial|transactional",
            "mustUseEvidenceIds": ["evidence-cuid-1"],
            "targetQuestion": "要优先回答的提问",
            "targetRole": "优先服务的角色",
            "targetPersonaId": "persona-id",
            "targetPersonaName": "persona-name",
            "primaryPublishTarget": "客户官网（API直发）",
            "suggestedDistributionTargets": ["行业媒体投稿"]
          }
        ]
      }
    ]
  },
  "openQuestions": ["需要进一步确认的问题"],
  "confidence": 0.8
}

## 关键规则
1. 先抽象“客户是谁 + 目标买家是谁 + 为什么会发起搜索/AI提问”，再输出 cluster
2. 每个 cluster 必须包含至少 3 个 contentMap 条目，覆盖 TOFU/MOFU/BOFU
3. 每个 cluster 至少给出 3 个 questionMap 条目，问题要体现真实买家视角
4. 官网是唯一可执行的主发布渠道，必须把 primaryPublishTarget 设为客户官网（或官网内的具体承接位）
5. 其他外部分发只放在 suggestedDistributionTargets 中，作为运营建议，不要写成系统自动可发布
6. coreKeywords 是高搜索量核心词；longTailKeywords 是更具体的长尾词
7. aeoQuestions 是用户可能问的问题（用于 AI 搜索优化）
8. requiredEvidenceIds 和 mustUseEvidenceIds 必须引用已提供的证据ID
9. 没有证据支撑的点放入 openQuestions
10. publishingDirections 必须明确区分 integrated 与 suggested
11. confidence 反映你对整体输出质量的置信度（0-1）`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile, evidences } = ctx;
    
    let prompt = '';
    
    if (companyProfile) {
      prompt += formatCompanyProfileForPrompt(companyProfile);
    }
    
    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }
    
    prompt += `
${input.profiles ? `=== ICP/Persona 数据 ===\n${JSON.stringify(input.profiles, null, 2)}` : ''}

${input.company ? `=== 客户企业认知 ===\n${JSON.stringify(input.company, null, 2)}` : ''}

${input.targetCustomers ? `=== 目标客户画像 ===\n${JSON.stringify(input.targetCustomers, null, 2)}` : ''}

${input.inferredQuestionAngles ? `=== 推导出的提问线索 ===\n${JSON.stringify(input.inferredQuestionAngles, null, 2)}` : ''}

${input.publishingHints ? `=== 发布方向提示 ===\n${JSON.stringify(input.publishingHints, null, 2)}` : ''}

${input.advantages ? `=== 企业优势 ===\n${(input.advantages as string[]).join('\n')}` : ''}

${input.focusSegment ? `=== 聚焦细分市场 ===\n${input.focusSegment}` : ''}

=== 任务要求 ===
请基于以上企业认知和证据，生成完整的主题集群（Topic Cluster），包含：
1. 先概括客户企业认知、目标买家认知、他们最可能发起的 question directions
2. 至少 2 个主题集群（cluster）
3. 每个集群包含核心关键词、长尾词、AEO问题、商业词、排除词
4. 每个集群必须同时给出 questionMap、contentMap、官网主发布位和建议分发位
5. contentMap 要体现“回答谁的问题、官网由哪里承接、外部建议往哪里补”
6. 所有证据引用必须使用已提供的证据ID
7. 不确定的点放入 openQuestions`;
    
    return prompt;
  },
};
