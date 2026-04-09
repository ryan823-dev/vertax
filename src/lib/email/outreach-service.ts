// ==================== Outreach Email Service v2 ====================
// 整合MarketingSkills框架：cold-email最佳实践

import { sendEmail } from './resend-client';
import { prisma } from '@/lib/prisma';
import { chatCompletion } from '@/lib/ai-client';

// ==================== Cold Email 核心原则 ====================
// 1. 写作风格：像同事，不是销售机器
// 2. 主题行：短、无聊、内部风格（2-4词，小写）
// 3. 个性化：必须与问题关联，不只是"我看到你的公司"
// 4. 一个请求：低摩擦CTA（"值得探索吗？"优于"约个会议"）
// 5. 每句话都要有存在价值：删除不推动回复的句子

export interface OutreachCampaign {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  templateHtml: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  repliedCount: number;
  createdAt: Date;
  sentAt?: Date;
}

export interface OutreachRecipient {
  id: string;
  campaignId: string;
  candidateId: string;
  email: string;
  name: string;
  status: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced';
  personalizedSubject?: string;
  personalizedHtml?: string;
  sentAt?: Date;
  openedAt?: Date;
  error?: string;
}

export interface GenerateEmailResult {
  subject: string;
  html: string;
  success: boolean;
  error?: string;
}

/**
 * 为单个候选生成个性化开发信
 *
 * 个性化维度：
 * 1. 公司名称、行业、国家 → 针对性开场白
 * 2. 客户描述信息 → 引用具体内容
 * 3. 行业痛点 → 定制价值主张
 * 4. 语气风格 → 匹配客户类型
 */
export async function generateOutreachEmail(options: {
  candidateName: string;
  candidateCompany: string;
  candidateIndustry?: string;
  candidateCountry?: string;
  candidateWebsite?: string;
  candidateDescription?: string;        // 新增：候选公司描述
  candidatePainPoints?: string[];       // 新增：推测的痛点
  senderName: string;
  senderCompany: string;
  senderTitle?: string;
  valueProposition: string;
  evidencePoints: string[];
  language?: 'en' | 'zh';
  tone?: 'professional' | 'friendly' | 'technical';  // 新增：语气风格
  // 追踪参数
  tenantId?: string;
  candidateId?: string;
  emailId?: string;
}): Promise<GenerateEmailResult> {
  const {
    candidateName,
    candidateCompany,
    candidateIndustry,
    candidateCountry,
    candidateWebsite,
    candidateDescription,
    candidatePainPoints,
    senderName,
    senderCompany,
    senderTitle,
    valueProposition,
    evidencePoints,
    language = 'en',
    tone: _tone = 'professional',
    tenantId,
    candidateId,
    emailId,
  } = options;

  const _toneInstructions: Record<string, string> = {
    professional: '保持专业、正式的商务语气',
    friendly: '友好、轻松但专业的语气',
    technical: '技术导向，使用行业术语展示专业度',
  };

  const systemPrompt = language === 'zh'
    ? `你是专业的B2B开发信撰写专家。写出像真人写的邮件，不是销售模板。

【核心原则】
1. 像同事一样写作：使用缩写，口语化，读出来不顺口就改
2. 主题行：2-4个词，小写，像内部邮件（如"涂装效率"、"报价单"）
3. 个性化必须关联问题：去掉个性化开场后邮件仍通顺=个性化失败
4. 一个请求：低摩擦CTA（"值得聊聊吗？"优于"约个会议"）
5. 每句话都要有价值：不推动回复的句子删掉

【禁止的写法】
- "希望这封邮件找到你"（AI痕迹）
- "我看到了你的公司/资料"（模板感）
- "利用"、"协同"、"最佳实践"（营销腔）
- 多个CTA或复杂的会议请求
- 超过150字的正文

【邮件结构】
观察 → 问题 → 证明 → 请求
或
问题 → 价值 → 请求

输出JSON：
{
  "subject": "2-4词主题（小写）",
  "opening": "个性化开场（必须关联对方的具体情况）",
  "body": "正文（<150字，口语化）",
  "cta": "低摩擦行动号召",
  "html": "完整HTML"
}`
    : `You are an expert B2B cold email writer. Write emails that sound like they came from a sharp, thoughtful human — not a sales machine.

【Core Principles】
1. Write like a peer, not a vendor: Use contractions, conversational tone. Read aloud — if it sounds like marketing, rewrite.
2. Subject line: 2-4 words, lowercase, internal-looking (e.g., "coating efficiency", "pricing info")
3. Personalization must connect to the problem: If removing the personalized opening leaves the email intact, it's not working
4. One ask, low friction: "Worth exploring?" beats "Can we schedule a call?"
5. Every sentence must earn its place: Cut anything that doesn't move toward a reply

【Avoid These Patterns】
- "I hope this email finds you well" (AI telltale)
- "I came across your profile/company" (template feel)
- "leverage," "synergy," "best-in-class" (marketing speak)
- Multiple CTAs or complex meeting requests
- Body over 150 words

【Email Shapes】
Observation → Problem → Proof → Ask
or
Question → Value → Ask

Output JSON:
{
  "subject": "2-4 word subject (lowercase)",
  "opening": "Personalized opening (must connect to their situation)",
  "body": "Body copy (<150 words, conversational)",
  "cta": "Low-friction call to action",
  "html": "Complete HTML"
}`;

  // 构建更详细的用户提示
  const painPointsSection = candidatePainPoints?.length
    ? `\n推测痛点：\n${candidatePainPoints.map(p => `- ${p}`).join('\n')}`
    : '';

  const descriptionSection = candidateDescription
    ? `\n公司简介：${candidateDescription}`
    : '';

  const userPrompt = language === 'zh'
    ? `目标客户信息：
- 公司：${candidateCompany}
- 联系人：${candidateName}
- 行业：${candidateIndustry || '未知'}
- 国家：${candidateCountry || '未知'}
- 网站：${candidateWebsite || '无'}${descriptionSection}${painPointsSection}

发件人信息：
- 姓名：${senderName}
- 公司：${senderCompany}
- 职位：${senderTitle || '商务拓展'}

核心价值主张：${valueProposition}

支撑证据（选择最相关的1-2个）：
${evidencePoints.map((e, i) => `${i + 1}. ${e}`).join('\n')}

请为这家公司生成一封高度个性化的开发信。`
    : `Target Prospect:
- Company: ${candidateCompany}
- Contact: ${candidateName}
- Industry: ${candidateIndustry || 'Unknown'}
- Country: ${candidateCountry || 'Unknown'}
- Website: ${candidateWebsite || 'None'}${descriptionSection}${painPointsSection}

Sender:
- Name: ${senderName}
- Company: ${senderCompany}
- Title: ${senderTitle || 'Business Development'}

Core Value Proposition: ${valueProposition}

Supporting Evidence (choose the most relevant 1-2):
${evidencePoints.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Generate a highly personalized outreach email for this company.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.7,
      }
    );

    const parsed = JSON.parse(result.content);

    // 添加邮件追踪和退订链接
    const htmlWithTracking = addEmailTracking(parsed.html, language, {
      tenantId,
      candidateId,
      emailId,
    });

    return {
      subject: parsed.subject,
      html: htmlWithTracking,
      success: true,
    };
  } catch (error) {
    return {
      subject: '',
      html: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 添加邮件追踪和退订链接
 *
 * 功能：
 * 1. 嵌入打开追踪像素（1x1透明图片）
 * 2. 替换链接为代理链接（点击追踪）
 * 3. 添加退订链接
 */
function addEmailTracking(
  html: string,
  language: 'en' | 'zh',
  tracking?: {
    tenantId?: string;
    candidateId?: string;
    emailId?: string;
  }
): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vertax.top';

  // 1. 构建追踪像素URL
  const trackingPixelUrl = tracking?.tenantId
    ? `${baseUrl}/api/track/open?t=${encodeURIComponent(tracking.tenantId)}${tracking.candidateId ? `&c=${encodeURIComponent(tracking.candidateId)}` : ''}${tracking.emailId ? `&e=${encodeURIComponent(tracking.emailId)}` : ''}`
    : null;

  // 2. 替换邮件中的链接为代理链接
  let processedHtml = html;

  if (tracking?.tenantId) {
    // 匹配所有 href="..." 属性中的链接
    processedHtml = processedHtml.replace(
      /href="(https?:\/\/[^"]+)"/gi,
      (match, url) => {
        // 排除已经是我们追踪链接的URL
        if (url.includes('/api/track/')) {
          return match;
        }

        const params = new URLSearchParams({
          t: tracking.tenantId!,
          url: url,
        });
        if (tracking.candidateId) params.set('c', tracking.candidateId);
        if (tracking.emailId) params.set('e', tracking.emailId);

        const proxyUrl = `${baseUrl}/api/track/click?${params.toString()}`;

        return `href="${proxyUrl}"`;
      }
    );
  }

  // 3. 添加追踪像素（在</body>前）
  if (trackingPixelUrl) {
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`;
    processedHtml = processedHtml.replace('</body>', `${trackingPixel}</body>`);

    // 如果没有 </body> 标签，追加到末尾
    if (!processedHtml.includes('</body>')) {
      processedHtml += trackingPixel;
    }
  }

  // 4. 添加退订链接
  const unsubscribeText = language === 'zh'
    ? `<p style="font-size: 12px; color: #999; margin-top: 20px;">如果您不想再收到此类邮件，请<a href="${baseUrl}/unsubscribe?t=${tracking?.tenantId || ''}" style="color: #666;">点击退订</a>。</p>`
    : `<p style="font-size: 12px; color: #999; margin-top: 20px;">If you no longer wish to receive these emails, <a href="${baseUrl}/unsubscribe?t=${tracking?.tenantId || ''}" style="color: #666;">click here to unsubscribe</a>.</p>`;

  return processedHtml + unsubscribeText;
}

/**
 * 根据行业推测痛点
 */
function inferPainPoints(industry?: string, _country?: string): string[] {
  const painPointsByIndustry: Record<string, string[]> = {
    'automotive': [
      '涂装质量稳定性',
      '产线自动化升级',
      'VOC排放合规',
      '成本控制',
    ],
    'aerospace': [
      '高精度涂装要求',
      '质量追溯体系',
      '特种涂层工艺',
    ],
    'electronics': [
      '精密涂装工艺',
      '静电防护',
      '洁净室要求',
    ],
    'construction': [
      '大型工件涂装',
      '防腐要求',
      '工期压力',
    ],
  };

  // 匹配行业
  const industryLower = (industry || '').toLowerCase();
  
  for (const [key, points] of Object.entries(painPointsByIndustry)) {
    if (industryLower.includes(key)) {
      return points;
    }
  }

  // 默认痛点
  return [
    '涂装效率提升',
    '质量一致性',
    '成本优化',
  ];
}

/**
 * 根据行业选择语气风格
 */
function inferTone(industry?: string): 'professional' | 'friendly' | 'technical' {
  const industryLower = (industry || '').toLowerCase();
  
  if (industryLower.includes('automotive') || industryLower.includes('aerospace')) {
    return 'technical';
  }
  if (industryLower.includes('retail') || industryLower.includes('consumer')) {
    return 'friendly';
  }
  return 'professional';
}

/**
 * 批量发送开发信
 */
export async function sendOutreachBatch(options: {
  tenantId: string;
  campaignId: string;
  recipientIds: string[];
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: (sent: number, total: number) => void;
}): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const {
    tenantId,
    campaignId,
    recipientIds,
    batchSize = 10,
    delayBetweenBatches = 1000,
    onProgress,
  } = options;

  const result = {
    success: true,
    sentCount: 0,
    failedCount: 0,
    errors: [] as string[],
  };

  // 获取发件人信息
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      companyProfile: {
        select: { companyName: true },
      },
      evidences: {
        where: { status: 'active' },
        select: { title: true, content: true },
        take: 5,
      },
    },
  });

  if (!tenant) {
    return { ...result, success: false, errors: ['Tenant not found'] };
  }

  // 分批处理
  for (let i = 0; i < recipientIds.length; i += batchSize) {
    const batch = recipientIds.slice(i, i + batchSize);

    for (const recipientId of batch) {
      try {
        // 获取候选信息
        const candidate = await prisma.radarCandidate.findUnique({
          where: { id: recipientId },
        });

        if (!candidate || !candidate.email) {
          result.failedCount++;
          result.errors.push(`Candidate ${recipientId}: no email`);
          continue;
        }

        // 生成个性化邮件（每个候选独立生成）
        const emailContent = await generateOutreachEmail({
          candidateName: candidate.displayName,
          candidateCompany: candidate.displayName,
          candidateIndustry: candidate.industry || undefined,
          candidateCountry: candidate.country || undefined,
          candidateWebsite: candidate.website || undefined,
          candidateDescription: candidate.description || undefined,
          candidatePainPoints: inferPainPoints(candidate.industry || undefined, candidate.country || undefined),
          senderName: tenant.companyProfile?.companyName || 'VertaX',
          senderCompany: tenant.companyProfile?.companyName || 'VertaX',
          valueProposition: 'We help manufacturers optimize their coating processes with advanced automation solutions.',
          evidencePoints: tenant.evidences.slice(0, 3).map(e => `${e.title}: ${e.content?.slice(0, 100)}...`),
          language: 'en',
          tone: inferTone(candidate.industry || undefined),
          // 追踪参数
          tenantId,
          candidateId: recipientId,
        });

        if (!emailContent.success) {
          result.failedCount++;
          result.errors.push(`Candidate ${recipientId}: ${emailContent.error}`);
          continue;
        }

        // 发送邮件（使用租户配置）
        const sendResult = await sendEmail({
          to: candidate.email,
          tenantId, // 使用租户邮件配置
          subject: emailContent.subject,
          html: emailContent.html,
          tags: {
            campaign: campaignId,
            candidate: recipientId,
          },
        });

        if (sendResult.success) {
          result.sentCount++;

          // 更新候选状态
          await prisma.radarCandidate.update({
            where: { id: recipientId },
            data: {
              status: 'IMPORTED', // 标记为已联系
            },
          });
        } else {
          result.failedCount++;
          result.errors.push(`Candidate ${recipientId}: ${sendResult.error}`);
        }
      } catch (e) {
        result.failedCount++;
        result.errors.push(`Candidate ${recipientId}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // 进度回调
    if (onProgress) {
      onProgress(i + batch.length, recipientIds.length);
    }

    // 批次间延迟
    if (i + batchSize < recipientIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return result;
}

/**
 * 获取可发送Outreach的候选列表
 */
export async function getOutreachEligibleCandidates(tenantId: string): Promise<{
  id: string;
  displayName: string;
  email: string | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  qualifyTier: string | null;
}[]> {
  const candidates = await prisma.radarCandidate.findMany({
    where: {
      tenantId,
      status: 'QUALIFIED',
      email: { not: null },
      qualifyTier: { in: ['A', 'B'] },
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      country: true,
      industry: true,
      website: true,
      qualifyTier: true,
    },
    orderBy: [
      { qualifyTier: 'asc' },
      { createdAt: 'desc' },
    ],
    take: 100,
  });

  return candidates;
}
