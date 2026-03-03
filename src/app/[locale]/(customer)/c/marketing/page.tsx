"use client";

import { BarChart3, FileText, PenTool, Search, TrendingUp, Globe } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">营销系统</h1>
          <p className="text-sm text-slate-500 mt-1">SEO内容生产与分发</p>
        </div>
        <button className="px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors flex items-center gap-2">
          <PenTool size={16} />
          创建内容
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '内容资产', value: '3', icon: FileText },
          { label: '待发布', value: '2', icon: TrendingUp },
          { label: '关键词排名', value: '0', icon: Search },
          { label: '流量增长', value: '+0%', icon: BarChart3 },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#FFFCF6] rounded-xl border border-[#E7E0D3] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className="text-[#C7A56A]" />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
        <h3 className="font-bold text-[#0B1B2B] mb-4">内容生产流水线</h3>
        <div className="text-center py-16">
          <BarChart3 size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">营销内容管理功能开发中</p>
          <p className="text-xs text-slate-400 mt-2">即将支持AI生成SEO文章、产品页、案例页</p>
        </div>
      </div>
    </div>
  );
}
