import { Loader2, Radar } from "lucide-react";

export default function RadarLoading() {
  return (
    <div className="min-h-screen bg-[var(--ci-bg)] px-6">
      <div className="mx-auto flex min-h-screen max-w-[1680px] items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F7F3EA] shadow-[0_16px_32px_-24px_rgba(11,27,43,0.45)]">
              <Radar className="h-8 w-8 text-[var(--ci-accent)]" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--ci-accent)]" />
            </div>
          </div>
          <p className="text-sm text-slate-500">雷达模块正在加载...</p>
        </div>
      </div>
    </div>
  );
}
