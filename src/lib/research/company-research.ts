// ==================== 客户背调服务 v2 ====================
// 整合MarketingSkills框架：competitor-alternatives + marketing-psychology

import { chatCompletion } from '@/lib/ai-client';

export interface CompanyResearch {
  // 公司概况
  overview: {
    businessType: string;        // 业务类型：制造商/分销商/服务商
    scale: string;               // 规模推断：小型/中型/大型
    marketPosition: string;      // 市场定位
    geographicFocus: string;     // 地理覆盖范围
  };

  // 行业分析
  industry: {
    primaryIndustry: string;     // 主行业
    subIndustries: string[];     // 子行业
    industryTrends: string[];    // 行业趋势
    regulatoryFactors: string[]; // 监管因素
  };

  // 竞争格局（增强版 - 基于competitor-alternatives）
  competition: {
    directCompetitors: string[];      // 直接竞争对手
    indirectCompetitors: string[];    // 间接竞争对手
    competitivePosition: string;      // 竞争地位
    differentiators: string[];        // 差异化因素
    vulnerabilities: string[];        // 潜在弱点
    switchingBarriers: string[];      // 切换壁垒（客户为何不换供应商）
    marketShare: string;              // 市场份额推断
  };

  // 潜在需求
  painPoints: {
    operational: string[];       // 运营痛点
    technical: string[];         // 技术痛点
    financial: string[];         // 财务痛点
    compliance: string[];        // 合规痛点
  };

  // 决策链推断
  decisionMakers: {
    primary: {                   // 主要决策者
      role: string;
      concerns: string[];
      kpis: string[];
    };
    secondary: {                 // 次要决策者
      role: string;
      concerns: string[];
    };
    influencers: string[];       // 影响者
  };

  // 推荐策略（增强版 - 整合marketing-psychology）
  outreachStrategy: {
    approach: string;            // 推荐接触方式
    valueProposition: string;    // 核心价值主张
    talkingPoints: string[];     // 关键谈资
    objections: string[];        // 可能异议及应对
    timing: string;              // 最佳接触时机
    // 心理学增强
    psychologicalHooks: string[];      // 心理触发点
    socialProofAngles: string[];       // 社会证明角度
    urgencyTriggers: string[];         // 紧迫感触发因素
    framingRecommendation: string;     // 框架建议
  };

  // 风险提示
  risks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };

  // 置信度
  confidence: number;            // 0-100
}

/**
 * 执行客户背调（增强版）
 */
export async function researchCompany(options: {
  companyName: string;
  website?: string;
  industry?: string;
  country?: string;
  description?: string;
  additionalContext?: string;
  tenantIndustry?: string;
  tenantProducts?: string;
}): Promise<{ success: boolean; data?: CompanyResearch; error?: string }> {
  const {
    companyName,
    website,
    industry,
    country,
    description,
    additionalContext,
    tenantIndustry,
    tenantProducts,
  } = options;

  const systemPrompt = `你是一位资深的B2B商业分析师和销售战略顾问。你的任务是对目标公司进行深度背调分析，为销售团队提供可执行的洞察。

【分析框架】
1. 公司概况 - 业务类型、规模、市场定位、地理覆盖
2. 行业分析 - 主行业、子行业、行业趋势、监管因素
3. 竞争格局 - 直接/间接竞争对手、竞争地位、差异化因素、切换壁垒
4. 潜在需求 - 运营/技术/财务/合规痛点
5. 决策链推断 - 主要决策者、次要决策者、影响者
6. 推荐策略 - 接触方式、价值主张、谈资、异议应对、心理学触发点
7. 风险评估 - 风险等级和因素

【竞争分析方法】
- 识别直接竞争对手（同类产品/服务）
- 识别间接竞争对手（替代方案）
- 分析切换壁垒（为什么客户不会轻易换供应商）
- 找出竞争对手的弱点和我方机会

【营销心理学原则】
- 损失厌恶：强调不行动的损失，而非行动的收益
- 社会证明：展示同行业成功案例
- 权威效应：引用行业数据和专业认证
- 稀缺性：真实的限时/限量机会
- 框架效应：正面表述 vs 负面表述的影响
- 锚定效应：先展示高价值方案，再展示标准方案
- 互惠原则：先提供价值，再请求行动

【输出要求】
- 基于有限信息进行合理推断，标注置信度
- 提供具体、可操作的建议，避免泛泛而谈
- 竞争分析要诚实，承认对手优势
- 心理学触发点要符合道德，不操纵
- 使用JSON格式输出`;

  const userPrompt = `请对以下公司进行深度背调分析：

【目标公司】
- 公司名称：${companyName}
- 网站：${website || '未知'}
- 行业：${industry || '未知'}
- 国家/地区：${country || '未知'}
- 简介：${description || '无'}
${additionalContext ? `- 补充信息：${additionalContext}` : ''}

【我方背景】
- 所在行业：${tenantIndustry || '涂装设备/工业自动化'}
- 产品/服务：${tenantProducts || '涂装设备、自动化解决方案'}

请输出JSON格式的背调报告，包含以下字段：
{
  "overview": {
    "businessType": "制造商/分销商/服务商等",
    "scale": "小型/中型/大型",
    "marketPosition": "市场定位描述",
    "geographicFocus": "地理覆盖范围"
  },
  "industry": {
    "primaryIndustry": "主行业",
    "subIndustries": ["子行业1", "子行业2"],
    "industryTrends": ["趋势1", "趋势2"],
    "regulatoryFactors": ["监管因素1"]
  },
  "competition": {
    "directCompetitors": ["直接竞争对手1", "直接竞争对手2"],
    "indirectCompetitors": ["间接竞争对手1"],
    "competitivePosition": "竞争地位描述",
    "differentiators": ["差异化因素1"],
    "vulnerabilities": ["潜在弱点1"],
    "switchingBarriers": ["切换壁垒1"],
    "marketShare": "市场份额推断"
  },
  "painPoints": {
    "operational": ["运营痛点1"],
    "technical": ["技术痛点1"],
    "financial": ["财务痛点1"],
    "compliance": ["合规痛点1"]
  },
  "decisionMakers": {
    "primary": {
      "role": "职位",
      "concerns": ["关注点1"],
      "kpis": ["KPI指标1"]
    },
    "secondary": {
      "role": "职位",
      "concerns": ["关注点1"]
    },
    "influencers": ["影响者角色1"]
  },
  "outreachStrategy": {
    "approach": "推荐接触方式",
    "valueProposition": "核心价值主张",
    "talkingPoints": ["谈资1", "谈资2", "谈资3"],
    "objections": ["异议及应对1"],
    "timing": "最佳接触时机",
    "psychologicalHooks": ["心理触发点1：如损失厌恶角度"],
    "socialProofAngles": ["社会证明角度1：如同行业案例"],
    "urgencyTriggers": ["紧迫感触发因素1"],
    "framingRecommendation": "框架建议：如何表述价值"
  },
  "risks": {
    "level": "low/medium/high",
    "factors": ["风险因素1"]
  },
  "confidence": 85
}`;

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

    // 解析JSON
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse research result' };
    }

    const data = JSON.parse(jsonMatch[0]) as CompanyResearch;

    return { success: true, data };
  } catch (error) {
    console.error('[researchCompany] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 生成背调摘要（用于列表展示）
 */
export function generateResearchSummary(research: CompanyResearch): string {
  const parts = [
    `${research.overview.businessType} | ${research.overview.scale}`,
    `痛点：${research.painPoints.operational.slice(0, 2).join('、')}`,
    `决策者：${research.decisionMakers.primary.role}`,
    `风险：${research.risks.level.toUpperCase()}`,
  ];
  return parts.join(' | ');
}
