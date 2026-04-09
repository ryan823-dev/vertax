import OSS from "ali-oss";
import { randomUUID } from "crypto";
import type { FileCategory } from "@/types/assets";

// ==================== 配置 ====================

const OSS_REGION = process.env.OSS_REGION;
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET;
const OSS_BUCKET = process.env.OSS_BUCKET;
const OSS_ENDPOINT = process.env.OSS_ENDPOINT;

// 检查必要的环境变量
function checkConfig() {
  if (!OSS_REGION || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
    throw new Error(
      "Missing OSS configuration. Please set OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, and OSS_BUCKET environment variables."
    );
  }
}

// OSS 客户端单例
let ossClient: OSS | null = null;

function getOSSClient(): OSS {
  if (!ossClient) {
    checkConfig();
    ossClient = new OSS({
      region: OSS_REGION!,
      accessKeyId: OSS_ACCESS_KEY_ID!,
      accessKeySecret: OSS_ACCESS_KEY_SECRET!,
      bucket: OSS_BUCKET!,
      ...(OSS_ENDPOINT ? { endpoint: OSS_ENDPOINT } : {}),
      secure: !OSS_ENDPOINT?.startsWith('http://'),
    });
  }
  return ossClient;
}

// ==================== 存储路径生成 ====================

/**
 * 生成存储路径
 * 格式: tenants/{tenantId}/assets/{YYYY}/{MM}/{uuid}.{ext}
 */
export function generateStorageKey(tenantId: string, originalName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  
  // 提取扩展名
  const ext = originalName.includes(".")
    ? originalName.split(".").pop()?.toLowerCase() || "bin"
    : "bin";
  
  // 生成 UUID
  const uuid = randomUUID();
  
  return `tenants/${tenantId}/assets/${year}/${month}/${uuid}.${ext}`;
}

// ==================== 预签名 URL 生成 ====================

/**
 * 生成预签名上传 URL
 * @param storageKey OSS 对象路径
 * @param mimeType 文件 MIME 类型
 * @param _fileSize 文件大小（用于未来的大小限制校验）
 * @returns 预签名 PUT URL，有效期 1 小时
 */
export async function generatePresignedPutUrl(
  storageKey: string,
  mimeType: string,
  _fileSize?: number
): Promise<string> {
  const client = getOSSClient();
  
  // 生成预签名 URL，有效期 1 小时
  const url = client.signatureUrl(storageKey, {
    method: "PUT",
    expires: 3600, // 1 小时
    "Content-Type": mimeType,
  });
  
  return url;
}

/**
 * 生成预签名访问 URL
 * @param storageKey OSS 对象路径
 * @param expiresSeconds 有效期（秒），默认 7 天
 * @returns 预签名 GET URL
 */
export async function generatePresignedGetUrl(
  storageKey: string,
  expiresSeconds: number = 7 * 24 * 3600
): Promise<string> {
  const client = getOSSClient();
  
  const url = client.signatureUrl(storageKey, {
    method: "GET",
    expires: expiresSeconds,
  });
  
  return url;
}

// ==================== 缩略图 URL 生成 ====================

/**
 * 生成缩略图 URL（利用 OSS 图片处理能力）
 * @param storageKey OSS 对象路径
 * @param fileCategory 文件类别
 * @param mimeType MIME 类型
 * @returns 缩略图 URL，文档/其他类型返回 null
 */
export async function getThumbnailUrl(
  storageKey: string,
  fileCategory: FileCategory,
  _mimeType: string
): Promise<string | null> {
  const client = getOSSClient();
  
  if (fileCategory === "image") {
    // 图片：使用 OSS 图片处理生成缩略图
    // resize,m_fill,w_300,h_200 - 填充模式，300x200
    // quality,q_80 - 质量 80%
    const baseUrl = client.signatureUrl(storageKey, {
      method: "GET",
      expires: 7 * 24 * 3600,
    });
    
    // 添加图片处理参数
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}x-oss-process=image/resize,m_fill,w_300,h_200/quality,q_80`;
  }
  
  if (fileCategory === "video") {
    // 视频：使用 OSS 视频截帧
    // video/snapshot,t_0000,f_jpg,w_300,ar_auto
    // t_0000 - 第 0 毫秒（首帧）
    // f_jpg - 输出 jpg
    // w_300 - 宽度 300px
    // ar_auto - 自动保持宽高比
    const baseUrl = client.signatureUrl(storageKey, {
      method: "GET",
      expires: 7 * 24 * 3600,
    });
    
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}x-oss-process=video/snapshot,t_0000,f_jpg,w_300,ar_auto`;
  }
  
  // 文档和其他类型不支持缩略图，返回 null
  // 前端应该显示对应的文件类型图标
  return null;
}

// ==================== 删除操作 ====================

/**
 * 删除 OSS 对象
 * @param storageKey OSS 对象路径
 */
export async function deleteObject(storageKey: string): Promise<void> {
  const client = getOSSClient();
  await client.delete(storageKey);
}

/**
 * 批量删除 OSS 对象
 * @param storageKeys OSS 对象路径数组
 */
export async function deleteObjects(storageKeys: string[]): Promise<void> {
  if (storageKeys.length === 0) return;
  
  const client = getOSSClient();
  await client.deleteMulti(storageKeys);
}

// ==================== 工具函数 ====================

/**
 * 检查 OSS 对象是否存在
 * @param storageKey OSS 对象路径
 */
export async function objectExists(storageKey: string): Promise<boolean> {
  const client = getOSSClient();
  try {
    await client.head(storageKey);
    return true;
  } catch (error) {
    console.debug('[objectExists] OSS head failed:', String(error));
    return false;
  }
}

/**
 * 获取 OSS 对象信息
 * @param storageKey OSS 对象路径
 */
export async function getObjectInfo(storageKey: string): Promise<{
  contentLength: number;
  contentType: string;
  lastModified: Date;
} | null> {
  const client = getOSSClient();
  try {
    const result = await client.head(storageKey);
    const headers = result.res.headers as Record<string, string>;
    return {
      contentLength: parseInt(headers["content-length"], 10),
      contentType: headers["content-type"],
      lastModified: new Date(headers["last-modified"]),
    };
  } catch (error) {
    console.debug('[getObjectInfo] OSS head failed:', String(error));
    return null;
  }
}
