import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

/**
 * 导出候选数据
 * GET /api/debug/export-candidates?secret=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const candidates = await prisma.radarCandidate.findMany({
      where: {
        tenantId: 'cmmanspb30000anfp2ldflrov',
        status: { in: ['QUALIFIED', 'NEW'] },
      },
      orderBy: [
        { qualifyTier: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        displayName: true,
        industry: true,
        country: true,
        website: true,
        phone: true,
        description: true,
        qualifyTier: true,
        qualifyReason: true,
        status: true,
        sourceUrl: true,
        createdAt: true,
        source: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      total: candidates.length,
      candidates: candidates.map(c => ({
        ...c,
        sourceName: c.source?.name || null,
        source: undefined,
      })),
    });
  } catch (error) {
    console.error('[export-candidates] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
