import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCopy, type CopyType } from '@/lib/marketing/copywriting';

export const maxDuration = 60;

/**
 * 生成营销文案API
 * POST /api/marketing/copywriting
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      companyName,
      industry,
      targetAudience,
      mainProblem,
      solution,
      keyBenefits,
      differentiators,
      proofPoints,
      tone,
      language,
      maxLength,
    } = body;

    if (!type || !companyName || !mainProblem) {
      return NextResponse.json({
        error: 'Missing required fields: type, companyName, mainProblem',
      }, { status: 400 });
    }

    const result = await generateCopy({
      type: type as CopyType,
      companyName,
      industry: industry || '',
      targetAudience: targetAudience || '',
      mainProblem,
      solution: solution || '',
      keyBenefits: keyBenefits || [],
      differentiators: differentiators || [],
      proofPoints: proofPoints || [],
      tone,
      language,
      maxLength,
    });

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to generate copy',
        details: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[copywriting] Error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
