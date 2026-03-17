import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { optimizeForAI, checkExtractability, type AIPlatform } from '@/lib/marketing/ai-seo';

export const maxDuration = 60;

/**
 * AI SEO优化API
 * POST /api/marketing/ai-seo
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'optimize': {
        const { content, targetQuery, platform, language } = data;
        const result = await optimizeForAI({
          content,
          targetQuery,
          platform: platform as AIPlatform,
          language,
        });

        if (!result.success) {
          return NextResponse.json({
            error: 'Failed to optimize',
            details: result.error,
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'check': {
        const { title, content, hasSchema, lastUpdated, citations, authorExpertise } = data;
        const result = checkExtractability({
          title,
          content,
          hasSchema: hasSchema || false,
          lastUpdated: lastUpdated ? new Date(lastUpdated) : new Date(),
          citations: citations || 0,
          authorExpertise: authorExpertise || '',
        });

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "optimize" or "check".',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[ai-seo] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
