import type { Asset, AssetFolder, User } from "@/generated/prisma/client";
import type { AssetProcessingMeta } from "@/types/knowledge";

// ==================== 基础类型 ====================

export type FileCategory = "video" | "image" | "document" | "audio" | "other";

export type AssetStatus = "uploading" | "active" | "archived" | "deleted";

export type AssetPurpose = "knowledge" | "marketing" | "reference";

// ==================== 上传相关 ====================

export interface AssetUploadSession {
  assetId: string;
  presignedUrl: string;
  storageKey: string;
  expiresAt: Date;
}

export interface FileUploadInput {
  originalName: string;
  mimeType: string;
  fileSize: number;
  folderId?: string | null;
}

export interface UploadProgress {
  assetId: string;
  fileName: string;
  fileSize: number;
  progress: number; // 0-100
  status: "pending" | "uploading" | "confirming" | "completed" | "failed";
  error?: string;
}

// ==================== 查询相关 ====================

export interface AssetFilters {
  search?: string;
  fileCategory?: FileCategory;
  folderId?: string | null;
  purpose?: AssetPurpose[];
  tags?: string[];
  status?: AssetStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AssetPagination {
  page: number;
  pageSize: number;
}

export type AssetSortField = "createdAt" | "originalName" | "fileSize" | "fileCategory";
export type SortDirection = "asc" | "desc";

export interface AssetSort {
  field: AssetSortField;
  direction: SortDirection;
}

// ==================== 响应类型 ====================

export interface AssetWithFolder extends Asset {
  folder: AssetFolder | null;
  uploadedBy: Pick<User, "id" | "name" | "email">;
}

export interface AssetWithUrls extends AssetWithFolder {
  viewUrl: string;
  thumbnailUrl: string | null;
  downloadUrl?: string;
}

export interface AssetListResponse {
  items: AssetWithFolder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AssetStats {
  total: number;
  byCategory: Record<FileCategory, number>;
  totalSize: bigint;
  totalSizeFormatted: string;
}

// ==================== 文件夹相关 ====================

export interface FolderWithChildren extends AssetFolder {
  children: AssetFolder[];
  _count?: {
    assets: number;
  };
}

export interface FolderTree {
  folders: FolderWithChildren[];
  totalAssets: number;
}

// ==================== 操作输入类型 ====================

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  color?: string;
  description?: string;
}

export interface UpdateFolderInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface UpdateAssetInput {
  title?: string;
  description?: string;
  tags?: string[];
  purpose?: AssetPurpose[];
  folderId?: string | null;
}

export interface AssetMetadata {
  // 视频
  duration?: number; // 秒
  width?: number;
  height?: number;
  fps?: number;
  // 图片
  // width, height 同上
  // 文档
  pages?: number;
  // 知识处理状态
  processingStatus?: AssetProcessingMeta['processingStatus'];
  processingError?: string;
  processedAt?: string;
  chunkCount?: number;
  // 通用
  [key: string]: unknown;
}

// ==================== 知识引擎扩展 ====================

export interface AssetWithProcessingStatus extends AssetWithFolder {
  processingMeta: AssetProcessingMeta;
}

export interface KnowledgeAssetListResponse {
  items: AssetWithProcessingStatus[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
