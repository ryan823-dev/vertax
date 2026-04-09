// ==================== VertaX Middleware ====================
// 全局请求中间件：认证、多租户、调试路由保护

import { NextRequest, NextResponse } from 'next/server';

// 需要保护的路由路径
const _PROTECTED_PATTERNS = [
  '/api/debug/',
  '/api/cron/debug',
];

const CRON_ROUTES = [
  '/api/cron/',
  '/api/radar/sync',
];

// 开发/测试环境允许的路由
const _ALLOWED_IN_PRODUCTION = [
  '/api/health',
  '/api/debug/route.ts', // 保留基本的健康检查
];

/**
 * 检查请求是否应该被阻止
 */
function shouldBlockRequest(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;

  // 非生产环境：允许所有请求
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // 1. 完全阻止所有 /api/debug/ 路由
  if (path.startsWith('/api/debug/')) {
    return NextResponse.json(
      {
        error: 'Debug routes disabled in production',
        message: 'Set DEBUG_ROUTES_ENABLED=true to enable',
        environment: process.env.NODE_ENV,
      },
      { status: 403 }
    );
  }

  // 2. Cron 路由需要密钥
  const isCronRoute = CRON_ROUTES.some(route => path.startsWith(route));
  if (isCronRoute) {
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  // 检查是否需要阻止
  const blockResponse = shouldBlockRequest(request);
  if (blockResponse) {
    return blockResponse;
  }

  // 继续处理请求
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 匹配所有 API 路由
    '/api/:path*',
    // 排除静态文件和 Next.js 内部路由
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
