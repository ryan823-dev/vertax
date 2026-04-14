/**
 * Cron: 鍟嗘満鎺ㄩ€侀€氱煡
 * 
 * 姣忓ぉ鎺ㄩ€佹柊鍙戠幇鐨勫晢鏈虹粰绉熸埛绠＄悊鍛?
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { COMPANY_ADMIN_ROLE_CANDIDATES } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { sendNewCandidatesNotification } from '@/lib/email/resend-client';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const stats = {
    tenantsNotified: 0,
    totalCandidates: 0,
    errors: [] as string[],
  };

  try {
    // 鏌ユ壘鎵€鏈夋湁鏂板€欓€夌殑绉熸埛
    // 鍏堟煡璇㈡湁鏂板€欓€夌殑绉熸埛ID
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
              name: {
                in: [...COMPANY_ADMIN_ROLE_CANDIDATES],
              },
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

      // 缁熻璇ョ鎴风殑鏂板€欓€夋暟閲?
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

      // 鑾峰彇璇ョ鎴风殑鏂板€欓€夛紙鎸夎瘎鍒嗘帓搴忥級
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

      // 鍙戦€侀偖浠剁粰姣忎釜绠＄悊鍛?
      for (const admin of tenant.users) {
        if (!admin.email) continue;

        const result = await sendNewCandidatesNotification({
          to: admin.email,
          tenantId: tenant.id, // 浼犻€掔鎴稩D浠ヤ娇鐢ㄥ叾閭欢閰嶇疆
          tenantName: tenant.name,
          newCandidatesCount: newCount,
          topCandidates: newCandidates,
          dashboardUrl: `https://vertax.top/zh-CN/customer/radar/candidates`,
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

