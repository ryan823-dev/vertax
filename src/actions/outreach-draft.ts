'use server';

/**
 * 外联草稿生成 Server Actions
 *
 * - generateOutreachDraft: 根据候选的 matchReasons + approachAngle + CompanyProfile 生成个性化开发信草稿
 * - sendOutreachDraft: 确认草稿后发送邮件，写 OutreachRecord
 * - enrichCandidateNow: 手动立即触发候选情报丰富化（P3）
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { chatCompletion } from '@/lib/ai-client';
import { sendEmail } from '@/lib/email/resend-client';
import { enrichWithSignalScore } from '@/lib/radar/intelligence-enricher';

// ==================== 类型 ====================

export interface OutreachDraft {
  subject: string;
  body: string;
  toEmail: string;
  toName: string;
  candidateId: string;
}

export interface DraftGenerateResult {
  success: boolean;
  draft?: OutreachDraft;
  error?: string;
}

export interface DraftSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ==================== 生成草稿 ====================

export async function generateOutreachDraft(
  candidateId: string,
  overrideEmail?: string
): Promise<DraftGenerateResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { success: false, error: 'Unauthorized' };

  const tenantId = session.user.tenantId;

  // 加载候选数据
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId, tenantId },
  });
  if (!candidate) return { success: false, error: '候选不存在' };

  const toEmail = overrideEmail || candidate.email;
  if (!toEmail) return { success: false, error: '该候选没有邮箱地址' };

  // 加载 CompanyProfile（我方背景）
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { tenantId },
    select: {
      companyName: true,
      companyIntro: true,
      coreProducts: true,
      techAdvantages: true,
      differentiators: true,
      painPoints: true,
    },
  });

  // 从 aiRelevance 提取 AI 评估依据
  const rel = candidate.aiRelevance as {
    tier?: string;
    matchReasons?: string[];
    approachAngle?: string;
  } | null;

  // 从 rawData 提取情报（决策者等）
  const raw = candidate.rawData as {
    intelligence?: {
      contacts?: {
        decisionMakers?: Array<{ name: string; title: string; email?: string }>;
      };
    };
  } | null;
  const firstContact = raw?.intelligence?.contacts?.decisionMakers?.[0];

  // 构建 AI Prompt
  const ourCompany = companyProfile?.companyName || '我司';
  const ourProducts = (companyProfile?.coreProducts as Array<{ name: string; description: string }> | null)
    ?.slice(0, 2).map(p => p.name).join('、') || '核心产品';
  const ourAdvantages = (companyProfile?.differentiators as Array<{ point: string }> | null)
    ?.slice(0, 3).map(d => d.point).join('；') || '';

  const prompt = `你是一位专业的 B2B 外贸业务开发专家，帮助中国出海企业撰写高质量的英文开发信。

【我方背景】
- 公司：${ourCompany}
- 核心产品：${ourProducts}
- 差异化优势：${ourAdvantages}

【目标客户】
- 公司名称：${candidate.displayName}
- 国家/地区：${candidate.buyerCountry || candidate.country || '未知'}
- 行业：${candidate.industry || '未知'}
- AI 评级：Tier ${rel?.tier || 'B'}
${rel?.matchReasons?.length ? `- 匹配理由：${rel.matchReasons.join('；')}` : ''}
${rel?.approachAngle ? `- 推荐接触角度：${rel.approachAngle}` : ''}
${firstContact ? `- 决策者：${firstContact.name}（${firstContact.title}）` : ''}

【要求】
1. 语言：英文，专业且简洁，不超过 200 词
2. 结构：
   - 开场白（1句）：结合"推荐接触角度"或匹配理由，体现你了解他们
   - 价值主张（2-3句）：说明我们能帮他们解决什么问题，引用我们的核心优势
   - CTA（1句）：邀请 15 分钟电话或请求回复
3. 主题行：简短有力，不超过 60 字符，避免垃圾邮件关键词
4. 称呼：使用 ${firstContact?.name ? `Hi ${firstContact.name.split(' ')[0]},` : 'Dear [Name],'}
5. 签名：仅写 [Your Name]，不用填具体人名

只输出 JSON，格式严格如下，不要包含任何额外说明：
{
  "subject": "邮件主题（英文）",
  "body": "邮件正文（英文，保留换行符）"
}`;

  try {
    const aiResp = await chatCompletion(
      [{ role: 'user', content: prompt }],
      { model: 'qwen-plus', temperature: 0.7 }
    );

    const cleaned = aiResp.content.trim().replace(/^```json\s*/m, '').replace(/```\s*$/m, '');
    const parsed = JSON.parse(cleaned) as { subject: string; body: string };

    return {
      success: true,
      draft: {
        subject: parsed.subject,
        body: parsed.body,
        toEmail,
        toName: firstContact?.name || candidate.displayName,
        candidateId,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `AI 生成失败：${err instanceof Error ? err.message : '未知错误'}`,
    };
  }
}

// ==================== 发送草稿 ====================

export async function sendOutreachDraft(draft: OutreachDraft): Promise<DraftSendResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { success: false, error: 'Unauthorized' };

  const tenantId = session.user.tenantId;

  // 验证候选归属
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: draft.candidateId, tenantId },
    select: { id: true },
  });
  if (!candidate) return { success: false, error: '候选不存在或无权访问' };

  // 发送邮件
  const sendResult = await sendEmail({
    to: draft.toEmail,
    tenantId,
    subject: draft.subject,
    html: draft.body.replace(/\n/g, '<br>'),
  });

  if (!sendResult.success) {
    return { success: false, error: sendResult.error || '发送失败' };
  }

  // 写 OutreachRecord
  await prisma.outreachRecord.create({
    data: {
      tenantId,
      candidateId: draft.candidateId,
      toEmail: draft.toEmail,
      toName: draft.toName,
      subject: draft.subject,
      bodyText: draft.body,
      messageId: sendResult.messageId,
      status: 'sent',
      sentAt: new Date(),
    },
  });

  return { success: true, messageId: sendResult.messageId };
}

// ==================== 手动立即丰富化（P3）====================

export async function enrichCandidateNow(candidateId: string): Promise<{
  success: boolean;
  error?: string;
  signalScore?: number;
}> {
  const session = await auth();
  if (!session?.user?.tenantId) return { success: false, error: 'Unauthorized' };

  const tenantId = session.user.tenantId;

  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId, tenantId },
    select: { id: true },
  });
  if (!candidate) return { success: false, error: '候选不存在' };

  try {
    const result = await enrichWithSignalScore(candidateId);
    return {
      success: result.enrichment.success,
      signalScore: result.signals.overallScore,
      error: result.enrichment.errors.length > 0 ? result.enrichment.errors.join('; ') : undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '丰富化失败',
    };
  }
}

// ==================== LinkedIn DM 草稿生成（P6）====================

export interface LinkedInDraft {
  message: string;      // DM 正文，≤300 字符
  candidateId: string;
  linkedInUrl: string;  // 目标决策者 LinkedIn 主页
  toName: string;
}

export interface LinkedInDraftResult {
  success: boolean;
  draft?: LinkedInDraft;
  error?: string;
}

/**
 * 生成 LinkedIn DM 草稿
 * 语气比邮件更轻松，≤300 字符，无主题行
 */
export async function generateLinkedInDraft(
  candidateId: string,
  linkedInUrl: string,
): Promise<LinkedInDraftResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { success: false, error: 'Unauthorized' };

  const tenantId = session.user.tenantId;

  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId, tenantId },
  });
  if (!candidate) return { success: false, error: '候选不存在' };

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { tenantId },
    select: { companyName: true, coreProducts: true, differentiators: true },
  });

  const rel = candidate.aiRelevance as {
    tier?: string;
    matchReasons?: string[];
    approachAngle?: string;
  } | null;

  const raw = candidate.rawData as {
    intelligence?: {
      contacts?: {
        decisionMakers?: Array<{ name: string; title: string; linkedIn?: string }>;
      };
    };
  } | null;

  // 优先找 linkedInUrl 匹配的决策者，否则用第一个
  const dm = raw?.intelligence?.contacts?.decisionMakers?.find(
    p => p.linkedIn === linkedInUrl
  ) || raw?.intelligence?.contacts?.decisionMakers?.[0];

  const ourCompany = companyProfile?.companyName || 'our company';
  const ourProducts = (companyProfile?.coreProducts as Array<{ name: string }> | null)
    ?.slice(0, 1).map(p => p.name).join('') || 'our products';
  const advantage = (companyProfile?.differentiators as Array<{ point: string }> | null)
    ?.[0]?.point || '';
  const firstName = dm?.name?.split(' ')[0] || 'there';

  const prompt = `You are a B2B sales expert. Write a LinkedIn DM for cold outreach. It must be:
- Under 300 characters (hard limit)
- Casual and human, NOT salesy
- One clear hook referencing why this company is relevant
- End with a soft question (not "let's hop on a call")

Sender: ${ourCompany}, sells ${ourProducts}${advantage ? `. Key edge: ${advantage}` : ''}
Recipient: ${firstName}, ${dm?.title || 'decision maker'} at ${candidate.displayName} (${candidate.industry || 'B2B'})
${rel?.approachAngle ? `Approach angle: ${rel.approachAngle}` : ''}

Output ONLY the message text, nothing else. No subject, no greeting label, start directly with "Hi ${firstName}".`;

  try {
    const aiResp = await chatCompletion(
      [{ role: 'user', content: prompt }],
      { model: 'qwen-plus', temperature: 0.8 }
    );

    let message = aiResp.content.trim();
    // 强制截断到 300 字符（保留完整最后一句）
    if (message.length > 300) {
      message = message.slice(0, 297) + '...';
    }

    return {
      success: true,
      draft: {
        message,
        candidateId,
        linkedInUrl,
        toName: dm?.name || candidate.displayName,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `AI 生成失败：${err instanceof Error ? err.message : '未知错误'}`,
    };
  }
}

/**
 * 记录 LinkedIn DM 已复制（用户手动发送后算作已外联）
 */
export async function recordLinkedInCopy(
  candidateId: string,
  linkedInUrl: string,
  messageText: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { success: false, error: 'Unauthorized' };

  const tenantId = session.user.tenantId;

  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId, tenantId },
    select: { id: true, profileId: true },
  });
  if (!candidate) return { success: false, error: '候选不存在' };

  await prisma.outreachRecord.create({
    data: {
      tenantId,
      candidateId,
      profileId: candidate.profileId,
      channel: 'linkedin',
      toEmail: linkedInUrl,   // LinkedIn 场景复用 toEmail 存 profileUrl
      toName: null,
      subject: 'LinkedIn DM',
      bodyText: messageText,
      status: 'draft_copied',
      sentAt: new Date(),     // 复制即视为外联时间
    },
  });

  return { success: true };
}

// ==================== 外联记录查询（P4）====================

export interface OutreachRecordItem {
  id: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  status: string;
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  candidateId: string | null;
  candidateName: string | null;
  candidateCountry: string | null;
}

export interface OutreachStats {
  total: number;
  sent: number;
  opened: number;
  replied: number;
  noResponse: number; // 发送 7 天后未打开
  openRate: number;
  replyRate: number;
  avgReplyDays: number | null; // 平均回复天数，null 表示暂无数据
}

export async function getOutreachRecords(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  filter?: 'all' | 'noResponse' | 'replied' | 'pending'; // pending = 已发送未回复
}): Promise<{ records: OutreachRecordItem[]; stats: OutreachStats; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  const tenantId = session.user.tenantId;
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 构建列表查询条件（含 filter）
  const where: Record<string, unknown> = { tenantId };
  if (options?.status) where.status = options.status;
  const filter = options?.filter || 'all';
  if (filter === 'noResponse') {
    where.sentAt = { lt: sevenDaysAgo };
    where.openedAt = null;
  } else if (filter === 'replied') {
    where.status = 'replied';
  } else if (filter === 'pending') {
    // 已发送但未回复（含打开未回复）
    where.sentAt = { not: null };
    where.status = { notIn: ['replied', 'bounced'] };
  }

  const [rawRecords, total] = await Promise.all([
    prisma.outreachRecord.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.outreachRecord.count({ where }),
  ]);

  // 补全 candidate 名称
  const candidateIds = rawRecords
    .map(r => r.candidateId)
    .filter((id): id is string => id != null);

  const candidates =
    candidateIds.length > 0
      ? await prisma.radarCandidate.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, displayName: true, buyerCountry: true, country: true },
        })
      : [];

  const candidateMap = new Map(candidates.map(c => [c.id, c]));

  const records: OutreachRecordItem[] = rawRecords.map(r => {
    const c = r.candidateId ? candidateMap.get(r.candidateId) : null;
    return {
      id: r.id,
      toEmail: r.toEmail,
      toName: r.toName,
      subject: r.subject,
      status: r.status,
      sentAt: r.sentAt,
      openedAt: r.openedAt,
      clickedAt: r.clickedAt,
      candidateId: r.candidateId,
      candidateName: c?.displayName || null,
      candidateCountry: c?.buyerCountry || c?.country || null,
    };
  });

  // 全量统计（不受 filter 影响）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- repliedAt added in migration, Prisma client stale
  const allRecords: Array<{ status: string; sentAt: Date | null; openedAt: Date | null; repliedAt: Date | null }> = await (prisma.outreachRecord as any).findMany({
    where: { tenantId },
    select: { status: true, sentAt: true, openedAt: true, repliedAt: true },
  });

  const totalCount = allRecords.length;
  const sentCount = allRecords.filter(r => r.sentAt).length;
  const openedCount = allRecords.filter(r => r.openedAt).length;
  const repliedCount = allRecords.filter(r => r.status === 'replied').length;
  const noResponseCount = allRecords.filter(
    r => r.sentAt && !r.openedAt && r.sentAt < sevenDaysAgo
  ).length;

  // 平均回复天数（有 sentAt 和 repliedAt 的记录）
  const repliedRecords = allRecords.filter(r => r.sentAt && r.repliedAt);
  let avgReplyDays: number | null = null;
  if (repliedRecords.length > 0) {
    const totalDays = repliedRecords.reduce((sum, r) => {
      const diff = (r.repliedAt!.getTime() - r.sentAt!.getTime()) / (1000 * 60 * 60 * 24);
      return sum + diff;
    }, 0);
    avgReplyDays = Math.round((totalDays / repliedRecords.length) * 10) / 10;
  }

  const stats: OutreachStats = {
    total: totalCount,
    sent: sentCount,
    opened: openedCount,
    replied: repliedCount,
    noResponse: noResponseCount,
    openRate: sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0,
    replyRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0,
    avgReplyDays,
  };

  return { records, stats, total };
}

// ==================== 手动外联记录（WhatsApp / Phone）====================

export async function recordManualOutreach(params: {
  companyId: string;
  contactId?: string;
  channel: 'whatsapp' | 'phone' | 'linkedin';
  toPhone?: string;
  toName?: string;
  messageText?: string;
  callResult?: string;
}): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { success: false, error: 'Unauthorized' };

  const tenantId = session.user.tenantId;

  // 验证公司存在
  const company = await prisma.prospectCompany.findUnique({
    where: { id: params.companyId, tenantId },
    select: { id: true, name: true, sourceCandidateId: true },
  });
  if (!company) return { success: false, error: '公司不存在' };

  // 查找关联的候选
  const candidateId = company.sourceCandidateId || null;
  let profileId: string | null = null;
  if (candidateId) {
    const candidate = await prisma.radarCandidate.findUnique({
      where: { id: candidateId },
      select: { profileId: true },
    });
    profileId = candidate?.profileId || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callResult added in migration but Prisma client not yet regenerated
  const record = await (prisma.outreachRecord.create as any)({
    data: {
      tenantId,
      candidateId,
      profileId,
      channel: params.channel,
      toEmail: params.toPhone || '',
      toName: params.toName || company.name,
      subject: params.channel === 'phone' ? '电话外联' : 'WhatsApp 消息',
      bodyText: params.messageText || null,
      status: 'manual_sent',
      sentAt: new Date(),
      callResult: params.callResult || null,
      metadata: {
        companyId: params.companyId,
        contactId: params.contactId || null,
      },
    },
  });

  // 更新公司跟进状态
  await prisma.prospectCompany.update({
    where: { id: params.companyId },
    data: {
      status: 'contacted',
      lastContactedAt: new Date(),
    },
  });

  return { success: true, recordId: record.id };
}

export interface CompanyOutreachRecord {
  id: string;
  channel: string;
  status: string;
  toName: string | null;
  toPhone: string;
  messageText: string | null;
  callResult: string | null;
  sentAt: Date | null;
  repliedAt: Date | null;
  createdAt: Date;
}

export async function getCompanyOutreachHistory(
  companyId: string
): Promise<{ records: CompanyOutreachRecord[] }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { records: [] };

  const tenantId = session.user.tenantId;

  // 获取公司的 candidateId
  const company = await prisma.prospectCompany.findUnique({
    where: { id: companyId, tenantId },
    select: { sourceCandidateId: true },
  });

  // 查找所有关联的外联记录
  const whereConditions = [];

  if (company?.sourceCandidateId) {
    whereConditions.push({ candidateId: company.sourceCandidateId });
  }

  // 也通过 metadata 中的 companyId 查找
  whereConditions.push({
    metadata: { path: ['companyId'], equals: companyId },
  });

  if (whereConditions.length === 0) return { records: [] };

  const rawRecords = await prisma.outreachRecord.findMany({
    where: {
      tenantId,
      OR: whereConditions,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const records: CompanyOutreachRecord[] = rawRecords.map(r => ({
    id: r.id,
    channel: r.channel,
    status: r.status,
    toName: r.toName,
    toPhone: r.toEmail,
    messageText: r.bodyText,
    callResult: (r as Record<string, unknown>).callResult as string | null,
    sentAt: r.sentAt,
    repliedAt: (r as Record<string, unknown>).repliedAt as Date | null,
    createdAt: r.createdAt,
  }));

  return { records };
}
