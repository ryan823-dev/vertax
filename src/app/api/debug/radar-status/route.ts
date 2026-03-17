/**
 * Debug: 雷达系统状态检查
 * 用于诊断获客雷达是否正确配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // 简单的 secret 验证
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      sourcesCount,
      profilesCount,
      activeProfilesCount,
      candidatesCount,
      candidatesByStatus,
      candidatesByTier,
      recentCandidates,
      excludedCandidates,
      qualifiedCandidates,
    ] = await Promise.all([
      // 数据源总数
      prisma.radarSource.count(),
      // 扫描计划总数
      prisma.radarSearchProfile.count(),
      // 活跃扫描计划数
      prisma.radarSearchProfile.count({ where: { isActive: true } }),
      // 候选总数
      prisma.radarCandidate.count(),
      // 按状态分组
      prisma.radarCandidate.groupBy({
        by: ['status'],
        _count: true,
      }),
      // 按层级分组
      prisma.radarCandidate.groupBy({
        by: ['qualifyTier'],
        _count: true,
      }),
      // 最近10条候选
      prisma.radarCandidate.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          status: true,
          qualifyTier: true,
          sourceId: true,
          createdAt: true,
        },
      }),
      // 被排除的候选详情
      prisma.radarCandidate.findMany({
        where: { status: 'EXCLUDED' },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          industry: true,
          country: true,
          website: true,
          phone: true,
          description: true,
          qualifyReason: true,
          matchScore: true,
        },
      }),
      // 合格的候选详情（用于分析数据质量）
      prisma.radarCandidate.findMany({
        where: { status: 'QUALIFIED' },
        take: 20,
        orderBy: { enrichedAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          industry: true,
          country: true,
          website: true,
          phone: true,
          description: true,
          qualifyReason: true,
          matchScore: true,
          enrichedAt: true,
        },
      }),
    ]);

    // 获取数据源列表
    const sources = await prisma.radarSource.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        channelType: true,
        isEnabled: true,
        isOfficial: true,
      },
    });

    // 获取扫描计划列表
    const profiles = await prisma.radarSearchProfile.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        scheduleRule: true,
        lastRunAt: true,
        nextRunAt: true,
        sourceIds: true,
        keywords: true,
        targetCountries: true,
        exclusionRules: true,
      },
    });

    // 获取租户列表及其 Persona/CompanyProfile
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        personas: {
          select: { id: true, name: true, title: true, concerns: true },
        },
        companyProfile: {
          select: {
            companyName: true,
            targetIndustries: true,
            targetRegions: true,
          },
        },
      },
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tenants,
      summary: {
        sources: sourcesCount,
        profiles: profilesCount,
        activeProfiles: activeProfilesCount,
        candidates: candidatesCount,
      },
      sources,
      profiles,
      candidatesByStatus: candidatesByStatus.reduce((acc, c) => {
        acc[c.status] = c._count;
        return acc;
      }, {} as Record<string, number>),
      candidatesByTier: candidatesByTier.reduce((acc, c) => {
        acc[c.qualifyTier || 'null'] = c._count;
        return acc;
      }, {} as Record<string, number>),
      recentCandidates,
      excludedCandidates,
      diagnosis: {
        hasSources: sourcesCount > 0,
        hasProfiles: profilesCount > 0,
        hasActiveProfiles: activeProfilesCount > 0,
        hasCandidates: candidatesCount > 0,
        canRun: sourcesCount > 0 && activeProfilesCount > 0,
        issues: [
          ...(sourcesCount === 0 ? ['没有配置数据源 (RadarSource)'] : []),
          ...(profilesCount === 0 ? ['没有配置扫描计划 (RadarSearchProfile)'] : []),
          ...(activeProfilesCount === 0 && profilesCount > 0 ? ['所有扫描计划都已暂停'] : []),
        ],
      },
    });
  } catch (error) {
    console.error('[radar-status] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
