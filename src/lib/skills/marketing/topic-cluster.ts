import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt, formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  profiles: z.record(z.string(), z.unknown()).optional().describe('ICP/Persona 数据'),
  advantages: z.array(z.string()).optional().describe('企业优势列表'),
  focusSegment: z.string().optional().describe('聚焦的细分市场'),
});

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
});

// Persona reference
const personaRefSchema = z.object({
  entityId: z.string(),
  versionId: z.string().optional(),
}).optional();

// Cluster schema - 主题集群
const clusterSchema = z.object({
  clusterName: z.string(),
  coreKeywords: z.array(z.string()),
  longTailKeywords: z.array(z.string()),
  aeoQuestions: z.array(z.string()),
  commercialKeywords: z.array(z.string()),
  negatives: z.array(z.string()),
  personaRef: personaRefSchema,
  requiredEvidenceIds: z.array(z.string()),
  contentMap: z.array(contentMapItemSchema),
});

// Output schema
const outputSchema = z.object({
  topicCluster: z.object({
    name: z.string(),
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
  
  systemPrompt: `你是B2B出海SEO/AEO内容策略专家。根据企业认知、ICP/Persona、触发事件与证据，生成可执行的Topic Cluster（主题集群+内容地图）。

## 输出格式要求
输出严格的JSON，包含以下结构：
{
  "topicCluster": {
    "name": "细分市场名称",
    "clusters": [
      {
        "clusterName": "主题集群名称",
        "coreKeywords": ["核心关键词1", "核心关键词2"],
        "longTailKeywords": ["长尾关键词1", "长尾关键词2"],
        "aeoQuestions": ["用户会问的问题1？", "用户会问的问题2？"],
        "commercialKeywords": ["商业意图关键词1"],
        "negatives": ["排除词1"],
        "personaRef": { "entityId": "persona-id" },
        "requiredEvidenceIds": ["evidence-cuid-1"],
        "contentMap": [
          {
            "type": "BuyingGuide|FAQ|Whitepaper|QnA|KnowledgeBase|Comparison|UseCasePage|CaseStudy|TechnicalDoc|Checklist",
            "title": "内容标题",
            "briefGoal": "这篇内容要解决什么问题、达成什么目标",
            "funnel": "TOFU|MOFU|BOFU",
            "intent": "informational|commercial|transactional",
            "mustUseEvidenceIds": ["evidence-cuid-1"]
          }
        ]
      }
    ]
  },
  "openQuestions": ["需要进一步确认的问题"],
  "confidence": 0.8
}

## 关键规则
1. 每个 cluster 必须包含至少 3 个 contentMap 条目，覆盖 TOFU/MOFU/BOFU
2. coreKeywords 是高搜索量核心词；longTailKeywords 是更具体的长尾词
3. aeoQuestions 是用户可能问的问题（用于 AI 搜索优化）
4. commercialKeywords 是带购买意图的词
5. negatives 是需要排除的无效词
6. requiredEvidenceIds 和 mustUseEvidenceIds 必须引用已提供的证据ID
7. 没有证据支撑的点放入 openQuestions
8. confidence 反映你对整体输出质量的置信度（0-1）`,
  
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

${input.advantages ? `=== 企业优势 ===\n${(input.advantages as string[]).join('\n')}` : ''}

${input.focusSegment ? `=== 聚焦细分市场 ===\n${input.focusSegment}` : ''}

=== 任务要求 ===
请基于以上企业认知和证据，生成完整的主题集群（Topic Cluster），包含：
1. 至少 2 个主题集群（cluster）
2. 每个集群包含核心关键词、长尾词、AEO问题、商业词、排除词
3. 每个集群包含内容地图（contentMap），至少 3 种内容类型
4. 所有证据引用必须使用已提供的证据ID
5. 不确定的点放入 openQuestions`;
    
    return prompt;
  },
};
