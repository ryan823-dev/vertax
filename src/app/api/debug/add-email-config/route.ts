/**
 * Debug: 应用数据库 schema 变更
 * 
 * 添加 Tenant.emailConfig 字段
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 检查字段是否存在
    const checkResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Tenant' 
      AND column_name = 'emailConfig'
    `;

    if (Array.isArray(checkResult) && checkResult.length > 0) {
      return NextResponse.json({
        ok: true,
        message: 'emailConfig column already exists',
        exists: true,
      });
    }

    // 添加字段
    await prisma.$executeRaw`
      ALTER TABLE "Tenant" 
      ADD COLUMN "emailConfig" JSONB
    `;

    return NextResponse.json({
      ok: true,
      message: 'emailConfig column added successfully',
      exists: false,
    });
  } catch (error) {
    console.error('[add-email-config] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
