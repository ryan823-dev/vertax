/**
 * 获客雷达健康监控服务
 *
 * 监控内容：
 * 1. 各数据源 API 可用性
 * 2. 响应时间
 * 3. 错误率
 * 4. 候选数据新鲜度
 */

import { db } from "@/lib/db";

// ==================== 类型定义 ====================

export interface AdapterHealth {
  code: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number; // ms
  errorRate: number; // 0-1
  lastSuccess?: Date;
  lastError?: Date;
  errorMessage?: string;
}

export interface RadarHealthReport {
  timestamp: Date;
  overall: "healthy" | "degraded" | "down";
  adapters: AdapterHealth[];
  recentErrors: RadarError[];
  recommendations: string[];
}

export interface RadarError {
  timestamp: Date;
  adapter: string;
  operation: string;
  error: string;
  candidateId?: string;
}

// ==================== 健康状态检测 ====================

const ADAPTER_CHECK_TIMEOUT = 5000; // 5秒超时

/**
 * 检测单个适配器健康状态
 */
async function checkAdapterHealth(
  adapterCode: string,
  apiEndpoint?: string
): Promise<AdapterHealth> {
  const startTime = Date.now();

  // 默认值
  const health: AdapterHealth = {
    code: adapterCode,
    name: getAdapterName(adapterCode),
    status: "healthy",
    latency: 0,
    errorRate: 0,
  };

  try {
    // 检查 API 端点
    if (apiEndpoint) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ADAPTER_CHECK_TIMEOUT);

      try {
        const response = await fetch(apiEndpoint, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        health.latency = Date.now() - startTime;
        health.status = response.ok ? "healthy" : "degraded";
      } catch (fetchError) {
        clearTimeout(timeoutId);
        health.status = "down";
        health.errorMessage =
          fetchError instanceof Error ? fetchError.message : "Connection failed";
      }
    }

    // 检查最近的错误记录
    const recentErrors = await getRecentErrors(adapterCode, 24); // 24小时内
    if (recentErrors.length > 0) {
      health.errorRate = Math.min(recentErrors.length / 100, 1);
      health.lastError = recentErrors[0]?.timestamp;
    }
  } catch (error) {
    health.status = "down";
    health.errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return health;
}

/**
 * 获取适配器名称
 */
function getAdapterName(code: string): string {
  const names: Record<string, string> = {
    ted: "欧盟招标 TED",
    ungm: "联合国 UNGM",
    sam_gov: "美国政府 SAM",
    brave: "Brave Search",
    hunter: "Hunter.io",
    pdl: "People Data Labs",
    tavily: "Tavily AI",
    exa: "Exa Neural",
    web_scrape: "网页抓取",
  };
  return names[code] || code;
}

// ==================== 错误记录 ====================

/**
 * 记录雷达错误
 */
export async function logRadarError(
  adapter: string,
  operation: string,
  error: string,
  candidateId?: string,
  tenantId?: string
): Promise<void> {
  try {
    await db.radarError.create({
      data: {
        adapter,
        operation,
        error: error.slice(0, 1000),
        candidateId,
        tenantId: tenantId || 'system',
        timestamp: new Date(),
      },
    });
  } catch (dbError) {
    // 降级处理：仅打印日志
    console.error("[RadarMonitor] Failed to log error to DB:", {
      adapter,
      operation,
      error: error.slice(0, 200),
      candidateId,
      dbError: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }
}

/**
 * 获取最近错误
 */
export async function getRecentErrors(
  adapter?: string,
  hours = 24
): Promise<RadarError[]> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const whereClause = adapter
      ? { adapter, timestamp: { gte: since } }
      : { timestamp: { gte: since } };

    const errors = await db.radarError.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return errors.map((e) => ({
      timestamp: e.timestamp,
      adapter: e.adapter,
      operation: e.operation,
      error: e.error,
      candidateId: e.candidateId || undefined,
    }));
  } catch (dbError) {
    console.error("[RadarMonitor] Failed to fetch errors:", dbError);
    return [];
  }
}

// ==================== 候选新鲜度 ====================

/**
 * 检查候选数据新鲜度
 *
 * 分类标准：
 * - fresh: 7天内更新
 * - stale: 7-30天更新
 * - old: 超过30天未更新
 */
export async function checkCandidateFreshness(tenantId?: string): Promise<{
  total: number;
  fresh: number;
  stale: number;
  old: number;
}> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const whereClause = tenantId ? { tenantId } : {};

    const [total, fresh, stale, old] = await Promise.all([
      // 总数
      db.radarCandidate.count({ where: whereClause }),
      // 新鲜（7天内）
      db.radarCandidate.count({
        where: { ...whereClause, updatedAt: { gte: sevenDaysAgo } },
      }),
      // 较旧（7-30天）
      db.radarCandidate.count({
        where: {
          ...whereClause,
          updatedAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
        },
      }),
      // 过期（超过30天）
      db.radarCandidate.count({
        where: { ...whereClause, updatedAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    return { total, fresh, stale, old };
  } catch (error) {
    console.error("[RadarMonitor] Failed to check freshness:", error);
    return { total: 0, fresh: 0, stale: 0, old: 0 };
  }
}

// ==================== 完整健康报告 ====================

/**
 * 生成完整健康报告
 */
export async function generateHealthReport(): Promise<RadarHealthReport> {
  // 数据源配置
  const adapters = [
    { code: "ted", endpoint: "https://api.ted.europa.eu/v3/" },
    { code: "ungm", endpoint: "https://www.ungm.org" },
    { code: "sam_gov", endpoint: "https://api.sam.gov" },
    { code: "brave", endpoint: "https://api.search.brave.com" },
    { code: "hunter", endpoint: "https://api.hunter.io" },
    { code: "pdl", endpoint: "https://api.peopledatalabs.com" },
    { code: "tavily", endpoint: "https://api.tavily.com" },
    { code: "exa", endpoint: "https://api.exa.ai" },
  ];

  // 并行检查所有适配器
  const healthChecks = await Promise.all(
    adapters.map((a) => checkAdapterHealth(a.code, a.endpoint))
  );

  // 获取最近错误
  const recentErrors = await getRecentErrors(undefined, 24);

  // 生成建议
  const recommendations: string[] = [];
  const downAdapters = healthChecks.filter((h) => h.status === "down");
  const degradedAdapters = healthChecks.filter((h) => h.status === "degraded");

  if (downAdapters.length > 0) {
    recommendations.push(
      `⚠️ ${downAdapters.length} 个数据源不可用: ${downAdapters.map((a) => a.name).join(", ")}`
    );
  }
  if (degradedAdapters.length > 0) {
    recommendations.push(
      `⚡ ${degradedAdapters.length} 个数据源响应缓慢: ${degradedAdapters.map((a) => `${a.name} (${a.latency}ms)`).join(", ")}`
    );
  }

  // 检查新鲜度
  const freshness = await checkCandidateFreshness();
  if (freshness.old / freshness.total > 0.5) {
    recommendations.push(
      `📊 ${freshness.total} 个候选中 ${freshness.old} 个超过30天未更新，建议重新激活`
    );
  }

  // 判断整体状态
  let overall: "healthy" | "degraded" | "down" = "healthy";
  if (downAdapters.length > 0) {
    overall = downAdapters.length >= 3 ? "down" : "degraded";
  } else if (degradedAdapters.length > 0 || recentErrors.length > 50) {
    overall = "degraded";
  }

  return {
    timestamp: new Date(),
    overall,
    adapters: healthChecks,
    recentErrors: recentErrors.slice(0, 10),
    recommendations,
  };
}

// ==================== 导出 ====================

const radarHealthMonitor = {
  checkAdapterHealth,
  logRadarError,
  getRecentErrors,
  checkCandidateFreshness,
  generateHealthReport,
};

export default radarHealthMonitor;
