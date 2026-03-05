import { Radar, Loader2 } from 'lucide-react';

/**
 * 获客雷达模块加载状态
 */
export default function RadarLoading() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-[#F7F3EA] rounded-2xl flex items-center justify-center">
            <Radar className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
          </div>
        </div>
        <p className="text-sm text-slate-500">加载中...</p>
      </div>
    </div>
  );
}
