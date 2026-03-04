"use client";

/**
 * 获客雷达模块错误边界
 * 
 * 提供友好的错误展示和恢复选项
 * 记录错误 digest 便于排查
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft, Radar } from "lucide-react";

export default function RadarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台（生产环境可接入日志服务）
    console.error("[Radar Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  // 根据错误信息判断类型
  const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');
  const isAuthError = error.message?.includes('Unauthorized') || error.message?.includes('认证');
  const isTimeout = error.message?.includes('timeout') || error.message?.includes('超时');

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
      <div className="bg-white border border-[#E7E0D3] rounded-2xl p-8 max-w-lg w-full shadow-lg">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
              <Radar className="w-8 h-8 text-amber-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-[#0B1B2B] text-center mb-2">
          {isAuthError ? '认证已过期' : isNetworkError ? '网络连接异常' : isTimeout ? '请求超时' : '页面加载出错'}
        </h2>

        {/* Description */}
        <p className="text-sm text-slate-500 text-center mb-6">
          {isAuthError 
            ? '您的登录状态已失效，请重新登录后继续使用。'
            : isNetworkError 
              ? '无法连接到服务器，请检查网络连接后重试。'
              : isTimeout
                ? '服务响应超时，可能是网络波动或服务繁忙，请稍后重试。'
                : '获客雷达服务暂时不可用，请稍后重试。如果问题持续，请联系技术支持。'}
        </p>

        {/* Error Digest */}
        {error.digest && (
          <div className="mb-6 p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 text-center">
              <span className="font-medium">错误追踪码:</span>{' '}
              <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{error.digest}</code>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
          >
            <RefreshCw size={16} />
            重新加载
          </button>
          
          <Link
            href="/c/radar"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
            返回雷达首页
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/c" className="hover:text-[#C7A56A]">工作台</Link>
          <span>·</span>
          <Link href="/help" className="hover:text-[#C7A56A]">帮助中心</Link>
          <span>·</span>
          <button 
            onClick={() => window.location.reload()} 
            className="hover:text-[#C7A56A]"
          >
            刷新页面
          </button>
        </div>
      </div>
    </div>
  );
}
