// ==================== Artifact Version Types ====================

export type ArtifactStatusValue =
  | 'draft'
  | 'in_review'
  | 'client_feedback'
  | 'revised'
  | 'approved'
  | 'published'
  | 'archived';

export type EntityType =
  | 'CompanyProfile'
  | 'Evidence'
  | 'BrandGuideline'
  | 'Persona'
  | 'ContentBrief'
  | 'ContentPiece'
  | 'SeoContent'
  // 获客雷达产物
  | 'TargetingSpec'
  | 'ChannelMap'
  | 'AccountList'
  | 'ContactRoleMap'
  | 'OutreachPack'
  | 'WeeklyCadence'
  | 'ProspectDossier'
  // 增长系统产物
  | 'TopicCluster'
  | 'ContentDraft'
  | 'ClaimsVerification'
  | 'PublishPack';

export interface ArtifactVersionMeta {
  changeNote?: string;
  generatedBy?: 'ai' | 'human';
  wordCount?: number;
  [key: string]: unknown;
}

export interface ArtifactVersionData {
  id: string;
  tenantId: string;
  entityType: EntityType;
  entityId: string;
  version: number;
  status: ArtifactStatusValue;
  content: Record<string, unknown>;
  meta: ArtifactVersionMeta;
  createdById: string;
  createdByName?: string;
  createdAt: Date;
}

// ==================== Status Machine ====================

/**
 * 状态机转换规则：
 * - draft → in_review
 * - in_review → client_feedback | approved | draft(退回)
 * - client_feedback → revised
 * - revised → in_review
 * - approved → archived
 * - 任意 → archived
 */
export const STATUS_TRANSITIONS: Record<ArtifactStatusValue, ArtifactStatusValue[]> = {
  draft: ['in_review', 'archived'],
  in_review: ['client_feedback', 'approved', 'draft', 'archived'],
  client_feedback: ['revised', 'archived'],
  revised: ['in_review', 'archived'],
  approved: ['published', 'archived'],
  published: ['archived'],
  archived: [],
};

// UI 可见的状态（隐藏 published）
export const VISIBLE_STATUSES: ArtifactStatusValue[] = [
  'draft',
  'in_review',
  'client_feedback',
  'revised',
  'approved',
  'archived',
];

export const STATUS_LABELS: Record<ArtifactStatusValue, string> = {
  draft: '草稿',
  in_review: '审核中',
  client_feedback: '客户反馈',
  revised: '已修订',
  approved: '已批准',
  published: '已发布',
  archived: '已归档',
};

export const STATUS_COLORS: Record<ArtifactStatusValue, { bg: string; text: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
  in_review: { bg: 'bg-amber-50', text: 'text-amber-600' },
  client_feedback: { bg: 'bg-orange-50', text: 'text-orange-600' },
  revised: { bg: 'bg-blue-50', text: 'text-blue-600' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  published: { bg: 'bg-green-50', text: 'text-green-600' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function isValidTransition(
  from: ArtifactStatusValue,
  to: ArtifactStatusValue
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(current: ArtifactStatusValue): ArtifactStatusValue[] {
  return STATUS_TRANSITIONS[current] ?? [];
}

// ==================== Content Brief Types ====================

export type BriefStatus = 'draft' | 'ready' | 'in_progress' | 'done';

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational';

export interface BriefData {
  id: string;
  tenantId: string;
  title: string;
  targetPersonaId: string | null;
  targetPersonaName?: string;
  targetKeywords: string[];
  intent: SearchIntent;
  cta: string | null;
  evidenceIds: string[];
  notes: string | null;
  status: BriefStatus;
  createdById: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
  contentPieceCount?: number;
}

export interface CreateBriefInput {
  title: string;
  targetPersonaId?: string;
  targetKeywords?: string[];
  intent: SearchIntent;
  cta?: string;
  evidenceIds?: string[];
  notes?: string;
}

export const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: '信息型',
  commercial: '商业型',
  transactional: '交易型',
  navigational: '导航型',
};

export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  draft: '草稿',
  ready: '就绪',
  in_progress: '进行中',
  done: '已完成',
};

// ==================== Collaboration Types ====================

// 锚点类型定义
export type AnchorType = 'jsonPath' | 'textRange' | 'blockId' | 'rowId';

export interface AnchorSpec {
  type: AnchorType;
  value: string;   // e.g. "coreProducts[0]", "block-uuid-xxx"
  label: string;   // 人类可读标签，如"核心产品·第1项"
}

export interface CommentData {
  id: string;
  tenantId: string;
  versionId: string;
  content: string;
  authorId: string;
  authorName?: string;
  parentId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  replies?: CommentData[];
  // 锚点字段
  anchorType?: AnchorType | null;
  anchorValue?: string | null;
  anchorLabel?: string | null;
  // 关联任务
  linkedTaskId?: string | null;
}

export interface CreateCommentInput {
  versionId: string;
  content: string;
  parentId?: string;
  // 锚点（可选）
  anchor?: AnchorSpec;
}

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'normal' | 'low';

export interface TaskData {
  id: string;
  tenantId: string;
  versionId: string;
  title: string;
  assigneeId: string | null;
  assigneeName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  createdById: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
  // 关联信息
  entityType?: EntityType;
  entityId?: string;
  version?: number;
  // 来源评论
  sourceCommentId?: string | null;
}

export interface CreateTaskInput {
  title: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: Date;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: '待处理',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  normal: '普通',
  low: '低优先级',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-600' },
  normal: { bg: 'bg-slate-100', text: 'text-slate-600' },
  low: { bg: 'bg-gray-50', text: 'text-gray-500' },
};

// ==================== Chat Types ====================

export interface ConversationData {
  id: string;
  tenantId: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessagePreview?: string;
}

export interface EvidenceReference {
  evidenceId: string;
  title: string;
  excerpt: string;
}

export interface ChatMessageData {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  references: EvidenceReference[] | null;
  tokens: number | null;
  createdAt: Date;
}
