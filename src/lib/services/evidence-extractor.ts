/**
 * 证据提取服务
 *
 * 从知识库素材中自动提取结构化证据
 * 支持项目案例、数据指标、客户证言、认证资质等类型
 */

import { db } from "@/lib/db";
import {
  extractTextFromAsset,
  extractStructuredData,
} from "@/lib/utils/text-extract";

// ==================== 类型定义 ====================

export type AutoEvidenceType =
  | "case_study"      // 项目案例
  | "statistic"       // 数据指标
  | "testimonial"     // 客户证言
  | "certification"   // 认证资质
  | "claim";          // 能力声明

export interface ExtractedEvidence {
  type: AutoEvidenceType;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
}

export interface ExtractionResult {
  success: boolean;
  extracted: number;
  errors: string[];
  evidences: ExtractedEvidence[];
}

// ==================== 提取提示词映射 ====================

const EVIDENCE_PROMPTS: Record<AutoEvidenceType, string> = {
  case_study: `从文档中提取所有项目案例，输出JSON数组：
[
  {
    "title": "项目名称",
    "client": "客户名称",
    "industry": "行业",
    "location": "地点",
    "description": "项目描述（50-100字）",
    "outcomes": ["成果1", "成果2"],
    "technologies": ["技术/产品"]
  }
]
只输出JSON数组。无案例则返回 []。`,

  statistic: `从文档中提取所有数据指标，输出JSON数组：
[
  {
    "title": "指标名称",
    "value": "数值",
    "unit": "单位",
    "context": "上下文说明",
    "significance": "意义"
  }
]
只输出JSON数组。无指标则返回 []。`,

  testimonial: `从文档中提取所有客户评价/证言，输出JSON数组：
[
  {
    "title": "客户名称/来源",
    "content": "证言内容",
    "role": "评价人职位/角色"
  }
]
只输出JSON数组。无证言则返回 []。`,

  certification: `从文档中提取所有认证资质信息，输出JSON数组：
[
  {
    "title": "认证名称",
    "issuer": "颁发机构",
    "date": "获得时间",
    "scope": "认证范围",
    "validUntil": "有效期"
  }
]
只输出JSON数组。无认证则返回 []。`,

  claim: `从文档中提取所有能力声明/核心优势，输出JSON数组：
[
  {
    "title": "能力/优势名称",
    "description": "详细描述",
    "evidence": "支撑证据或数据"
  }
]
只输出JSON数组。无内容则返回 []。`,
};

// ==================== 核心函数 ====================

/**
 * 从单个素材提取证据
 */
export async function extractEvidenceFromAsset(
  assetId: string,
  tenantId: string,
  userId: string,
  types?: AutoEvidenceType[]
): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    success: false,
    extracted: 0,
    errors: [],
    evidences: [],
  };

  try {
    // 获取素材信息
    const asset = await db.asset.findFirst({
      where: { id: assetId, tenantId, deletedAt: null },
      select: {
        id: true,
        originalName: true,
        storageKey: true,
        mimeType: true,
      },
    });

    if (!asset) {
      result.errors.push(`素材不存在: ${assetId}`);
      return result;
    }

    // 提取文本
    const text = await extractTextFromAsset(asset.storageKey, asset.mimeType);

    if (!text || text.startsWith("[")) {
      result.errors.push(`素材文本提取失败或内容为空: ${asset.originalName}`);
      return result;
    }

    // 确定要提取的类型
    const typesToExtract = types || (["case_study", "statistic", "testimonial", "certification", "claim"] as AutoEvidenceType[]);

    // 并行提取各类型证据
    const extractionPromises = typesToExtract.map(async (type) => {
      try {
        const data = await extractStructuredData(
          text,
          "evidence",
          EVIDENCE_PROMPTS[type]
        );
        return { type, data };
      } catch (error) {
        result.errors.push(`${type} 提取失败: ${error}`);
        return { type, data: [] };
      }
    });

    const extractionResults = await Promise.all(extractionPromises);

    // 整理提取结果
    for (const { type, data } of extractionResults) {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && typeof item === "object") {
            const evidence = transformToEvidence(type, item as Record<string, unknown>, asset.originalName);
            if (evidence) {
              result.evidences.push(evidence);
            }
          }
        }
      }
    }

    result.success = true;
    result.extracted = result.evidences.length;

  } catch (error) {
    result.errors.push(`提取过程异常: ${error}`);
  }

  return result;
}

/**
 * 将提取的数据转换为证据格式
 */
function transformToEvidence(
  type: AutoEvidenceType,
  data: Record<string, unknown>,
  sourceName: string
): ExtractedEvidence | null {
  if (!data || typeof data !== "object") return null;

  switch (type) {
    case "case_study":
      return {
        type: "case_study",
        title: String(data.title || data.projectName || "未命名项目"),
        content: formatCaseStudy(data),
        source: sourceName,
        tags: extractTags(data, ["industry", "client", "location"]),
      };

    case "statistic":
      return {
        type: "statistic",
        title: String(data.title || data.metric || "数据指标"),
        content: formatStatistic(data),
        source: sourceName,
        tags: [],
      };

    case "testimonial":
      return {
        type: "testimonial",
        title: String(data.title || data.client || "客户证言"),
        content: String(data.content || ""),
        source: sourceName,
        tags: data.role ? [String(data.role)] : [],
      };

    case "certification":
      return {
        type: "certification",
        title: String(data.title || "认证资质"),
        content: formatCertification(data),
        source: sourceName,
        tags: data.issuer ? [String(data.issuer)] : [],
      };

    case "claim":
      return {
        type: "claim",
        title: String(data.title || "能力声明"),
        content: String(data.description || ""),
        source: sourceName,
        tags: [],
      };

    default:
      return null;
  }
}

/**
 * 格式化项目案例内容
 */
function formatCaseStudy(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.client) parts.push(`客户: ${data.client}`);
  if (data.industry) parts.push(`行业: ${data.industry}`);
  if (data.location) parts.push(`地点: ${data.location}`);
  if (data.description) parts.push(`\n${data.description}`);

  if (data.outcomes && Array.isArray(data.outcomes) && data.outcomes.length > 0) {
    parts.push(`\n成果:`);
    data.outcomes.forEach((o: string) => parts.push(`- ${o}`));
  }

  if (data.technologies && Array.isArray(data.technologies) && data.technologies.length > 0) {
    parts.push(`\n技术/产品: ${data.technologies.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * 格式化数据指标内容
 */
function formatStatistic(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.value !== undefined) {
    const value = data.unit ? `${data.value} ${data.unit}` : data.value;
    parts.push(`数值: ${value}`);
  }
  if (data.context) parts.push(`上下文: ${data.context}`);
  if (data.significance) parts.push(`意义: ${data.significance}`);

  return parts.join("\n");
}

/**
 * 格式化认证资质内容
 */
function formatCertification(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.issuer) parts.push(`颁发机构: ${data.issuer}`);
  if (data.date) parts.push(`获得时间: ${data.date}`);
  if (data.scope) parts.push(`认证范围: ${data.scope}`);
  if (data.validUntil) parts.push(`有效期至: ${data.validUntil}`);

  return parts.join("\n");
}

/**
 * 从数据中提取标签
 */
function extractTags(data: Record<string, unknown>, fields: string[]): string[] {
  const tags: string[] = [];
  for (const field of fields) {
    const value = data[field];
    if (value && typeof value === "string" && value.trim()) {
      tags.push(value.trim());
    }
  }
  return tags;
}

// ==================== 批量提取与入库 ====================

/**
 * 批量从素材提取证据并保存到数据库
 */
export async function batchExtractAndSaveEvidence(
  assetIds: string[],
  tenantId: string,
  userId: string,
  types?: AutoEvidenceType[],
  options?: {
    skipExisting?: boolean;  // 跳过已有证据的素材
    overwrite?: boolean;     // 覆盖已有证据
  }
): Promise<{
  total: number;
  extracted: number;
  saved: number;
  errors: string[];
}> {
  const stats = {
    total: assetIds.length,
    extracted: 0,
    saved: 0,
    errors: [] as string[],
  };

  for (const assetId of assetIds) {
    try {
      // 提取证据
      const result = await extractEvidenceFromAsset(assetId, tenantId, userId, types);

      if (!result.success) {
        stats.errors.push(...result.errors);
        continue;
      }

      stats.extracted += result.extracted;

      // 如果设置了覆盖，先删除该素材的旧证据
      if (options?.overwrite) {
        await db.evidence.updateMany({
          where: { assetId, tenantId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }

      // 保存新证据
      for (const evidence of result.evidences) {
        await db.evidence.create({
          data: {
            tenantId,
            title: evidence.title,
            content: evidence.content,
            type: evidence.type,
            assetId,
            tags: evidence.tags || [],
            sourceLocator: {
              source: evidence.source || "自动提取",
              assetId,
            },
            createdById: userId,
          },
        });
        stats.saved++;
      }

    } catch (error) {
      stats.errors.push(`处理素材 ${assetId} 时出错: ${error}`);
    }
  }

  return stats;
}

/**
 * 从租户所有已解析素材中提取证据
 */
export async function extractEvidenceFromAllAssets(
  tenantId: string,
  userId: string,
  types?: AutoEvidenceType[]
): Promise<{
  processedAssets: number;
  totalExtracted: number;
  totalSaved: number;
  errors: string[];
}> {
  // 获取所有已解析的文档素材
  const assets = await db.asset.findMany({
    where: {
      tenantId,
      deletedAt: null,
      fileCategory: "document",
      status: "active",
    },
    select: { id: true },
  });

  const assetIds = assets.map((a) => a.id);

  const result = await batchExtractAndSaveEvidence(assetIds, tenantId, userId, types, {
    skipExisting: true,
  });

  return {
    processedAssets: result.total,
    totalExtracted: result.extracted,
    totalSaved: result.saved,
    errors: result.errors,
  };
}
