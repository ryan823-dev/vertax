"use client";

/**
 * 目标客户画像配置页面
 *
 * 允许用户自定义获客雷达的评分规则，定义什么样的公司是目标客户
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, BookOpen, Zap } from 'lucide-react';
import { ScoringProfileConfig } from '@/components/knowledge/scoring-profile-config';

export default function ScoringProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B1018]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/c/knowledge/profiles"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">目标客户画像配置</h1>
              <p className="text-sm text-white/60 mt-1">
                定义什么样的公司是你的目标客户，获客雷达将根据这些规则评分
              </p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Zap className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">正向信号</p>
                <p className="text-xs text-white/50 mt-0.5">匹配后加分，分数越高越优质</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Zap className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">负向信号</p>
                <p className="text-xs text-white/50 mt-0.5">匹配后直接排除，不进入候选池</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="p-2 rounded-lg bg-[#D4AF37]/20">
                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">层级阈值</p>
                <p className="text-xs text-white/50 mt-0.5">A/B/C三级客户分层标准</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-lg bg-[#0f172a]/50 border border-[#D4AF37]/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <p className="font-medium text-white mb-1">为什么要配置评分规则？</p>
              <ul className="space-y-1 text-white/60">
                <li>• <strong>精准匹配</strong>：您最了解自己的目标客户，自定义规则比AI猜测更准确</li>
                <li>• <strong>排除无效</strong>：排除零售商、供应商等非目标客户，节省筛选时间</li>
                <li>• <strong>持续优化</strong>：根据获客效果不断调整规则，提升匹配精度</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Configuration Component */}
        <div className="p-6 rounded-xl bg-[#0f172a]/30 border border-white/5">
          <ScoringProfileConfig />
        </div>

        {/* How it works */}
        <div className="mt-8 p-6 rounded-xl bg-[#0f172a]/50 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">评分规则如何工作？</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="text-[#D4AF37] font-bold">1</span>
              </div>
              <p className="text-sm text-white/70">获客雷达发现新候选</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="text-[#D4AF37] font-bold">2</span>
              </div>
              <p className="text-sm text-white/70">检查负向信号（排除）</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="text-[#D4AF37] font-bold">3</span>
              </div>
              <p className="text-sm text-white/70">计算正向信号得分</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="text-[#D4AF37] font-bold">4</span>
              </div>
              <p className="text-sm text-white/70">按阈值分A/B/C层级</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}