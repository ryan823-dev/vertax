/**
 * 客户背景认知服务
 *
 * 在发送开发信之前，收集并生成客户背景摘要
 * 帮助制作针对性的个性化内容
 */

import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/ai-client";

// ==================== 类型定义 ====================

export interface CustomerProfile {
  // 基本信息
  companyName: string;
  industry?: string;
  location?: string;
  size?: string; // 规模
  website?: string;

  // 业务信息
  products?: string[];       // 主要产品
  services?: string[];       // 主要服务
  markets?: string[];        // 目标市场
  certifications?: string[]; // 资质认证

  // 近期动态
  recentNews?: string[];     // 最新动态
  projects?: string[];      // 项目/中标
  partnerships?: string[];    // 合作/扩张

  // 痛点推测
  potentialPainPoints?: string[]; // 基于行业的痛点

  // 联系方式
  contactName?: string;
  contactRole?: string;
  contactEmail?: string;
  phone?: string;

  // 数据来源
  dataSources: string[]; // 数据来源列表
  confidence: number;     // 数据完整度 0-1
}

export interface PersonalizedContent {
  // 邮件主题变体
  subjectOptions: string[];

  // 邮件开头（针对该公司定制）
  opening: string;

  // 谈资点（可提及的行业/公司特定信息）
  talkingPoints: string[];

  // 痛点共鸣（基于行业的痛点）
  painPointHooks: string[];

  // 个性化签名
  signature: string;

  // 建议的下一步行动
  suggestedCTA: string;

  // 生成建议
  generationNotes: string;
}

// ==================== 核心函数 ====================

/**
 * 获取客户背景画像
 */
export async function getCustomerProfile(
  candidateId: string,
  tenantId: string
): Promise<CustomerProfile | null> {
  // 获取候选人数据
  const candidate = await db.radarCandidate.findFirst({
    where: { id: candidateId, tenantId },
    select: {
      displayName: true,
      description: true,
      industry: true,
      country: true,
      city: true,
      website: true,
      email: true,
      phone: true,
      companySize: true,
      rawData: true,
    },
  });

  if (!candidate) {
    return null;
  }

  const rawData = (candidate.rawData || {}) as Record<string, unknown>;
  const profile: CustomerProfile = {
    companyName: candidate.displayName,
    industry: candidate.industry || undefined,
    location: [candidate.city, candidate.country].filter(Boolean).join(", ") || undefined,
    size: candidate.companySize || undefined,
    website: candidate.website || undefined,
    contactEmail: candidate.email || undefined,
    dataSources: [],
    confidence: 0.3, // 基础置信度
  };

  // 从 rawData 提取更多信息
  if (rawData.companyResearch) {
    const research = rawData.companyResearch as Record<string, unknown>;

    if (research.products) {
      profile.products = research.products as string[];
      profile.dataSources.push("公司研究");
    }
    if (research.services) {
      profile.services = research.services as string[];
    }
    if (research.markets) {
      profile.markets = research.markets as string[];
    }
    if (research.certifications) {
      profile.certifications = research.certifications as string[];
    }
    profile.confidence = Math.min(profile.confidence + 0.3, 1);
  }

  // 从公开数据获取
  if (rawData.publicData) {
    const publicData = rawData.publicData as Record<string, unknown>;
    if (publicData.recentNews) {
      profile.recentNews = publicData.recentNews as string[];
      profile.dataSources.push("公开新闻");
    }
    if (publicData.projects) {
      profile.projects = publicData.projects as string[];
      profile.dataSources.push("招标平台");
    }
    profile.confidence = Math.min(profile.confidence + 0.2, 1);
  }

  // 添加行业推断的痛点
  if (profile.industry) {
    profile.potentialPainPoints = getIndustryPainPoints(profile.industry);
    profile.dataSources.push("行业推断");
    profile.confidence = Math.min(profile.confidence + 0.2, 1);
  }

  return profile;
}

/**
 * 生成个性化内容
 */
export async function generatePersonalizedContent(
  profile: CustomerProfile,
  senderCompany: string,
  senderProduct: string
): Promise<PersonalizedContent> {
  const industryContext = profile.industry || "一般制造业";
  const companyContext = profile.companyName;

  // 构建提示词
  const prompt = `你是一位B2B外贸销售专家。基于以下客户信息，生成个性化的开发信内容：

【客户信息】
- 公司名: ${companyContext}
- 行业: ${industryContext}
- 地区: ${profile.location || "未知"}
- 主要产品: ${profile.products?.join(", ") || "未知"}
- 最近动态: ${profile.recentNews?.join(", ") || "未知"}
- 现有项目: ${profile.projects?.join(", ") || "未知"}

【我方信息】
- 我方公司: ${senderCompany}
- 我方产品: ${senderProduct}

请生成：
1. 3个不同角度的邮件主题选项
2. 定制化的邮件开头（引用对方公司特定信息）
3. 3-5个可以提及的谈资点
4. 2-3个痛点共鸣点
5. 建议的下一步行动

输出JSON格式，只包含内容，不要解释。`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: "你是一位专业的B2B外贸销售文案专家。" },
        { role: "user", content: prompt },
      ],
      { model: "qwen-plus", temperature: 0.6 }
    );

    // 解析结果
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        subjectOptions: parsed.subjectOptions || [],
        opening: parsed.opening || "",
        talkingPoints: parsed.talkingPoints || [],
        painPointHooks: parsed.painPointHooks || [],
        signature: `Best regards,\n${senderCompany} Team`,
        suggestedCTA: parsed.suggestedCTA || "期待您的回复",
        generationNotes: `基于 ${profile.dataSources.join(", ")} 生成，数据完整度 ${Math.round(profile.confidence * 100)}%`,
      };
    }
  } catch (error) {
    console.error("[generatePersonalizedContent] Error:", error);
  }

  // 降级方案：基于行业生成通用内容
  return generateFallbackContent(profile, senderCompany);
}

/**
 * 降级内容生成
 */
function generateFallbackContent(
  profile: CustomerProfile,
  senderCompany: string
): PersonalizedContent {
  const industry = profile.industry || "制造业";
  const company = profile.companyName;

  return {
    subjectOptions: [
      `${company} - 合作机会探讨`,
      `${industry}解决方案 - 专为${profile.location || "贵司"}设计`,
      `与${company}建立长期合作`,
    ],
    opening: `您好，${company}团队：\n\n了解到贵司在${industry}领域的发展，我司专注于为类似企业提供高效解决方案。`,
    talkingPoints: [
      `贵司所在${industry}的发展趋势`,
      "行业普遍面临的效率挑战",
      "我们如何帮助类似企业",
    ],
    painPointHooks: [
      "提高生产效率",
      "降低运营成本",
      "提升产品质量",
    ],
    signature: `Best regards,\n${senderCompany} Team`,
    suggestedCTA: "期待进一步交流",
    generationNotes: `基于行业推断生成，数据完整度 ${Math.round(profile.confidence * 100)}%`,
  };
}

/**
 * 获取行业常见痛点
 */
function getIndustryPainPoints(industry: string): string[] {
  const painPointMap: Record<string, string[]> = {
    制造业: ["人工成本上涨", "自动化升级需求", "产能效率瓶颈", "质量控制挑战"],
    化工业: ["环保合规压力", "安全生产要求", "原材料波动", "供应链稳定性"],
    医疗: ["合规认证复杂", "研发周期长", "市场准入门槛", "成本控制"],
    食品: ["食品安全监管", "保质期管理", "供应链全程追溯", "产品创新压力"],
    纺织: ["原材料成本", "环保压力", "交期控制", "个性化需求"],
    包装: ["材料创新", "环保要求", "成本控制", "快速交付"],
    物流: ["最后一公里", "仓储效率", "配送成本", "信息化水平"],
    建筑: ["工期控制", "材料成本", "质量安全", "合规管理"],
  };

  return painPointMap[industry] || ["效率提升", "成本优化", "质量保障", "交付能力"];
}

// ==================== 导出 ====================

export default {
  getCustomerProfile,
  generatePersonalizedContent,
};
