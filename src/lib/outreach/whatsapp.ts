/**
 * WhatsApp 外联服务
 *
 * B2B 沟通比邮件更直接，WhatsApp 是重要的沟通渠道
 *
 * 支持：
 * 1. WhatsApp Business API
 * 2. Turn.io / MessageBird 集成
 * 3. 模板消息发送
 *
 * 注意：WhatsApp 需要企业账号和审核通过的消息模板
 */

import { chatCompletion } from '@/lib/ai-client';

// ==================== 类型定义 ====================

export interface WhatsAppConfig {
  apiKey?: string;
  apiSecret?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  provider: 'turnio' | 'messagebird' | 'meta' | 'custom';
  webhookUrl?: string;
}

export interface WhatsAppContact {
  phone: string;      // 完整电话号码，包含国家代码
  name?: string;        // 联系人姓名
  company?: string;    // 公司名称
  country?: string;    // 国家
}

export interface WhatsAppMessage {
  to: WhatsAppContact;
  templateName: string;
  templateData?: Record<string, string>;
  language?: string;
  mediaUrl?: string;
  priority?: 'high' | 'normal';
}

export interface WhatsAppTemplate {
  name: string;
  category: 'marketing' | 'utility' | 'authentication';
  languages: string[];
  variables: string[];         // 模板变量
  status: 'approved' | 'pending' | 'rejected';
  sampleText?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  timestamp: Date;
}

// ==================== 预定义模板 ====================

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplate> = {
  'hello_intro': {
    name: 'hello_intro',
    category: 'marketing',
    languages: ['en', 'zh'],
    variables: ['{{1}}', '{{2}}', '{{3}}'], // 收件人姓名, 公司名, 发送者名字
    status: 'approved',
    sampleText: 'Hello {{1}}, this is {{3}} from {{2}}. We provide industrial paint automation solutions...',
  },
  'follow_up': {
    name: 'follow_up',
    category: 'marketing',
    languages: ['en', 'zh'],
    variables: ['{{1}}', '{{2}}'],
    status: 'approved',
    sampleText: 'Hi {{1}}, just following up on my previous message about {{2}}...',
  },
  'meeting_request': {
    name: 'meeting_request',
    category: 'utility',
    languages: ['en'],
    variables: ['{{1}}', '{{2}}', '{{3}}'],
    status: 'approved',
    sampleText: 'Hello {{1}}, I would like to schedule a meeting to discuss {{2}}. Available times: {{3}}',
  },
  'catalog_share': {
    name: 'catalog_share',
    category: 'marketing',
    languages: ['en', 'zh'],
    variables: ['{{1}}', '{{2}}'],
    status: 'approved',
    sampleText: 'Hi {{1}}, as promised, here is our product catalog: {{2}}',
  },
  'thank_you': {
    name: 'thank_you',
    category: 'marketing',
    languages: ['en', 'zh'],
    variables: ['{{1}}'],
    status: 'approved',
    sampleText: 'Thank you {{1}} for your time today. Looking forward to hearing from you!',
  },
};

// ==================== WhatsApp 服务 ====================

export class WhatsAppService {
  private config: WhatsAppConfig;
  private templates: Record<string, WhatsAppTemplate> = WHATSAPP_TEMPLATES;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  // ==================== 公共方法 ====================

  /**
   * 发送 WhatsApp 消息
   */
  async sendMessage(message: WhatsAppMessage): Promise<SendResult> {
    if (!this.config.apiKey) {
      return {
        success: false,
        error: 'WhatsApp API key not configured',
        timestamp: new Date(),
      };
    }

    try {
      // 验证手机号格式
      if (!this.isValidPhoneNumber(message.to.phone)) {
        return {
          success: false,
          error: 'Invalid phone number format',
          timestamp: new Date(),
        };
      }

      // 验证模板
      const template = this.templates[message.templateName];
      if (!template) {
        return {
          success: false,
          error: `Template "${message.templateName}" not found`,
          timestamp: new Date(),
        };
      }

      // 根据提供商发送
      switch (this.config.provider) {
        case 'turnio':
          return await this.sendViaTurnio(message, template);
        case 'messagebird':
          return await this.sendViaMessageBird(message, template);
        default:
          return {
            success: false,
            error: `Provider ${this.config.provider} not implemented`,
            timestamp: new Date(),
          };
      }
    } catch (error) {
      console.error('[WhatsApp] Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 批量发送消息
   */
  async batchSend(messages: WhatsAppMessage[], onProgress?: (sent: number, total: number) => void): Promise<{
    success: number;
    failed: number;
    results: SendResult[];
  }> {
    const results: SendResult[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i++) {
      const result = await this.sendMessage(messages[i]);
      results.push(result);

      if (result.success) {
        success++;
      } else {
        failed++;
      }

      onProgress?.(success, messages.length);

      // 避免频率限制
      if (i < messages.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return { success, failed, results };
  }

  /**
   * 生成个性化消息内容
   */
  async generatePersonalizedMessage(
    contact: WhatsAppContact,
    template: WhatsAppTemplate,
    context: {
      senderName: string;
      senderCompany: string;
      product?: string;
      reference?: string;
    }
  ): Promise<{ message: string; templateData: Record<string, string> }> {
    const systemPrompt = `你是一个专业的 B2B 销售，擅长编写简洁、友好的 WhatsApp 消息。

要求：
1. 消息长度控制在 3-5 句话
2. 开头称呼联系人姓名
3. 自我介绍（名字 + 公司）
4. 说明联系目的
5. 结尾给出行动号召（CTA）
6. 语言：英文（如果 contact.country 是中国或消息包含中文则用中文）

消息风格：专业但不冷漠，友好但不随意`;

    try {
      const result = await chatCompletion([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `生成一条 WhatsApp 消息：

联系人：${contact.name || 'Unknown'} (${contact.company || 'N/A'})
国家：${contact.country || 'N/A'}
发送者：${context.senderName}
公司：${context.senderCompany}
产品：${context.product || '工业设备'}
参考：${context.reference || '首次联系'}

模板变量：${template.variables.join(', ')}
模板示例：${template.sampleText}

请生成消息内容和对应的模板变量值。`,
        },
      ], {
        model: 'qwen-plus',
        temperature: 0.5,
        maxTokens: 500,
      });

      // 解析 AI 返回的内容，填充模板变量
      // 这里简化处理，实际需要更复杂的解析
      const templateData: Record<string, string> = {
        '{{1}}': contact.name || 'there',
        '{{2}}': context.senderCompany,
        '{{3}}': context.senderName,
      };

      return {
        message: result.content.trim(),
        templateData,
      };
    } catch (error) {
      console.error('[WhatsApp] Generate error:', error);
      return {
        message: template.sampleText?.replace('{{1}}', contact.name || 'there')
          .replace('{{2}}', context.senderCompany)
          .replace('{{3}}', context.senderName) || 'Hello!',
        templateData: {},
      };
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 通过 Turn.io 发送
   */
  private async sendViaTurnio(message: WhatsAppMessage, template: WhatsAppTemplate): Promise<SendResult> {
    const url = 'https://whatsapp.turn.io/v1/messages';

    const payload = {
      to: message.to.phone.replace(/\D/g, ''), // 只保留数字
      type: 'template',
      template: {
        namespace: this.config.businessAccountId,
        name: template.name,
        language: {
          code: message.language || 'en',
        },
        components: [
          {
            type: 'body',
            parameters: template.variables.map((v) => ({
              type: 'text',
              text: message.templateData?.[v] || '',
            })),
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Turn.io error: ${response.status} - ${error}`,
        timestamp: new Date(),
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      status: 'sent',
      timestamp: new Date(),
    };
  }

  /**
   * 通过 MessageBird 发送
   */
  private async sendViaMessageBird(message: WhatsAppMessage, template: WhatsAppTemplate): Promise<SendResult> {
    const url = 'https://whatsapp.messagebird.com/v1/messages';

    const payload = {
      to: message.to.phone.replace(/\D/g, ''),
      from: this.config.phoneNumberId,
      type: 'template',
      content: {
        templateName: template.name,
        templateNamespace: this.config.businessAccountId,
        language: message.language || 'en',
        params: template.variables.map(v => message.templateData?.[v] || ''),
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `MessageBird error: ${response.status} - ${error}`,
        timestamp: new Date(),
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
      status: data.status,
      timestamp: new Date(),
    };
  }

  /**
   * 验证手机号格式
   */
  private isValidPhoneNumber(phone: string): boolean {
    // 移除所有非数字字符
    const digits = phone.replace(/\D/g, '');
    // 验证长度（国家代码 + 号码）
    return digits.length >= 10 && digits.length <= 15;
  }
}

// ==================== 辅助函数 ====================

/**
 * 格式化手机号为国际格式
 */
export function formatPhoneNumber(phone: string, country?: string): string {
  const digits = phone.replace(/\D/g, '');

  // 如果已经有国家代码，直接返回
  if (digits.startsWith('1') && digits.length === 11) {
    // 美国/加拿大
    return `+${digits}`;
  }
  if (digits.startsWith('86') && digits.length === 12) {
    // 中国
    return `+${digits}`;
  }

  // 添加默认国家代码
  const countryCodes: Record<string, string> = {
    'US': '1',
    'UK': '44',
    'DE': '49',
    'MX': '52',
    'VN': '84',
    'IN': '91',
  };

  const code = countryCodes[country || ''] || '1';
  return `+${code}${digits}`;
}

/**
 * 从网站提取 WhatsApp 联系方式
 */
export async function extractWhatsAppFromWebsite(url: string): Promise<string[]> {
  // 使用 Brave Search 搜索网站的 WhatsApp
  try {
    const { BraveSearchAdapter } = await import('@/lib/radar/adapters/brave-search');
    const adapter = new BraveSearchAdapter({} as never);

    const result = await adapter.search({
      keywords: [`site:${new URL(url).hostname} whatsapp`],
      countries: [],
    });

    // 简单提取 WhatsApp 号码
    const whatsappNumbers: string[] = [];
    for (const item of result.items) {
      const matches = item.description?.match(/\+?\d{10,15}/g);
      if (matches) {
        whatsappNumbers.push(...matches);
      }
    }

    return [...new Set(whatsappNumbers)];
  } catch (error) {
    console.warn('[extractWhatsappNumbers] Extract failed:', String(error));
    return [];
  }
}
