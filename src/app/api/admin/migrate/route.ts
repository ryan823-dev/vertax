/**
 * 数据库迁移API
 *
 * 执行Prisma db push来更新数据库schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  // 验证密钥
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 在生产环境中，Vercel会自动运行prisma db push
    // 这里只是一个备用方案
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --skip-generate', {
      env: process.env,
      timeout: 60000,
    });

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      { error: 'Migration failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}