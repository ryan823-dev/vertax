/**
 * Debug: 初始化涂豆科技的雷达扫描计划
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 涂豆科技租户ID
    const tenantId = 'cmmanspb30000anfp2ldflrov';

    // 检查是否已有扫描计划
    const existing = await prisma.radarSearchProfile.count({
      where: { tenantId },
    });

    if (existing > 0) {
      return NextResponse.json({
        ok: true,
        message: `已有 ${existing} 个扫描计划`,
        skipCreate: true,
      });
    }

    // 获取可用的数据源
    const sources = await prisma.radarSource.findMany({
      where: { isEnabled: true },
      select: { id: true, code: true, name: true },
    });

    // 创建默认扫描计划
    const scheduleRule = '0 6 * * *'; // 每天早6点
    // 立即执行一次
    const nextRunAt = new Date();

    const profile = await prisma.radarSearchProfile.create({
      data: {
        tenantId,
        name: '涂装设备海外买家发现',
        description: '基于企业画像自动创建的扫描计划，发现汽车/工程机械/轨道交通等行业的涂装设备采购需求',
        // 关键词：英文+中文
        keywords: {
          en: [
            'painting robot',
            'coating system',
            'spray booth',
            'paint shop',
            'surface treatment',
            'industrial painting',
            'automotive paint',
            'powder coating',
            'wet paint',
            'paint automation',
          ],
          zh: [
            '喷涂机器人',
            '涂装线',
            '喷漆房',
            '表面处理',
            '工业涂装',
            '汽车涂装',
            '粉末喷涂',
          ],
        },
        // 目标国家（海外市场）
        targetCountries: [
          'US', 'DE', 'FR', 'GB', 'IT', 'ES', // 欧美
          'MX', 'BR', 'AR', // 拉美
          'TH', 'VN', 'ID', 'MY', 'IN', // 东南亚
          'SA', 'AE', 'TR', // 中东
          'ZA', 'EG', // 非洲
        ],
        targetRegions: ['EU', 'APAC', 'LATAM', 'MENA'],
        // 目标行业代码（CPV/UNSPSC相关）
        industryCodes: ['3511', '3512', '3411', '3412'], // 工业机械相关
        categoryFilters: [],
        // 启用的渠道
        enabledChannels: ['TENDER', 'MAPS', 'DIRECTORY'],
        // 使用所有可用数据源
        sourceIds: sources.map(s => s.id),
        // 调度配置
        isActive: true,
        scheduleRule,
        nextRunAt,
        maxRunSeconds: 45,
        autoQualify: true,
        autoEnrich: false,
      },
    });

    return NextResponse.json({
      ok: true,
      message: '扫描计划创建成功',
      profile: {
        id: profile.id,
        name: profile.name,
        isActive: profile.isActive,
        scheduleRule: profile.scheduleRule,
        nextRunAt: profile.nextRunAt,
        sourceCount: sources.length,
        keywords: profile.keywords,
        targetCountries: profile.targetCountries,
      },
      sources: sources.map(s => ({ id: s.id, code: s.code, name: s.name })),
    });
  } catch (error) {
    console.error('[init-radar-profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
