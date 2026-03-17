/**
 * Cron: 商机推送通知
 * 
 * 每天推送新发现的商机给租户管理员
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNewCandidatesNotification } from '@/lib/email/resend-client';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = {
    tenantsNotified: 0,
    totalCandidates: 0,
    errors: [] as string[],
  };

  try {
    // 查找所有有新候选的租户
    // 先查询有新候选的租户ID
    const tenantIdsWithNewCandidates = await prisma.radarCandidate.findMany({
      where: {
        status: 'NEW',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    const tenantIds = tenantIdsWithNewCandidates.map(c => c.tenantId);

    if (tenantIds.length === 0) {
      return NextResponse.json({ ok: true, ...stats, message: 'No new candidates' });
    }

    const tenants = await prisma.tenant.findMany({
      where: {
        id: { in: tenantIds },
        status: 'active',
      },
      include: {
        users: {
          where: {
            role: {
              name: 'COMPANY_ADMIN',
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    for (const tenant of tenants) {
      if (tenant.users.length === 0) continue;

      // 统计该租户的新候选数量
      const newCount = await prisma.radarCandidate.count({
        where: {
          tenantId: tenant.id,
          status: 'NEW',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (newCount === 0) continue;

      // 获取该租户的新候选（按评分排序）
      const newCandidates = await prisma.radarCandidate.findMany({
        where: {
          tenantId: tenant.id,
          status: 'NEW',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: [
          { qualifyTier: 'asc' }, // A > B > C
          { createdAt: 'desc' },
        ],
        take: 10,
        select: {
          displayName: true,
          country: true,
          website: true,
          qualifyTier: true,
        },
      });

      stats.totalCandidates += newCount;

      // 发送邮件给每个管理员
      for (const admin of tenant.users) {
        if (!admin.email) continue;

        const result = await sendNewCandidatesNotification({
          to: admin.email,
          tenantId: tenant.id, // 传递租户ID以使用其邮件配置
          tenantName: tenant.name,
          newCandidatesCount: newCount,
          topCandidates: newCandidates,
          dashboardUrl: `https://vertax.top/zh-CN/c/radar/candidates`,
        });

        if (result.success) {
          stats.tenantsNotified++;
        } else {
          stats.errors.push(`${tenant.name} (${admin.email}): ${result.error}`);
        }
      }
    }

    console.log(
      `[radar-notify] Notified ${stats.tenantsNotified} tenants, ` +
      `total ${stats.totalCandidates} new candidates`
    );

    return NextResponse.json({
      ok: true,
      ...stats,
    });
  } catch (error) {
    console.error('[radar-notify] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
