"use client";

import { Globe, Twitter, Linkedin, Instagram, Calendar, TrendingUp, Users } from 'lucide-react';

export default function SocialPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">声量枢纽</h1>
          <p className="text-sm text-slate-500 mt-1">社交媒体管理与品牌传播</p>
        </div>
        <button className="px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors flex items-center gap-2">
          <Calendar size={16} />
          排期发布
        </button>
      </div>

      {/* Social Account Status */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
        <Globe size={20} className="text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">社媒账号未授权</p>
          <p className="text-xs text-amber-600">请授权接入社交媒体账号以启用自动发布功能</p>
        </div>
        <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
          立即授权
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '已发布', value: '0', icon: TrendingUp },
          { label: '待发布', value: '0', icon: Calendar },
          { label: '总互动', value: '0', icon: Users },
          { label: '账号数', value: '0', icon: Globe },
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

      {/* Platform Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-500', status: '未连接' },
          { name: 'Twitter/X', icon: Twitter, color: 'bg-slate-800', status: '未连接' },
          { name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 to-pink-500', status: '未连接' },
        ].map((platform) => (
          <div key={platform.name} className="bg-[#FFFCF6] rounded-xl border border-[#E7E0D3] p-6 text-center">
            <div className={`w-12 h-12 ${platform.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <platform.icon size={24} className="text-white" />
            </div>
            <h4 className="font-medium text-[#0B1B2B]">{platform.name}</h4>
            <p className="text-xs text-slate-400 mt-1">{platform.status}</p>
            <button className="mt-4 px-4 py-2 border border-[#E7E0D3] rounded-lg text-xs text-slate-600 hover:border-[#C7A56A]/50 transition-colors">
              连接账号
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
