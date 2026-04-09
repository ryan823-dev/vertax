import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMicroserviceUrl, getMicroserviceApiKey } from '@/lib/processing-service';

/**
 * 微服务处理 API
 * 
 * 调用独立部署的文档处理微服务进行：
 * - PDF/Word 文档提取
 * - 图片 OCR
 * - 视频帧 OCR
 */
export async function POST(req: NextRequest) {
  try {
    // 认证检查
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
    }

    // 检查微服务配置
    const microserviceUrl = getMicroserviceUrl();
    const apiKey = getMicroserviceApiKey();

    if (!microserviceUrl || !apiKey) {
      return NextResponse.json({ 
        error: '微服务未配置',
        hint: '请设置 PROCESSOR_SERVICE_URL 和 PROCESSOR_API_KEY 环境变量'
      }, { status: 500 });
    }

    // 获取资产信息
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        tenantId: session.user.tenantId,
        status: 'active',
      },
    });

    if (!asset) {
      return NextResponse.json({ error: '资产不存在' }, { status: 404 });
    }

    // 更新状态为处理中
    const currentMeta = (asset.metadata || {}) as Record<string, unknown>;
    await db.asset.update({
      where: { id: assetId },
      data: {
        metadata: {
          ...currentMeta,
          processingStatus: 'processing',
          processor: 'microservice',
          processingError: undefined,
        },
      },
    });

    // 调用微服务
    const response = await fetch(`${microserviceUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        tenantId: session.user.tenantId,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `微服务请求失败: ${response.status}`);
    }

    const result = await response.json();

    // 微服务已经保存了 chunks 和更新了状态
    // 这里我们只需要确认状态

    return NextResponse.json({
      success: true,
      assetId,
      textLength: result.textLength,
      chunkCount: result.chunkCount,
      processor: 'microservice',
    });

  } catch (error) {
    console.error('[Microservice API] Error:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : '处理失败',
    }, { status: 500 });
  }
}

/**
 * 检查微服务健康状态
 */
export async function GET() {
  const microserviceUrl = getMicroserviceUrl();
  const apiKey = getMicroserviceApiKey();

  if (!microserviceUrl || !apiKey) {
    return NextResponse.json({
      configured: false,
      reason: 'PROCESSOR_SERVICE_URL 或 PROCESSOR_API_KEY 未设置',
    });
  }

  try {
    const response = await fetch(`${microserviceUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        url: microserviceUrl,
        healthy: false,
        reason: `微服务响应异常: ${response.status}`,
      });
    }

    const data = await response.json();
    return NextResponse.json({
      configured: true,
      url: microserviceUrl,
      healthy: true,
      timestamp: data.timestamp,
    });

  } catch (error) {
    return NextResponse.json({
      configured: true,
      url: microserviceUrl,
      healthy: false,
      reason: error instanceof Error ? error.message : '无法连接微服务',
    });
  }
}
