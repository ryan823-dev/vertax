/**
 * Debug: 测试单个适配器 + 写入数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter, ensureAdaptersInitialized } from '@/lib/radar/adapters';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sourceCode = req.nextUrl.searchParams.get('source') || 'google_places';
  const keyword = req.nextUrl.searchParams.get('keyword') || 'painting robot';
  const country = req.nextUrl.searchParams.get('country') || 'US';
  const save = req.nextUrl.searchParams.get('save') === 'true';

  try {
    ensureAdaptersInitialized();
    const adapter = getAdapter(sourceCode, {});

    const startTime = Date.now();
    
    const query = {
      keywords: [keyword],
      countries: [country],
      pageSize: 20,
    };
    
    console.log(`[test-adapter] Testing ${sourceCode} with query:`, query);
    
    const result = await adapter.search(query);
    
    console.log(`[test-adapter] Result: ${result.items.length} items`);

    // 如果 save=true，尝试写入数据库
    let savedCount = 0;
    let saveErrors: string[] = [];
    
    if (save && result.items.length > 0) {
      const tenantId = 'cmmanspb30000anfp2ldflrov'; // 涂豆科技
      const source = await prisma.radarSource.findFirst({
        where: { code: sourceCode },
      });
      
      if (!source) {
        throw new Error(`Source not found: ${sourceCode}`);
      }
      
      for (const item of result.items.slice(0, 5)) {
        try {
          await prisma.radarCandidate.create({
            data: {
              tenantId,
              sourceId: source.id,
              candidateType: item.candidateType,
              externalId: item.externalId,
              sourceUrl: item.sourceUrl,
              displayName: item.displayName,
              description: item.description,
              website: item.website,
              phone: item.phone,
              country: item.country,
              city: item.city,
              industry: item.industry,
              status: 'NEW',
              rawData: item.rawData as object,
            },
          });
          savedCount++;
        } catch (e) {
          saveErrors.push(`${item.displayName}: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }
    }

    return NextResponse.json({
      sourceCode,
      query,
      duration: Date.now() - startTime,
      fetched: result.items.length,
      total: result.total,
      candidates: result.items.slice(0, 5).map(c => ({
        displayName: c.displayName,
        country: c.country,
        website: c.website,
        sourceUrl: c.sourceUrl,
        externalId: c.externalId,
        candidateType: c.candidateType,
      })),
      isExhausted: result.isExhausted,
      saved: savedCount,
      saveErrors,
    });
  } catch (error) {
    console.error(`[test-adapter] Error:`, error);
    return NextResponse.json({
      sourceCode,
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
    }, { status: 500 });
  }
}
