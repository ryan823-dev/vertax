"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Radar, RefreshCw } from "lucide-react";

export default function RadarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Radar Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const isNetworkError = error.message?.includes("fetch") || error.message?.includes("network");
  const isAuthError = error.message?.includes("Unauthorized") || error.message?.includes("认证");
  const isTimeout = error.message?.includes("timeout") || error.message?.includes("超时");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FDFBF7_0%,#F9F5EC_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] max-w-[720px] items-center justify-center">
        <div className="w-full rounded-[28px] border border-[#E8E0D0] bg-white/90 p-8 shadow-[0_24px_60px_-36px_rgba(11,27,43,0.45)] backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-center">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                <Radar className="h-8 w-8 text-amber-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                <AlertTriangle className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-center text-xl font-bold text-[#0B1B2B]">
            {isAuthError ? "认证已过期" : isNetworkError ? "网络连接异常" : isTimeout ? "请求超时" : "页面加载出错"}
          </h2>

          <p className="mt-3 text-center text-sm leading-6 text-slate-500">
            {isAuthError
              ? "你的登录状态已经失效，请重新登录后继续使用。"
              : isNetworkError
                ? "无法连接到服务器，请检查网络后重试。"
                : isTimeout
                  ? "服务响应超时，可能是网络波动或任务排队较久。"
                  : "雷达模块暂时不可用，请稍后重试。如果问题持续，请联系技术支持。"}
          </p>

          {error.digest && (
            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-center text-xs text-slate-400">
                <span className="font-medium">错误追踪码</span>{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1B2B] px-5 py-3 text-sm font-medium text-[#D4AF37] transition-colors hover:bg-[#10263B]"
            >
              <RefreshCw size={16} />
              重新加载
            </button>

            <Link
              href="/customer/radar"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              <ArrowLeft size={16} />
              返回雷达首页
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <Link href="/customer/home" className="transition-colors hover:text-[#D4AF37]">
              工作台
            </Link>
            <span>·</span>
            <Link href="/customer/radar/search" className="transition-colors hover:text-[#D4AF37]">
              自动搜索
            </Link>
            <span>·</span>
            <button onClick={() => window.location.reload()} className="transition-colors hover:text-[#D4AF37]">
              刷新页面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
