// ==================== Incremental Scan Engine ====================
// 增量扫描引擎：游标驱动 + 时间预算 + 锁归属校验

import { prisma } from '@/lib/prisma';
import { 
  getAdapter, 
  ensureAdaptersInitialized,
  type RadarSearchQuery,
  type NormalizedCandidate,
} from './adapters';

// ==================== 类型定义 ====================

export interface ScanOptions {
  maxRunSeconds: number;    // 默认 45
  maxResults?: number;      // 可选上限
  lockToken: string;        // 条款A: 锁归属校验用
}

export interface ScanResult {
  fetched: number;
  created: number;
  duplicates: number;
  errors: string[];
  duration: number;
  cursorAdvanced: boolean;
  exhausted: boolean;
}

interface CursorState {
  nextPage?: number;
  nextPageToken?: string;
  since?: string;          // ISO8601
  queryIndex?: number;
  exhausted?: boolean;
}

// ==================== 增量扫描核心 ====================

export async function runIncrementalScan(
  profileId: string,
  sourceId: string,
  options: ScanOptions
): Promise<ScanResult> {
  ensureAdaptersInitialized();
  const startTime = Date.now();
  const deadline = startTime + options.maxRunSeconds * 1000;

  const stats: ScanResult = {
    fetched: 0,
    created: 0,
    duplicates: 0,
    errors: [],
    duration: 0,
    cursorAdvanced: false,
    exhausted: false,
  };

  try {
    // 1. 加载 Profile + Source
    const profile = await prisma.radarSearchProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new Error(`Profile not found: ${profileId}`);

    const source = await prisma.radarSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    // 2. 读取或初始化游标
    let cursorRecord = await prisma.radarScanCursor.findUnique({
      where: { profileId_sourceId: { profileId, sourceId } },
    });

    let cursor: CursorState = cursorRecord
      ? (cursorRecord.cursorState as CursorState)
      : { nextPage: 0, queryIndex: 0, exhausted: false };

    // 如果上次已 exhausted，重置游标（time-skew buffer: 回退10分钟）
    if (cursor.exhausted) {
      cursor = {
        nextPage: 0,
        queryIndex: 0,
        since: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 条款C
        exhausted: false,
      };
    }

    // 3. 获取适配器
    const adapter = getAdapter(source.code, source.adapterConfig as Record<string, unknown>);

    // 4. 构建基础查询
    const keywords = profile.keywords as Record<string, string[]>;
    const allKeywords = [
      ...(keywords.en || []),
      ...(keywords.zh || []),
      ...(keywords.es || []),
      ...(keywords.ar || []),
    ];
    
    // 注入排除词
    const exclusionRules = (profile.exclusionRules as { negativeKeywords?: string[] }) || {};
    const negativeKeywords = [
      ...(profile.negativeKeywords as string[] || []),
      ...(exclusionRules.negativeKeywords || []),
    ];

    // 查询策略：按关键词+国家组合分批搜索
    // 每次只用1个关键词+1个国家，避免查询过长
    const queryIndex = cursor.queryIndex || 0;
    const countryIndex = Math.floor(queryIndex / Math.max(allKeywords.length, 1));
    const keywordIndex = queryIndex % Math.max(allKeywords.length, 1);
    
    const currentKeyword = allKeywords.length > 0 ? allKeywords[keywordIndex] : undefined;
    const currentCountry = profile.targetCountries.length > 0 
      ? profile.targetCountries[countryIndex % profile.targetCountries.length] 
      : undefined;
    
    // 计算是否还有更多组合
    const totalCombinations = Math.max(allKeywords.length, 1) * Math.max(profile.targetCountries.length, 1);
    const hasMoreCombinations = queryIndex < totalCombinations - 1;

    const baseQuery: RadarSearchQuery = {
      keywords: currentKeyword ? [currentKeyword] : undefined,
      countries: currentCountry ? [currentCountry] : undefined,
      regions: profile.targetRegions.length > 0 ? profile.targetRegions : undefined,
      categories: profile.categoryFilters.length > 0 ? profile.categoryFilters : undefined,
      targetIndustries: profile.industryCodes.length > 0 ? profile.industryCodes : undefined,
      cursor: {
        nextPage: cursor.nextPage,
        nextPageToken: cursor.nextPageToken,
        since: cursor.since,
        queryIndex: cursor.queryIndex,
      },
      maxResults: options.maxResults,
    };

    // 5. 创建审计用 RadarTask
    const task = await prisma.radarTask.create({
      data: {
        tenantId: profile.tenantId,
        name: `Auto-scan: ${profile.name} × ${source.name}`,
        sourceId,
        queryConfig: baseQuery as object,
        triggeredBy: 'scheduler',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // 6. 预算循环
    let iterationCount = 0;
    const initialCursor = { ...cursor };

    while (Date.now() < deadline) {
      // 条款A: 每次迭代前校验锁归属
      if (iterationCount > 0 && iterationCount % 3 === 0) {
        const lockCheck = await prisma.radarSearchProfile.findUnique({
          where: { id: profileId },
          select: { lockToken: true },
        });
        if (lockCheck?.lockToken !== options.lockToken) {
          stats.errors.push('Lock lost - aborting scan');
          break;
        }
      }

      // 重新计算当前关键词和国家
      const queryIndex = cursor.queryIndex || 0;
      const countryIndex = Math.floor(queryIndex / Math.max(allKeywords.length, 1));
      const keywordIndex = queryIndex % Math.max(allKeywords.length, 1);
      
      const currentKeyword = allKeywords.length > 0 ? allKeywords[keywordIndex] : undefined;
      const currentCountry = profile.targetCountries.length > 0 
        ? profile.targetCountries[countryIndex % profile.targetCountries.length] 
        : undefined;
      
      const totalCombinations = Math.max(allKeywords.length, 1) * Math.max(profile.targetCountries.length, 1);
      const hasMoreCombinations = queryIndex < totalCombinations - 1;

      // 执行搜索
      const queryWithCursor: RadarSearchQuery = {
        keywords: currentKeyword ? [currentKeyword] : undefined,
        countries: currentCountry ? [currentCountry] : undefined,
        regions: profile.targetRegions.length > 0 ? profile.targetRegions : undefined,
        categories: profile.categoryFilters.length > 0 ? profile.categoryFilters : undefined,
        targetIndustries: profile.industryCodes.length > 0 ? profile.industryCodes : undefined,
        cursor: {
          nextPage: cursor.nextPage,
          nextPageToken: cursor.nextPageToken,
          since: cursor.since,
          queryIndex: cursor.queryIndex,
        },
        maxResults: options.maxResults,
      };

      const result = await adapter.search(queryWithCursor);
      stats.fetched += result.items.length;

      // 批量处理候选
      for (const item of result.items) {
        // 条款B: 过滤排除词
        if (negativeKeywords.length > 0) {
          const itemText = `${item.displayName} ${item.description || ''}`.toLowerCase();
          if (negativeKeywords.some(kw => itemText.includes(kw.toLowerCase()))) {
            continue;
          }
        }

        try {
          await processCandidate(profile.tenantId, sourceId, task.id, profileId, item, source.ttlDays, source.storagePolicy, stats);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          stats.errors.push(`Candidate error: ${errMsg}`);
        }
      }

      // 更新游标
      if (result.nextCursor) {
        cursor = { ...cursor, ...result.nextCursor };
        stats.cursorAdvanced = true;
      }

      // 当前关键词+国家组合搜索完成
      if (result.isExhausted || !result.hasMore) {
        // 移动到下一个组合
        cursor.queryIndex = (cursor.queryIndex || 0) + 1;
        cursor.nextPage = 0;
        cursor.nextPageToken = undefined;
        stats.cursorAdvanced = true;
        
        // 检查是否还有更多组合
        if (!hasMoreCombinations) {
          // 所有组合都搜索完了
          cursor.exhausted = true;
          cursor.since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          cursor.queryIndex = 0;
          stats.exhausted = true;
          break;
        }
        
        // 继续下一个组合
        stats.cursorAdvanced = true;
      }

      // 速率限制
      await sleep(1000);
      iterationCount++;

      // maxResults 检查
      if (options.maxResults && stats.fetched >= options.maxResults) break;
    }

    // 7. 写回游标（upsert）
    stats.cursorAdvanced = stats.cursorAdvanced || 
      JSON.stringify(cursor) !== JSON.stringify(initialCursor);

    await prisma.radarScanCursor.upsert({
      where: { profileId_sourceId: { profileId, sourceId } },
      create: {
        profileId,
        sourceId,
        cursorState: cursor as object,
        lastScanAt: new Date(),
        scanCount: 1,
        totalFetched: stats.fetched,
        totalNew: stats.created,
        lastError: stats.errors.length > 0 ? stats.errors[0] : null,
      },
      update: {
        cursorState: cursor as object,
        lastScanAt: new Date(),
        scanCount: { increment: 1 },
        totalFetched: { increment: stats.fetched },
        totalNew: { increment: stats.created },
        lastError: stats.errors.length > 0 ? stats.errors[0] : null,
      },
    });

    // 8. 完成审计任务
    stats.duration = Date.now() - startTime;
    await prisma.radarTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        stats: {
          fetched: stats.fetched,
          created: stats.created,
          duplicates: stats.duplicates,
          errors: stats.errors,
          duration: stats.duration,
          cursorAdvanced: stats.cursorAdvanced,
          exhausted: stats.exhausted,
        } as object,
      },
    });

    return stats;
  } catch (error) {
    stats.duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    stats.errors.push(errorMessage);
    return stats;
  }
}

// ==================== 候选处理（upsert 去重） ====================

async function processCandidate(
  tenantId: string,
  sourceId: string,
  taskId: string,
  profileId: string,
  item: NormalizedCandidate,
  ttlDays: number,
  storagePolicy: string,
  stats: { created: number; duplicates: number; errors: string[] }
): Promise<void> {
  const expireAt = ttlDays
    ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    : undefined;

  // 条款B: upsert 避免竞态，使用 sourceId_externalId 复合键
  const result = await prisma.radarCandidate.upsert({
    where: {
      sourceId_externalId: {
        sourceId,
        externalId: item.externalId,
      },
    },
    create: {
      tenantId,
      sourceId,
      taskId,
      profileId,
      candidateType: item.candidateType,
      externalId: item.externalId,
      sourceUrl: item.sourceUrl,
      displayName: item.displayName,
      description: item.description,

      // 公司字段
      website: item.website,
      phone: item.phone,
      email: item.email,
      address: item.address,
      country: item.country,
      city: item.city,
      industry: item.industry,
      companySize: item.companySize,

      // 机会字段
      deadline: item.deadline,
      estimatedValue: item.estimatedValue,
      currency: item.currency,
      buyerName: item.buyerName,
      buyerCountry: item.buyerCountry,
      buyerType: item.buyerType,
      categoryCode: item.categoryCode,
      categoryName: item.categoryName,

      // 匹配信息
      matchExplain: item.matchExplain as object,
      publishedAt: item.publishedAt,

      // TTL 策略
      rawData: storagePolicy !== 'ID_ONLY' ? (item.rawData as object) : undefined,
      expireAt,

      status: 'NEW',
    },
    update: {
      // 仅更新时间戳，不覆盖已有数据
      updatedAt: new Date(),
    },
  });

  // 通过 createdAt 判断是新建还是已存在
  const isNew = Date.now() - result.createdAt.getTime() < 5000;
  if (isNew) {
    stats.created++;
  } else {
    stats.duplicates++;
  }
}

// ==================== 工具函数 ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
