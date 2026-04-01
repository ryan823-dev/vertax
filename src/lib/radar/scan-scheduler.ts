// ==================== Radar Scan Scheduler ====================
// 调度器：乐观锁争抢 + nextRunAt 计算 + 多 Source 增量扫描

import { prisma } from '@/lib/prisma';
import { CronExpressionParser } from 'cron-parser';
import { ensureAdaptersInitialized } from './adapters';
import { runIncrementalScan, type ScanResult } from './scan-engine';

// ==================== 类型定义 ====================

export interface SchedulerResult {
  profilesProcessed: number;
  totalNew: number;
  totalDuplicates: number;
  totalDuration: number;
  profiles: Array<{
    profileId: string;
    name: string;
    sources: Array<{ sourceId: string; sourceCode: string; result: ScanResult }>;
    error?: string;
  }>;
  errors: string[];
}

// ==================== 调度器核心 ====================

const MAX_PROFILES_PER_RUN = 5;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5分钟死锁超时

export async function runScheduledScans(): Promise<SchedulerResult> {
  ensureAdaptersInitialized();
  const startTime = Date.now();
  const instanceId = `${process.env.VERCEL_REGION || 'local'}_${Date.now()}`;

  const result: SchedulerResult = {
    profilesProcessed: 0,
    totalNew: 0,
    totalDuplicates: 0,
    totalDuration: 0,
    profiles: [],
    errors: [],
  };

  try {
    // 1. 查询到期 Profile
    const now = new Date();
    const dueProfiles = await prisma.radarSearchProfile.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
      take: MAX_PROFILES_PER_RUN,
    });

    if (dueProfiles.length === 0) {
      result.totalDuration = Date.now() - startTime;
      return result;
    }

    // 2. 对每个 Profile 争抢乐观锁
    for (const profile of dueProfiles) {
      const lockToken = crypto.randomUUID();
      const fiveMinutesAgo = new Date(Date.now() - LOCK_TIMEOUT_MS);

      // CAS 乐观锁
      const lockResult = await prisma.radarSearchProfile.updateMany({
        where: {
          id: profile.id,
          OR: [
            { lockToken: null },
            { lockedAt: { lt: fiveMinutesAgo } }, // 死锁超时释放
          ],
        },
        data: {
          lockToken,
          lockedAt: now,
          lockedBy: instanceId,
        },
      });

      if (lockResult.count === 0) {
        // 被其他实例抢走，跳过
        continue;
      }

      // 3. 获锁成功，执行扫描
      const profileResult: SchedulerResult['profiles'][number] = {
        profileId: profile.id,
        name: profile.name,
        sources: [],
      };

      try {
        // 解析 sourceIds，查找对应的 Source
        const sources = await prisma.radarSource.findMany({
          where: {
            id: { in: profile.sourceIds },
            isEnabled: true,
          },
        });

        for (const source of sources) {
          try {
            const scanResult = await runIncrementalScan(
              profile.id,
              source.id,
              {
                maxRunSeconds: profile.maxRunSeconds,
                lockToken,
              }
            );

            profileResult.sources.push({
              sourceId: source.id,
              sourceCode: source.code,
              result: scanResult,
            });

            result.totalNew += scanResult.created;
            result.totalDuplicates += scanResult.duplicates;
          } catch (sourceError) {
            const errMsg = sourceError instanceof Error ? sourceError.message : 'Unknown';
            profileResult.sources.push({
              sourceId: source.id,
              sourceCode: source.code,
              result: {
                fetched: 0, created: 0, duplicates: 0,
                errors: [errMsg], duration: 0,
                cursorAdvanced: false, exhausted: false,
              },
            });
            result.errors.push(`Source ${source.code}: ${errMsg}`);
          }
        }

        // 4. 释放锁 + 更新统计（条款A: 用 lockToken 条件释放）
        const nextRunAt = computeNextRunAt(profile.scheduleRule);
        const existingStats = (profile.runStats as Record<string, number>) || {};
        const totalNew = profileResult.sources.reduce((sum, s) => sum + s.result.created, 0);

        const releaseResult = await prisma.radarSearchProfile.updateMany({
          where: { id: profile.id, lockToken }, // 条款A: 条件释放
          data: {
            lockToken: null,
            lockedAt: null,
            lockedBy: null,
            lastRunAt: now,
            nextRunAt,
            runStats: {
              totalRuns: ((existingStats.totalRuns as number) || 0) + 1,
              totalNew: ((existingStats.totalNew as number) || 0) + totalNew,
              lastError: result.errors.length > 0 ? result.errors[result.errors.length - 1] : null,
              avgDurationMs: Date.now() - startTime,
            } as object,
          },
        });

        if (releaseResult.count === 0) {
          result.errors.push(`Lock lost for profile ${profile.id} during release`);
        }

        result.profilesProcessed++;
      } catch (profileError) {
        const errMsg = profileError instanceof Error ? profileError.message : 'Unknown';
        profileResult.error = errMsg;
        result.errors.push(`Profile ${profile.name}: ${errMsg}`);

        // 即使出错也要尝试释放锁
        await prisma.radarSearchProfile.updateMany({
          where: { id: profile.id, lockToken },
          data: { lockToken: null, lockedAt: null, lockedBy: null },
        }).catch(() => {}); // 静默失败
      }

      result.profiles.push(profileResult);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    result.errors.push(`Scheduler error: ${errMsg}`);
  }

  result.totalDuration = Date.now() - startTime;
  return result;
}

// ==================== 工具函数 ====================

/**
 * 根据 cron 表达式计算下次运行时间
 */
function computeNextRunAt(scheduleRule: string): Date {
  try {
    const interval = CronExpressionParser.parse(scheduleRule);
    return interval.next().toDate();
  } catch (error) {
    console.warn('[computeNextRunAt] Invalid cron expression:', error);
    return new Date(Date.now() + 6 * 60 * 60 * 1000);
  }
}

/**
 * 为新创建的 Profile 初始化 nextRunAt
 */
export function computeInitialNextRunAt(scheduleRule: string): Date {
  return computeNextRunAt(scheduleRule);
}
