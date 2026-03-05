"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Customer Error]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="bg-[#FFFCF6] border border-[#E7E0D3] rounded-2xl p-8 max-w-md text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#0B1B2B]">页面加载出错</h2>
        <p className="text-sm text-slate-500">
          服务暂时不可用，可能是网络波动或服务冷启动。请稍后重试。
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-sm font-medium hover:bg-[#D4B57A] transition-colors"
        >
          <RefreshCw size={16} />
          重新加载
        </button>
      </div>
    </div>
  );
}
