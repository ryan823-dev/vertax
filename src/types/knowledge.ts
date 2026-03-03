// ==================== SourceLocator — 证据溯源锚点 ====================

export interface SourceLocator {
  assetId: string;
  chunkId?: string;
  page?: number;
  paragraph?: number;
  highlightText?: string; // 最多 200 字符
}

// ==================== Asset 处理状态（嵌入 Asset.metadata JSON）====================

export type AssetProcessingStatus = 'unprocessed' | 'processing' | 'ready' | 'failed';

export interface AssetProcessingMeta {
  processingStatus: AssetProcessingStatus;
  processingError?: string;
  processedAt?: string; // ISO 日期
  chunkCount?: number;
}

// ==================== Chunk 数据 ====================

export interface ChunkData {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  charStart: number | null;
  charEnd: number | null;
  tokenCount: number | null;
}

export interface ChunkListResponse {
  items: ChunkData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Evidence 类型 ====================

export type EvidenceTypeValue = 'claim' | 'statistic' | 'testimonial' | 'case_study' | 'certification';

export interface EvidenceData {
  id: string;
  title: string;
  content: string;
  type: EvidenceTypeValue;
  sourceLocator: SourceLocator;
  assetId: string | null;
  assetName?: string;
  chunkId: string | null;
  tags: string[];
  status: string;
  createdById: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceFilters {
  type?: EvidenceTypeValue[];
  tags?: string[];
  assetId?: string;
  status?: string;
  search?: string;
}

export interface CreateEvidenceInput {
  title: string;
  content: string;
  type: EvidenceTypeValue;
  chunkId?: string;
  assetId?: string;
  tags?: string[];
  sourceLocator?: SourceLocator;
}

export interface UpdateEvidenceInput {
  title?: string;
  content?: string;
  type?: EvidenceTypeValue;
  tags?: string[];
  status?: string;
}

export interface EvidenceListResponse {
  items: EvidenceData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Guideline 类型 ====================

export type GuidelineCategoryValue = 'tone' | 'terminology' | 'visual' | 'messaging';

export interface GuidelineData {
  id: string;
  category: GuidelineCategoryValue;
  title: string;
  content: string;
  examples: { do: string[]; dont: string[] };
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGuidelineInput {
  category: GuidelineCategoryValue;
  title: string;
  content: string;
  examples?: { do: string[]; dont: string[] };
  isActive?: boolean;
}

export interface UpdateGuidelineInput {
  title?: string;
  content?: string;
  examples?: { do: string[]; dont: string[] };
  isActive?: boolean;
}

// ==================== ICP & Persona 类型 ====================

export interface ICPSegmentData {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  regions: string[];
  description: string | null;
  criteria: Record<string, unknown>;
  order: number;
  personaCount?: number;
}

export interface CreateICPSegmentInput {
  name: string;
  industry?: string;
  companySize?: string;
  regions?: string[];
  description?: string;
  criteria?: Record<string, unknown>;
}

export interface PersonaData {
  id: string;
  segmentId: string | null;
  segmentName?: string;
  name: string;
  title: string;
  seniority: string | null;
  concerns: string[];
  messagingPrefs: Record<string, unknown>;
  evidenceRefs: string[];
  order: number;
}

export interface CreatePersonaInput {
  segmentId?: string;
  name: string;
  title: string;
  seniority?: string;
  concerns?: string[];
  evidenceRefs?: string[];
}

export interface MessagingMatrixData {
  id: string;
  personaId: string;
  valueProp: string;
  message: string;
  channel: string | null;
  evidenceRefs: string[];
}

export interface UpsertMessagingMatrixInput {
  valueProp: string;
  message: string;
  channel?: string;
  evidenceRefs?: string[];
}

// ==================== 常量 ====================

export const EVIDENCE_TYPE_LABELS: Record<EvidenceTypeValue, string> = {
  claim: '产品主张',
  statistic: '数据统计',
  testimonial: '客户证言',
  case_study: '案例研究',
  certification: '资质认证',
};

export const GUIDELINE_CATEGORY_LABELS: Record<GuidelineCategoryValue, string> = {
  tone: '语气风格',
  terminology: '术语规范',
  visual: '视觉规范',
  messaging: '信息规范',
};

export const SENIORITY_LABELS: Record<string, string> = {
  junior: '初级',
  mid: '中级',
  senior: '高级',
  executive: '高管',
};
