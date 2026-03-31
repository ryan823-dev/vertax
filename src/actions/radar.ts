"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiClient } from "@/lib/ai-client";

// ===================== Types =====================

export type LeadData = {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  companySize: string | null;
  status: string;
  priority: string;
  researchData: LeadResearchData;
  notes: string | null;
  lastContactedAt: Date | null;
  createdAt: Date;
};

export type LeadResearchData = {
  score?: number;
  scoreBreakdown?: {
    industryMatch: number;
    regionMatch: number;
    sizeMatch: number;
    signalStrength: number;
  };
  matchedICP?: {
    industries: string[];
    regions: string[];
    buyerRole?: string;
  };
  signals?: {
    type: string;
    description: string;
    source?: string;
  }[];
  aiSummary?: string;
  researchedAt?: string;
};

export type RadarStats = {
  totalLeads: number;
  highIntent: number;
  pendingFollowUp: number;
  thisWeek: number;
};

export type ICPData = {
  targetIndustries: string[];
  targetRegions: string[];
  buyerPersonas: Array<{
    role: string;
    title?: string;
    concerns?: string[];
  }>;
  painPoints: Array<{
    pain: string;
    howWeHelp: string;
  }>;
};

// ===================== Get ICP from Knowledge Engine =====================

export async function getICP(): Promise<ICPData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return null;
  const tenantId = user!.tenantId as string;

  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId: tenantId },
    select: {
      targetIndustries: true,
      targetRegions: true,
      buyerPersonas: true,
      painPoints: true,
    },
  });

  if (!profile) return null;

  return {
    targetIndustries: (profile.targetIndustries as string[]) || [],
    targetRegions: (profile.targetRegions as string[]) || [],
    buyerPersonas: (profile.buyerPersonas as ICPData['buyerPersonas']) || [],
    painPoints: (profile.painPoints as ICPData['painPoints']) || [],
  };
}

// ===================== Get Leads =====================

export async function getLeads(): Promise<LeadData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return [];
  const tenantId = user!.tenantId as string;

  const leads = await prisma.lead.findMany({
    where: {
      tenantId: tenantId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return leads.map((lead) => ({
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    country: lead.country,
    city: lead.city,
    industry: lead.industry,
    companySize: lead.companySize,
    status: lead.status,
    priority: lead.priority,
    researchData: lead.researchData as LeadResearchData,
    notes: lead.notes,
    lastContactedAt: lead.lastContactedAt,
    createdAt: lead.createdAt,
  }));
}

// ===================== Get Stats =====================

export async function getRadarStats(): Promise<RadarStats> {
  const session = await auth();
  if (!session?.user?.id) {
    return { totalLeads: 0, highIntent: 0, pendingFollowUp: 0, thisWeek: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) {
    return { totalLeads: 0, highIntent: 0, pendingFollowUp: 0, thisWeek: 0 };
  }
  const tenantId = user!.tenantId as string;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [total, highIntent, pending, thisWeek] = await Promise.all([
    prisma.lead.count({
      where: { tenantId: tenantId, deletedAt: null },
    }),
    prisma.lead.count({
      where: {
        tenantId: tenantId,
        deletedAt: null,
        priority: "high",
      },
    }),
    prisma.lead.count({
      where: {
        tenantId: tenantId,
        deletedAt: null,
        status: "pending",
      },
    }),
    prisma.lead.count({
      where: {
        tenantId: tenantId,
        deletedAt: null,
        createdAt: { gte: oneWeekAgo },
      },
    }),
  ]);

  return {
    totalLeads: total,
    highIntent: highIntent,
    pendingFollowUp: pending,
    thisWeek: thisWeek,
  };
}

// ===================== AI Research =====================

export async function runAIResearch(query: string): Promise<LeadData[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, id: true },
  });
  if (!user) {
    throw new Error("用户不存在");
  }
  const tenantId = user!.tenantId as string;

  // 获取ICP数据
  const icp = await getICP();
  
  // 构建AI调研prompt
  const systemPrompt = `你是一个专业的B2B销售线索调研助手。
你的任务是根据用户的查询和ICP（理想客户画像）数据，生成符合条件的潜在客户列表。

${icp ? `
用户的ICP画像：
- 目标行业：${icp.targetIndustries.join('、') || '未指定'}
- 目标地区：${icp.targetRegions.join('、') || '未指定'}
- 目标买家角色：${icp.buyerPersonas.map(p => p.role).join('、') || '未指定'}
- 客户痛点：${icp.painPoints.map(p => p.pain).join('、') || '未指定'}
` : '用户尚未设置ICP画像，请基于查询条件生成通用结果。'}

请生成3-5个虚拟但符合真实业务场景的潜在客户数据。
每个客户必须包含：
1. 公司名称（真实感强的企业名）
2. 行业
3. 地区（国家/城市）
4. 公司规模
5. 潜在联系人姓名和职位
6. 邮箱（格式合理的虚拟邮箱）
7. 网站
8. 匹配分数（0-100，基于与ICP的匹配度）
9. 匹配说明

请以JSON数组格式返回，格式如下：
[{
  "companyName": "公司名",
  "industry": "行业",
  "country": "国家",
  "city": "城市",
  "companySize": "规模(如 50-200人)",
  "contactName": "联系人姓名",
  "contactTitle": "职位",
  "email": "email@example.com",
  "website": "https://example.com",
  "score": 85,
  "matchReason": "匹配原因说明",
  "signals": ["购买信号1", "购买信号2"]
}]

只返回JSON数组，不要有其他文字。`;

  const userPrompt = `请根据以下查询调研潜在客户：${query}`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "deepseek-v3",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI未返回结果");
    }

    // 解析JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("AI返回格式错误");
    }

    const leadsData = JSON.parse(jsonMatch[0]) as Array<{
      companyName: string;
      industry: string;
      country: string;
      city: string;
      companySize: string;
      contactName: string;
      contactTitle: string;
      email: string;
      website: string;
      score: number;
      matchReason: string;
      signals: string[];
    }>;

    // 批量创建线索
    const createdLeads: LeadData[] = [];
    
    for (const data of leadsData) {
      const researchData: LeadResearchData = {
        score: data.score,
        scoreBreakdown: {
          industryMatch: Math.round(data.score * 0.3),
          regionMatch: Math.round(data.score * 0.2),
          sizeMatch: Math.round(data.score * 0.2),
          signalStrength: Math.round(data.score * 0.3),
        },
        matchedICP: {
          industries: icp?.targetIndustries.filter(i => 
            data.industry.includes(i) || i.includes(data.industry)
          ) || [],
          regions: icp?.targetRegions.filter(r => 
            data.country.includes(r) || data.city.includes(r)
          ) || [],
        },
        signals: data.signals.map(s => ({
          type: "buying_signal",
          description: s,
          source: "AI调研",
        })),
        aiSummary: data.matchReason,
        researchedAt: new Date().toISOString(),
      };

      const lead = await prisma.lead.create({
        data: {
          tenantId: tenantId,
          ownerId: user.id,
          companyName: data.companyName,
          contactName: data.contactName,
          email: data.email,
          website: data.website,
          country: data.country,
          city: data.city,
          industry: data.industry,
          companySize: data.companySize,
          status: "new",
          priority: data.score >= 80 ? "high" : data.score >= 60 ? "medium" : "low",
          researchData: researchData,
          notes: `AI调研生成 - ${data.contactTitle}`,
        },
      });

      createdLeads.push({
        id: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        country: lead.country,
        city: lead.city,
        industry: lead.industry,
        companySize: lead.companySize,
        status: lead.status,
        priority: lead.priority,
        researchData: researchData,
        notes: lead.notes,
        lastContactedAt: lead.lastContactedAt,
        createdAt: lead.createdAt,
      });
    }

    return createdLeads;
  } catch (error) {
    console.error("AI调研失败:", error);
    throw new Error(`AI调研失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

// ===================== Update Lead Status =====================

export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<LeadData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return null;
  const tenantId = user!.tenantId as string;

  const lead = await prisma.lead.update({
    where: {
      id: leadId,
      tenantId: tenantId,
    },
    data: {
      status,
      lastContactedAt: status === "contacted" ? new Date() : undefined,
    },
  });

  return {
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    country: lead.country,
    city: lead.city,
    industry: lead.industry,
    companySize: lead.companySize,
    status: lead.status,
    priority: lead.priority,
    researchData: lead.researchData as LeadResearchData,
    notes: lead.notes,
    lastContactedAt: lead.lastContactedAt,
    createdAt: lead.createdAt,
  };
}

// ===================== Delete Lead =====================

export async function deleteLead(leadId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (!user) return false;
  const tenantId = user!.tenantId as string;

  await prisma.lead.update({
    where: {
      id: leadId,
      tenantId: tenantId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return true;
}
