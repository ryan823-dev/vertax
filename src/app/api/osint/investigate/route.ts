// ==================== OSINT企业背调API ====================
// 提供企业背调调查的API端点

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createInvestigationEngine } from '@/lib/osint';
import type { CompanyInvestigationQuery } from '@/lib/osint';
import { normalizeInvestigationDepth, normalizeInvestigationLayers } from '@/lib/osint/query';

/**
 * POST /api/osint/investigate
 * 执行企业背调调查
 *
 * Request Body:
 * {
 *   companyName: string;       // 必需
 *   domain?: string;           // 可选
 *   country?: string;          // 可选
 *   depth?: 'basic' | 'standard' | 'deep';  // 默认standard
 *   layers?: string[];         // 可选，指定执行的层级
 *   options?: {                // 可选配置
 *     scrapeWebsite?: boolean;
 *     checkWhois?: boolean;
 *     checkLinkedIn?: boolean;
 *     checkShareholders?: boolean;
 *     checkRisk?: boolean;
 *     checkBusiness?: boolean;
 *     maxAssociationDepth?: number;
 *     language?: string;
 *   };
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   report: CompanyInvestigationReport;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // 验证必需参数
    if (!body.companyName) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数: companyName' },
        { status: 400 }
      );
    }

    // 构建查询
    const query: CompanyInvestigationQuery = {
      companyName: body.companyName,
      domain: body.domain,
      country: body.country,
      depth: normalizeInvestigationDepth(body.depth),
      layers: normalizeInvestigationLayers(body.layers),
      options: body.options,
    };

    // 创建调查引擎并执行调查
    const engine = createInvestigationEngine();
    const report = await engine.investigate(query);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[OSINT API] Investigation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '调查失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/osint/investigate
 * 快速企业背调（查询参数）
 *
 * Query Parameters:
 * - company: 企业名称 (必需)
 * - domain: 已知域名 (可选)
 * - country: 所在国家 (可选)
 * - depth: 调查深度 (basic/standard/deep)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const companyName = searchParams.get('company');
    if (!companyName) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数: company' },
        { status: 400 }
      );
    }

    const domain = searchParams.get('domain') || undefined;
    const country = searchParams.get('country') || undefined;
    const depth = normalizeInvestigationDepth(searchParams.get('depth'));

    // 构建查询
    const query: CompanyInvestigationQuery = {
      companyName,
      domain,
      country,
      depth,
    };

    // 创建调查引擎并执行调查
    const engine = createInvestigationEngine();
    const report = await engine.investigate(query);

    // 返回简化报告
    return NextResponse.json({
      success: true,
      summary: {
        companyName: report.query.companyName,
        authenticityScore: report.authenticityScore,
        overallRisk: report.overallRisk,
        keyFindings: report.keyFindings.slice(0, 5),
        suspiciousSignals: report.suspiciousSignals,
        recommendations: report.recommendations,
        duration: report.duration,
      },
      fullReport: report,
    });
  } catch (error) {
    console.error('[OSINT API] Investigation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '调查失败',
      },
      { status: 500 }
    );
  }
}
