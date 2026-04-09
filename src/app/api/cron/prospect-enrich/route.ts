/**
 * Cron: 已导入线索的深度丰富化 (Decision-Maker Hunting)
 * 
 * 职责：针对已导入线索库的 Tier A/B 公司，自动寻找决策人并填补联系方式。
 * 周期：每 6 小时 (0 *\/6 * * *)
 * 
 * Task #134
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrichProspectCompany } from '@/lib/radar/enrich-pipeline';
import { createNotification } from '@/actions/notifications';

const MAX_BATCH_SIZE = 5; // 深度丰富包含多个 AI 搜索，批次设小
const MAX_RUN_SECONDS = 50;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deadline = Date.now() + MAX_RUN_SECONDS * 1000;
  const stats = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 1. 查找 Tier A/B 且缺失联系人且未失败过的公司
    // 优先处理 Tier A
    const prospects = await db.prospectCompany.findMany({
      where: {
        tier: { in: ['A', 'B'] },
        enrichmentStatus: { not: 'COMPLETED' }, // 包含 null, PENDING, FAILED (可重试)
        contacts: {
          none: {} // 没有任何联系人
        }
      },
      take: MAX_BATCH_SIZE,
      orderBy: [
        { tier: 'asc' }, // A before B
        { lastEnrichedAt: { sort: 'asc', nulls: 'first' } as { sort: 'asc'; nulls: 'first' } }
      ]
    });

    if (prospects.length === 0) {
      return NextResponse.json({ ok: true, message: 'No prospects to enrich' });
    }

    for (const company of prospects) {
      if (Date.now() >= deadline) {
        stats.skipped++;
        continue;
      }

      console.log(`[ProspectEnrich] Enriching: ${company.name} (${company.id})`);
      
      const result = await enrichProspectCompany(company.id);
      
      if (result.success) {
        stats.success++;
        // Task #139: 发送通知
        if (result.personCount && result.personCount > 0) {
          await createNotification({
            tenantId: company.tenantId,
            type: 'tier_a_lead',
            title: `线索已富化：${company.name}`,
            body: `AI 成功为该企业猎寻到 ${result.personCount} 个关键决策人联系方式，可以开始外联。`,
            actionUrl: `/customer/radar/prospects?id=${company.id}`,
          }).catch(() => {});
        }
      } else {
        stats.failed++;
        stats.errors.push(`${company.name}: ${result.error}`);
      }
      stats.processed++;
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error('[prospect-enrich] Fatal Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
