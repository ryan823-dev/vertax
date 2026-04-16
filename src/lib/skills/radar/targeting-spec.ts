import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt, formatCompanyProfileForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  icpName: z.string().optional().describe('ICP 名称'),
  focusIndustries: z.array(z.string()).optional().describe('重点关注的行业'),
  focusRegions: z.array(z.string()).optional().describe('重点关注的区域'),
});

// Firmographic criteria
const firmographicSchema = z.object({
  industries: z.array(z.string()),
  countries: z.array(z.string()),
  companySize: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    metric: z.enum(['employees', 'revenue']).optional(),
  }),
  exclude: z.array(z.string()),
});

// Technographic criteria  
const technographicSchema = z.object({
  keywords: z.array(z.string()),
  standards: z.array(z.string()),
  systems: z.array(z.string()),
  exclude: z.array(z.string()),
});

// Use case schema
const useCaseSchema = z.object({
  name: z.string(),
  signals: z.array(z.string()),
  excludeSignals: z.array(z.string()),
});

// Trigger schema
const triggerSchema = z.object({
  name: z.string(),
  signals: z.array(z.string()),
  whereToObserve: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// Exclusion rule schema
const exclusionRuleSchema = z.object({
  rule: z.string(),
  why: z.string(),
});

// Decision unit schema
const decisionUnitSchema = z.object({
  roles: z.array(z.object({
    role: z.string(),
    kpi: z.array(z.string()),
    typicalTitleKeywords: z.array(z.string()),
    influence: z.enum(['decision_maker', 'influencer', 'champion', 'blocker']).optional(),
  })),
});

// Segment schema
const segmentSchema = z.object({
  segmentName: z.string(),
  firmographic: firmographicSchema,
  technographic: technographicSchema,
  useCases: z.array(useCaseSchema),
  triggers: z.array(triggerSchema),
  exclusionRules: z.array(exclusionRuleSchema),
  decisionUnit: decisionUnitSchema,
  successCriteria: z.array(z.object({
    metric: z.string(),
    direction: z.enum(['increase', 'decrease']),
    typicalRange: z.string(),
  })),
  evidenceIds: z.array(z.string()),
});

// Output schema
const outputSchema = z.object({
  targetingSpec: z.object({
    icpName: z.string(),
    segments: z.array(segmentSchema),
    assumptions: z.array(z.string()),
    openQuestions: z.array(z.string()),
  }),
});

// ==================== Skill Definition ====================

export const targetingSpecSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_BUILD_TARGETING_SPEC,
  displayName: '生成 Targeting Spec',
  engine: 'radar',
  outputEntityType: 'TargetingSpec',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_BUILD_CHANNEL_MAP,
    SKILL_NAMES.RADAR_PLAN_ACCOUNT_DISCOVERY,
  ],
  model: 'qwen-plus',  // 改用更快的模型
  temperature: 0.3,
  
  systemPrompt: `你是B2B出海获客专家。根据输入的企业认知、产品、优势证据、ICP/Persona与触发事件，产出"可执行筛选规则 Targeting Spec"。

## 输出格式要求
输出严格的JSON，包含以下结构：
{
  "targetingSpec": {
    "icpName": "理想客户画像名称",
    "segments": [
      {
        "segmentName": "细分市场名称",
        "firmographic": {
          "industries": ["行业1", "行业2"],
          "countries": ["国家1", "国家2"],
          "companySize": { "min": 50, "max": 500, "metric": "employees" },
          "exclude": ["排除的公司类型"]
        },
        "technographic": {
          "keywords": ["技术关键词"],
          "standards": ["采用的标准"],
          "systems": ["使用的系统"],
          "exclude": ["排除的技术"]
        },
        "useCases": [
          {
            "name": "使用场景名称",
            "signals": ["识别信号"],
            "excludeSignals": ["排除信号"]
          }
        ],
        "triggers": [
          {
            "name": "触发事件名称",
            "signals": ["触发信号"],
            "whereToObserve": ["在哪里观察到"],
            "confidence": 0.8
          }
        ],
        "exclusionRules": [
          { "rule": "排除规则", "why": "原因" }
        ],
        "decisionUnit": {
          "roles": [
            {
              "role": "角色名称",
              "kpi": ["关注的KPI"],
              "typicalTitleKeywords": ["职位关键词"],
              "influence": "decision_maker|influencer|champion|blocker"
            }
          ]
        },
        "successCriteria": [
          { "metric": "指标", "direction": "increase", "typicalRange": "20-30%" }
        ],
        "evidenceIds": ["支撑证据ID"]
      }
    ],
    "assumptions": ["假设1"],
    "openQuestions": ["待确认问题1"]
  }
}

## 关键规则
1. 规则必须可落地（能用于筛选公司/联系人），并明确排除条件
2. 不得编造事实；所有关键判断必须引用证据ID或标为假设
3. 输出的 segments 至少包含 1 个细分市场
4. 每个 segment 必须包含完整的筛选条件和排除规则
5. triggers 是购买触发事件，用于判断时机
6. decisionUnit 定义采购决策单元中的角色
7. exclusionRules 用于过滤不符合条件的目标`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, companyProfile, evidences } = ctx;
    
    let prompt = '';
    
    // 企业画像上下文
    if (companyProfile) {
      prompt += formatCompanyProfileForPrompt(companyProfile);
    }
    
    // 证据上下文
    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }
    
    // 用户输入
    prompt += `
=== 任务要求 ===
请基于以上企业认知和证据，生成可执行的 Targeting Spec。

${input.icpName ? `ICP 名称：${input.icpName}` : ''}
${input.focusIndustries ? `重点行业：${(input.focusIndustries as string[]).join('、')}` : ''}
${input.focusRegions ? `重点区域：${(input.focusRegions as string[]).join('、')}` : ''}

请输出严格的 JSON 格式，包含：
1. 至少 1 个 segment（细分市场）
2. 每个 segment 包含完整的 firmographic、technographic、useCases、triggers
3. 明确的 exclusionRules（排除规则）
4. decisionUnit（决策单元角色定义）
5. 所有推断需注明是基于证据还是假设`;
    
    return prompt;
  },
};
