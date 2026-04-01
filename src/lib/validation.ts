// ==================== Input Validation Utilities ====================
// 统一的输入验证工具

import { z, ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * 验证并解析请求数据
 */
export async function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue: ZodIssue) =>
        `${issue.path.join('.')}: ${issue.message}`
      );
      return { success: false, error: messages.join('; ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * 从 FormData 解析数据
 */
export async function validateFormData<T>(
  schema: ZodSchema<T>,
  formData: FormData
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const object: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (value instanceof File) {
        object[key] = value;
      } else {
        object[key] = value === 'undefined' ? undefined : value;
      }
    });
    return validateRequest(schema, object);
  } catch (error) {
    return { success: false, error: 'Form data parsing failed' };
  }
}

// ==================== 常用验证 Schema ====================

// ID 验证
export const idSchema = z.string().min(1, 'ID is required');

// UUID 验证
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Email 验证
export const emailSchema = z.string().email('Invalid email format').optional();

// 分页参数
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// 关键词数组
export const keywordsSchema = z.array(z.string().min(1)).min(1).max(50);

// 国家代码数组
export const countriesSchema = z.array(
  z.string().length(2, 'Country code must be 2 characters').toUpperCase()
).max(50);

// URL 验证（安全检查）
export const safeUrlSchema = z.string()
  .url('Invalid URL format')
  .refine(url => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  }, 'Only HTTP(S) URLs are allowed');

// ==================== Radar 验证 Schema ====================

export const radarQuerySchema = z.object({
  keywords: z.array(z.string().min(1)).optional(),
  countries: countriesSchema.optional(),
  regions: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  cursor: z.object({
    queryIndex: z.number().optional(),
    nextPage: z.number().optional(),
    nextPageToken: z.string().optional(),
  }).optional(),
  maxResults: z.number().int().min(1).max(2000).optional(),
});

export const radarCandidateCreateSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  sourceId: z.string().min(1, 'Source ID is required'),
  displayName: z.string().min(1, 'Display name is required').max(200),
  sourceUrl: safeUrlSchema,
  candidateType: z.enum(['COMPANY', 'CONTACT', 'OPPORTUNITY']).default('COMPANY'),
  country: z.string().length(2).optional(),
  description: z.string().max(2000).optional(),
  website: safeUrlSchema.optional(),
  email: emailSchema,
  phone: z.string().max(50).optional(),
  matchScore: z.number().min(0).max(1).optional(),
});

export const radarProfileCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  keywords: z.object({
    en: z.array(z.string()).optional(),
    zh: z.array(z.string()).optional(),
    es: z.array(z.string()).optional(),
    ar: z.array(z.string()).optional(),
  }).optional(),
  targetCountries: countriesSchema.optional(),
  targetRegions: z.array(z.string()).optional(),
  industryCodes: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
  scheduleRule: z.string().regex(/^[\d\*\/\-\,\s]+$/, 'Invalid cron expression').optional(),
  isActive: z.boolean().default(true),
  maxRunSeconds: z.number().int().min(10).max(900).default(45),
  autoQualify: z.boolean().default(false),
  autoEnrich: z.boolean().default(false),
});

// ==================== 产品验证 Schema ====================

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5000).optional(),
  categoryId: z.string().optional(),
  sku: z.string().max(50).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  unit: z.string().max(20).optional(),
  minOrderQty: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

export const productUpdateSchema = productCreateSchema.partial();

// ==================== 客户验证 Schema ====================

export const companyCreateSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  website: safeUrlSchema.optional(),
  country: z.string().length(2).optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['STARTUP', 'SMB', 'MID', 'ENTERPRISE']).optional(),
  linkedinUrl: safeUrlSchema.optional(),
  description: z.string().max(2000).optional(),
});

// ==================== 内容验证 Schema ====================

export const contentCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).max(20).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  locale: z.string().length(2).default('en'),
  authorId: z.string().optional(),
});

export const contentUpdateSchema = contentCreateSchema.partial();

// ==================== 邮件外展验证 Schema ====================

export const outreachCreateSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required').max(10000),
  fromEmail: emailSchema,
  fromName: z.string().max(100).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const outreachSendSchema = z.object({
  outreachId: z.string().min(1, 'Outreach ID is required'),
  sendNow: z.boolean().default(true),
});

// ==================== 错误响应工具 ====================

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function parseValidationError(error: unknown): { message: string; details?: Record<string, string[]> } {
  if (error instanceof ValidationError) {
    return { message: error.message, details: error.details };
  }
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return { message: 'Validation failed', details };
  }
  return { message: error instanceof Error ? error.message : 'Unknown error' };
}

// ==================== 快速验证函数 ====================

/**
 * 验证雷达查询参数
 */
export function validateRadarQuery(query: unknown): z.infer<typeof radarQuerySchema> {
  const result = radarQuerySchema.safeParse(query);
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message);
    throw new ValidationError('Invalid radar query', { query: messages });
  }
  return result.data;
}

/**
 * 验证候选人创建参数
 */
export function validateCandidateCreate(data: unknown): z.infer<typeof radarCandidateCreateSchema> {
  const result = radarCandidateCreateSchema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message);
    throw new ValidationError('Invalid candidate data', { candidate: messages });
  }
  return result.data;
}

/**
 * 验证配置文件创建参数
 */
export function validateProfileCreate(data: unknown): z.infer<typeof radarProfileCreateSchema> {
  const result = radarProfileCreateSchema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message);
    throw new ValidationError('Invalid profile data', { profile: messages });
  }
  return result.data;
}
