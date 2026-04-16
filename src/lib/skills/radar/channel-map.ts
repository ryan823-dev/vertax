import { z } from 'zod';
import type { SkillDefinition, PromptContext } from '../types';
import { formatEvidenceForPrompt } from '../evidence-loader';
import { SKILL_NAMES } from '../names';

// ==================== Input/Output Schemas ====================

const inputSchema = z.object({
  targetingSpec: z.record(z.string(), z.unknown()).describe('已生成的 Targeting Spec'),
  personaName: z.string().optional().describe('目标 Persona 名称'),
  focusRegions: z.array(z.string()).optional().describe('重点区域'),
});

// Channel types - 渠道类型枚举
const channelTypeEnum = z.enum([
  'maps',           // Google Maps / 地图搜索
  'tender',         // 招标信息 (RSS/JSON feed)
  'search',         // Web Search (Brave/Bing)
  'directory',      // 行业目录
  'tradeshow',      // 展会
  'hiring',         // 招聘信号
  'ecosystem',      // 生态伙伴
  'linkedin',       // LinkedIn
  'association',    // 行业协会
]);

// Discovery method schema
const discoveryMethodSchema = z.object({
  searchQueries: z.array(z.string()),
  filters: z.record(z.string(), z.unknown()).optional(),
  signalsToLookFor: z.array(z.string()),
  captureSchema: z.array(z.string()).optional(),
  apiEndpoint: z.string().optional(),
  rateLimit: z.string().optional(),
});

// Channel schema
const channelSchema = z.object({
  channelType: channelTypeEnum,
  name: z.string(),
  discoveryMethod: discoveryMethodSchema,
  expectedYield: z.enum(['low', 'medium', 'high']),
  dataToCapture: z.array(z.string()),
  complianceNotes: z.array(z.string()),
  priority: z.number().min(1).max(10).optional(),
});

// Output schema
const outputSchema = z.object({
  channelMap: z.object({
    forSegment: z.string(),
    forPersona: z.string(),
    channels: z.array(channelSchema),
    evidenceIds: z.array(z.string()),
    assumptions: z.array(z.string()),
    openQuestions: z.array(z.string()),
  }),
});

// ==================== Skill Definition ====================

export const channelMapSkill: SkillDefinition<typeof inputSchema, typeof outputSchema> = {
  name: SKILL_NAMES.RADAR_BUILD_CHANNEL_MAP,
  displayName: '生成渠道地图',
  engine: 'radar',
  outputEntityType: 'ChannelMap',
  inputSchema,
  outputSchema,
  suggestedNextSkills: [
    SKILL_NAMES.RADAR_PLAN_ACCOUNT_DISCOVERY,
  ],
  model: 'qwen-plus',
  temperature: 0.3,
  
  systemPrompt: `你是B2B获客研究负责人。基于Targeting Spec与Persona，生成"渠道地图 Channel Map"，用于持续发现目标公司与联系人。

## 输出格式要求
输出严格的JSON，包含以下结构：
{
  "channelMap": {
    "forSegment": "细分市场名称",
    "forPersona": "目标角色",
    "channels": [
      {
        "channelType": "maps|tender|search|directory|tradeshow|hiring|ecosystem|linkedin|association",
        "name": "渠道名称",
        "discoveryMethod": {
          "searchQueries": ["搜索查询1", "搜索查询2"],
          "filters": { "region": "China", "industry": "manufacturing" },
          "signalsToLookFor": ["公司有xx设备", "最近有xx需求"],
          "captureSchema": ["company_name", "website", "phone", "address"],
          "apiEndpoint": "可选的API端点",
          "rateLimit": "100/day"
        },
        "expectedYield": "low|medium|high",
        "dataToCapture": ["公司名", "网址", "联系方式"],
        "complianceNotes": ["注意事项1"],
        "priority": 8
      }
    ],
    "evidenceIds": ["引用的证据ID"],
    "assumptions": ["假设1"],
    "openQuestions": ["待确认问题1"]
  }
}

## 必须包含的渠道类型（至少5种）
1. **maps** - Google Maps / 百度地图搜索，用于发现本地企业
2. **tender** - 招标信息源（政府采购、企业招标RSS/JSON）
3. **search** - Web搜索（Brave/Bing API），关键词搜索
4. **directory** - 行业目录、黄页
5. **tradeshow** - 行业展会参展商列表
6. **hiring** - 招聘信号（LinkedIn Jobs/招聘网站）
7. **ecosystem** - 生态合作伙伴、供应商网络

## 关键规则
1. 每条渠道必须给出"可执行发现方法"：具体的搜索查询、筛选条件、观察信号
2. searchQueries 必须是可直接使用的搜索字符串
3. signalsToLookFor 是判断该公司是否符合目标的信号
4. 优先高产出渠道（expectedYield: high）
5. 注明合规注意事项（避免批量抓取、优先公开信息、保留来源链接）
6. 不得输出无法执行的空话`,
  
  buildUserPrompt: (ctx: PromptContext) => {
    const { input, evidences } = ctx;
    
    let prompt = '';
    
    if (evidences?.length) {
      prompt += formatEvidenceForPrompt(evidences);
    }
    
    prompt += `
=== 输入数据 ===
Targeting Spec: ${JSON.stringify(input.targetingSpec, null, 2)}
${input.personaName ? `目标 Persona: ${input.personaName}` : ''}
${input.focusRegions ? `重点区域: ${(input.focusRegions as string[]).join('、')}` : ''}

=== 任务要求 ===
请基于以上 Targeting Spec，生成可执行的渠道地图。

必须包含以下渠道类型：
1. maps - 地图搜索（Google Maps等）
2. tender - 招标信息
3. search - Web搜索  
4. directory - 行业目录
5. 至少再选1种：tradeshow/hiring/ecosystem/linkedin/association

每个渠道必须包含具体可执行的 searchQueries 和 signalsToLookFor。`;
    
    return prompt;
  },
};
