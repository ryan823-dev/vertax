// ==================== 邮件序列服务 ====================
// 整合MarketingSkills框架：email-sequence + marketing-psychology

import { chatCompletion } from '@/lib/ai-client';

export interface EmailSequence {
  name: string;                    // 序列名称
  trigger: string;                 // 触发条件
  goal: string;                    // 主要目标
  totalEmails: number;             // 邮件总数
  estimatedDuration: string;       // 预计时长
  emails: EmailInSequence[];
}

export interface EmailInSequence {
  order: number;                   // 序号
  name: string;                    // 邮件名称/目的
  sendDelay: string;               // 发送延迟（如"立即"、"第2天"）
  subject: string;                 // 邮件主题
  previewText: string;             // 预览文本
  body: string;                    // 邮件正文
  cta: {                           // 行动号召
    text: string;
    action: string;
  };
  psychologicalTrigger?: string;   // 心理学触发点
}

/**
 * 生成Outreach邮件序列
 */
export async function generateOutreachSequence(options: {
  companyName: string;
  contactName?: string;
  contactRole?: string;
  industry?: string;
  painPoints?: string[];
  valueProposition?: string;
  talkingPoints?: string[];
  psychologicalHooks?: string[];
  socialProofAngles?: string[];
  productInfo?: string;
}): Promise<{ success: boolean; data?: EmailSequence; error?: string }> {
  const {
    companyName,
    contactName,
    contactRole,
    industry,
    painPoints,
    valueProposition,
    talkingPoints,
    psychologicalHooks,
    socialProofAngles,
    productInfo,
  } = options;

  const systemPrompt = `你是一位资深的B2B销售邮件专家。你的任务是为目标客户设计一个多轮邮件跟进序列。

【邮件序列原则】
1. 一封邮件一个目标 - 不要试图一次做太多
2. 价值优先 - 先提供价值，再请求行动
3. 相关性胜过频率 - 少而精的邮件比频繁打扰更有效
4. 清晰的下一步 - 每封邮件都有明确的行动指引

【邮件序列结构】
- 第1封：价值开场 + 建立信任
- 第2封：痛点共鸣 + 解决方案
- 第3封：社会证明 + 案例展示
- 第4封：异议处理 + 风险消除
- 第5封：紧迫感 + 最后邀请

【营销心理学应用】
- 第1封：互惠原则（先给价值）
- 第2封：损失厌恶（强调不行动的代价）
- 第3封：社会证明（同行业成功案例）
- 第4封：权威效应（专业认证/数据）
- 第5封：稀缺性（限时机会）

【邮件写作规范】
- 主题行：清晰 > 巧妙，40-60字符
- 预览文本：延伸主题，90-140字符
- 正文：150-300字，短段落，可扫描
- CTA：一个主要行动，按钮文字：行动 + 结果
- 语气：专业但人性化，避免营销腔

【输出格式】
使用JSON格式输出完整的邮件序列。`;

  const userPrompt = `请为以下客户设计一个5轮邮件跟进序列：

【目标客户】
- 公司：${companyName}
- 联系人：${contactName || '未知'}
- 职位：${contactRole || '决策者'}
- 行业：${industry || '未知'}
${painPoints?.length ? `- 痛点：${painPoints.join('、')}` : ''}

【我方价值】
- 价值主张：${valueProposition || '提供专业解决方案'}
${talkingPoints?.length ? `- 谈资：${talkingPoints.join('；')}` : ''}
${psychologicalHooks?.length ? `- 心理触发点：${psychologicalHooks.join('；')}` : ''}
${socialProofAngles?.length ? `- 社会证明角度：${socialProofAngles.join('；')}` : ''}

【产品信息】
${productInfo || '涂装设备、自动化涂装线、喷涂机器人、粉末喷涂系统'}

请输出JSON格式的邮件序列：
{
  "name": "序列名称",
  "trigger": "触发条件",
  "goal": "主要目标",
  "totalEmails": 5,
  "estimatedDuration": "约2周",
  "emails": [
    {
      "order": 1,
      "name": "邮件目的",
      "sendDelay": "立即",
      "subject": "邮件主题",
      "previewText": "预览文本",
      "body": "邮件正文（使用{{contactName}}作为联系人姓名占位符）",
      "cta": {
        "text": "按钮文字",
        "action": "点击后的行动"
      },
      "psychologicalTrigger": "心理学触发点说明"
    }
    // ... 共5封邮件
  ]
}`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.4,
      }
    );

    // 解析JSON
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse sequence result' };
    }

    const data = JSON.parse(jsonMatch[0]) as EmailSequence;

    return { success: true, data };
  } catch (error) {
    console.error('[generateOutreachSequence] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 生成单封跟进邮件
 */
export async function generateFollowUpEmail(options: {
  previousEmailSubject: string;
  previousEmailSummary: string;
  companyName: string;
  contactName?: string;
  daysSinceLastEmail: number;
  responseReceived: boolean;
  painPoints?: string[];
  valueProposition?: string;
}): Promise<{ success: boolean; data?: EmailInSequence; error?: string }> {
  const {
    previousEmailSubject,
    previousEmailSummary,
    companyName,
    contactName,
    daysSinceLastEmail,
    responseReceived,
    painPoints,
    valueProposition,
  } = options;

  const systemPrompt = `你是一位资深的B2B销售邮件专家。你的任务是生成一封跟进邮件。

【跟进邮件原则】
1. 引用上一封邮件 - 建立连续性
2. 提供新价值 - 不要重复相同内容
3. 降低阻力 - 让回复变得简单
4. 适当紧迫 - 但不施压

【心理学触发点】
- 如果无回复：使用"损失厌恶"或"社会证明"
- 如果有兴趣：使用"承诺一致性"推动下一步
- 如果有异议：使用"框架效应"重新定位

【输出格式】
使用JSON格式输出单封邮件。`;

  const userPrompt = `请生成一封跟进邮件：

【上下文】
- 上一封邮件主题：${previousEmailSubject}
- 上一封邮件摘要：${previousEmailSummary}
- 距离上次邮件：${daysSinceLastEmail}天
- 是否收到回复：${responseReceived ? '是' : '否'}

【目标客户】
- 公司：${companyName}
- 联系人：${contactName || '决策者'}
${painPoints?.length ? `- 痛点：${painPoints.join('、')}` : ''}

【我方价值】
${valueProposition || '提供专业解决方案'}

请输出JSON格式的邮件：
{
  "order": 0,
  "name": "邮件目的",
  "sendDelay": "立即",
  "subject": "邮件主题",
  "previewText": "预览文本",
  "body": "邮件正文",
  "cta": {
    "text": "按钮文字",
    "action": "点击后的行动"
  },
  "psychologicalTrigger": "心理学触发点说明"
}`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'qwen-plus',
        temperature: 0.4,
      }
    );

    // 解析JSON
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse email result' };
    }

    const data = JSON.parse(jsonMatch[0]) as EmailInSequence;

    return { success: true, data };
  } catch (error) {
    console.error('[generateFollowUpEmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
