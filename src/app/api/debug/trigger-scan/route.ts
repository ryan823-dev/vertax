/**
 * Debug: 触发立即扫描
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 将所有活跃扫描计划的 nextRunAt 设为现在
    const result = await prisma.radarSearchProfile.updateMany({
      where: { isActive: true },
      data: { nextRunAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      message: `已触发 ${result.count} 个扫描计划`,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[trigger-scan] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
