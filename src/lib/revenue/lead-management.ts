// ==================== RevOps 线索管理服务 ====================
// 整合MarketingSkills框架：revops最佳实践

import { prisma } from '@/lib/prisma';

// ==================== 线索生命周期定义 ====================

export type LeadStage =
  | 'SUBSCRIBER'    // 订阅者：只提供了邮箱，无其他信息
  | 'LEAD'          // 线索：有基本信息，未达标
  | 'MQL'           // 营销合格线索：符合画像+有互动
  | 'SQL'           // 销售合格线索：销售确认有需求
  | 'OPPORTUNITY'   // 商机：有明确项目
  | 'CUSTOMER'      // 客户：已成交
  | 'EVANGELIST';   // 推广者：愿意推荐/案例

export interface LeadStageDefinition {
  stage: LeadStage;
  entryCriteria: string;
  exitCriteria: string;
  owner: 'marketing' | 'sales' | 'customer_success';
  slaHours?: number;  // 响应SLA（小时）
}

export const LEAD_STAGES: LeadStageDefinition[] = [
  {
    stage: 'SUBSCRIBER',
    entryCriteria: '订阅内容（博客、通讯）',
    exitCriteria: '提供公司信息或展示互动',
    owner: 'marketing',
  },
  {
    stage: 'LEAD',
    entryCriteria: '有联系信息和基本公司信息',
    exitCriteria: '符合最低画像标准',
    owner: 'marketing',
  },
  {
    stage: 'MQL',
    entryCriteria: '画像分+互动分达标',
    exitCriteria: '销售接受或拒绝（48小时内）',
    owner: 'marketing',
    slaHours: 48,
  },
  {
    stage: 'SQL',
    entryCriteria: '销售通过对话确认需求',
    exitCriteria: '创建商机或退回培育',
    owner: 'sales',
    slaHours: 24,
  },
  {
    stage: 'OPPORTUNITY',
    entryCriteria: '预算、权限、需求、时间线确认',
    exitCriteria: '成交或失败',
    owner: 'sales',
  },
  {
    stage: 'CUSTOMER',
    entryCriteria: '成交',
    exitCriteria: '扩展、续约或流失',
    owner: 'customer_success',
  },
  {
    stage: 'EVANGELIST',
    entryCriteria: '高NPS、推荐活动、案例参与',
    exitCriteria: '持续参与项目',
    owner: 'customer_success',
  },
];

// ==================== 线索评分系统 ====================

export interface LeadScore {
  fitScore: number;        // 画像分（0-100）：他们是谁
  engagementScore: number; // 互动分（0-100）：他们做了什么
  totalScore: number;      // 总分
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  reasons: string[];       // 评分原因
  negatives: string[];     // 负面因素
}

export interface ScoringRule {
  factor: string;
  points: number;
  category: 'fit' | 'engagement' | 'negative';
  description: string;
}

// 默认评分规则（可被租户自定义覆盖）
export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  // === 画像分（Fit） ===
  { factor: 'industry_match', points: 20, category: 'fit', description: '行业匹配目标行业' },
  { factor: 'company_size_fit', points: 15, category: 'fit', description: '公司规模符合ICP' },
  { factor: 'role_decision_maker', points: 20, category: 'fit', description: '决策者角色' },
  { factor: 'role_influencer', points: 10, category: 'fit', description: '影响者角色' },
  { factor: 'geography_target', points: 10, category: 'fit', description: '目标市场地区' },
  { factor: 'tech_stack_match', points: 5, category: 'fit', description: '技术栈匹配' },

  // === 互动分（Engagement） ===
  { factor: 'website_visit', points: 5, category: 'engagement', description: '访问网站' },
  { factor: 'pricing_page_visit', points: 15, category: 'engagement', description: '访问定价页' },
  { factor: 'demo_request', points: 25, category: 'engagement', description: '请求演示' },
  { factor: 'content_download', points: 10, category: 'engagement', description: '下载内容' },
  { factor: 'email_open', points: 2, category: 'engagement', description: '打开邮件' },
  { factor: 'email_click', points: 5, category: 'engagement', description: '点击邮件链接' },
  { factor: 'webinar_attend', points: 15, category: 'engagement', description: '参加网络研讨会' },

  // === 负面分 ===
  { factor: 'competitor_domain', points: -50, category: 'negative', description: '竞争对手邮箱' },
  { factor: 'student_personal_email', points: -20, category: 'negative', description: '学生/个人邮箱' },
  { factor: 'unsubscribe', points: -30, category: 'negative', description: '取消订阅' },
  { factor: 'job_title_mismatch', points: -15, category: 'negative', description: '职位不匹配（实习生等）' },
];

/**
 * 计算线索评分
 */
export function calculateLeadScore(options: {
  // 画像属性
  industry?: string;
  targetIndustries?: string[];
  companySize?: 'small' | 'medium' | 'large' | 'enterprise';
  targetCompanySizes?: ('small' | 'medium' | 'large' | 'enterprise')[];
  role?: string;
  geography?: string;
  targetGeographies?: string[];

  // 互动行为
  pageVisits?: string[];
  contentDownloads?: number;
  emailOpens?: number;
  emailClicks?: number;
  webinarAttendance?: number;
  demoRequested?: boolean;

  // 负面信号
  emailDomain?: string;
  competitorDomains?: string[];
  isPersonalEmail?: boolean;
  unsubscribed?: boolean;
}): LeadScore {
  const {
    industry,
    targetIndustries = [],
    companySize,
    targetCompanySizes = [],
    role,
    geography,
    targetGeographies = [],
    pageVisits = [],
    contentDownloads = 0,
    emailOpens = 0,
    emailClicks = 0,
    webinarAttendance = 0,
    demoRequested = false,
    emailDomain,
    competitorDomains = [],
    isPersonalEmail = false,
    unsubscribed = false,
  } = options;

  let fitScore = 0;
  let engagementScore = 0;
  const reasons: string[] = [];
  const negatives: string[] = [];

  // === 计算画像分 ===
  if (industry && targetIndustries.some(i => industry.toLowerCase().includes(i.toLowerCase()))) {
    fitScore += 20;
    reasons.push(`行业匹配: ${industry}`);
  }

  if (companySize && targetCompanySizes.includes(companySize)) {
    fitScore += 15;
    reasons.push(`公司规模符合: ${companySize}`);
  }

  if (role) {
    const roleLower = role.toLowerCase();
    if (['ceo', 'cto', 'cfo', 'vp', 'director', '总经理', '总监'].some(r => roleLower.includes(r))) {
      fitScore += 20;
      reasons.push(`决策者角色: ${role}`);
    } else if (['manager', 'lead', '经理', '主管'].some(r => roleLower.includes(r))) {
      fitScore += 10;
      reasons.push(`影响者角色: ${role}`);
    }
  }

  if (geography && targetGeographies.some(g => geography.toLowerCase().includes(g.toLowerCase()))) {
    fitScore += 10;
    reasons.push(`目标市场: ${geography}`);
  }

  // === 计算互动分 ===
  const pricingVisits = pageVisits.filter(p => p.includes('pricing') || p.includes('价格')).length;
  if (pricingVisits > 0) {
    engagementScore += 15 * Math.min(pricingVisits, 2); // 最多2次
    reasons.push(`访问定价页 ${pricingVisits} 次`);
  }

  const otherVisits = pageVisits.length - pricingVisits;
  engagementScore += Math.min(otherVisits * 2, 10); // 每次访问2分，最多10分

  if (contentDownloads > 0) {
    engagementScore += Math.min(contentDownloads * 5, 20);
    reasons.push(`下载内容 ${contentDownloads} 次`);
  }

  if (emailOpens > 0) {
    engagementScore += Math.min(emailOpens * 2, 10);
  }

  if (emailClicks > 0) {
    engagementScore += Math.min(emailClicks * 5, 15);
    reasons.push(`点击邮件链接 ${emailClicks} 次`);
  }

  if (webinarAttendance > 0) {
    engagementScore += 15;
    reasons.push(`参加网络研讨会`);
  }

  if (demoRequested) {
    engagementScore += 25;
    reasons.push(`请求演示`);
  }

  // === 负面分 ===
  if (emailDomain && competitorDomains.some(d => emailDomain.includes(d))) {
    fitScore -= 50;
    negatives.push(`竞争对手邮箱域名: ${emailDomain}`);
  }

  if (isPersonalEmail) {
    fitScore -= 20;
    negatives.push(`个人邮箱`);
  }

  if (unsubscribed) {
    engagementScore = 0;
    negatives.push(`已取消订阅`);
  }

  // === 计算总分和等级 ===
  const totalScore = Math.max(0, Math.min(100, fitScore + engagementScore));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (totalScore >= 70) grade = 'A';
  else if (totalScore >= 50) grade = 'B';
  else if (totalScore >= 30) grade = 'C';
  else if (totalScore >= 10) grade = 'D';
  else grade = 'F';

  return {
    fitScore: Math.max(0, fitScore),
    engagementScore: Math.max(0, engagementScore),
    totalScore,
    grade,
    reasons,
    negatives,
  };
}

/**
 * 判断是否为MQL
 * MQL需要：画像分>=30 且 互动分>=20
 */
export function isMQL(score: LeadScore): boolean {
  return score.fitScore >= 30 && score.engagementScore >= 20;
}

/**
 * 判断是否为SQL
 * SQL需要：MQL + 演示请求或高互动
 */
export function isSQL(score: LeadScore): boolean {
  return isMQL(score) && (score.engagementScore >= 40);
}

// ==================== 线索路由 ====================

export interface RoutingRule {
  name: string;
  conditions: {
    industries?: string[];
    geographies?: string[];
    companySizes?: ('small' | 'medium' | 'large' | 'enterprise')[];
    minScore?: number;
  };
  assignTo: string;  // 销售人员ID
  priority: number;  // 优先级（数字越小越优先）
}

/**
 * 根据路由规则分配线索
 */
export function routeLead(options: {
  leadId: string;
  industry?: string;
  geography?: string;
  companySize?: 'small' | 'medium' | 'large' | 'enterprise';
  score: LeadScore;
  routingRules: RoutingRule[];
}): string | null {
  const { industry, geography, companySize, score, routingRules } = options;

  // 按优先级排序
  const sortedRules = [...routingRules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const { conditions } = rule;

    // 检查行业
    if (conditions.industries?.length && industry) {
      if (!conditions.industries.some(i => industry.toLowerCase().includes(i.toLowerCase()))) {
        continue;
      }
    }

    // 检查地区
    if (conditions.geographies?.length && geography) {
      if (!conditions.geographies.some(g => geography.toLowerCase().includes(g.toLowerCase()))) {
        continue;
      }
    }

    // 检查公司规模
    if (conditions.companySizes?.length && companySize) {
      if (!conditions.companySizes.includes(companySize)) {
        continue;
      }
    }

    // 检查分数
    if (conditions.minScore && score.totalScore < conditions.minScore) {
      continue;
    }

    return rule.assignTo;
  }

  return null; // 无匹配规则
}

// ==================== MQL → SQL 转交SLA ====================

export interface SLAStatus {
  stage: LeadStage;
  enteredAt: Date;
  slaDeadline: Date;
  isOverdue: boolean;
  hoursRemaining: number;
}

/**
 * 计算SLA状态
 */
export function calculateSLAStatus(options: {
  stage: LeadStage;
  enteredAt: Date;
}): SLAStatus | null {
  const { stage, enteredAt } = options;

  const stageDef = LEAD_STAGES.find(s => s.stage === stage);
  if (!stageDef?.slaHours) {
    return null;
  }

  const slaDeadline = new Date(enteredAt.getTime() + stageDef.slaHours * 60 * 60 * 1000);
  const now = new Date();
  const hoursRemaining = Math.round((slaDeadline.getTime() - now.getTime()) / (60 * 60 * 1000));

  return {
    stage,
    enteredAt,
    slaDeadline,
    isOverdue: hoursRemaining < 0,
    hoursRemaining,
  };
}
