"use client";

import { Radar, Search, Building2, Mail, Phone, Globe, MapPin, TrendingUp } from 'lucide-react';

// Mock leads data
const mockLeads = [
  { 
    id: '1', 
    company: 'Tesla Manufacturing', 
    industry: '汽车制造',
    region: '北美',
    score: 85,
    status: '高意向',
    contact: 'john@tesla.com',
  },
  { 
    id: '2', 
    company: 'Bosch Automotive', 
    industry: '汽车零部件',
    region: '欧洲',
    score: 72,
    status: '待跟进',
    contact: 'info@bosch.com',
  },
];

export default function RadarPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">获客雷达</h1>
          <p className="text-sm text-slate-500 mt-1">AI智能挖掘全球潜在客户</p>
        </div>
        <button className="px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors flex items-center gap-2">
          <Search size={16} />
          启动AI调研
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '已发现线索', value: '0', icon: Radar },
          { label: '高意向客户', value: '0', icon: TrendingUp },
          { label: '待跟进', value: '0', icon: Building2 },
          { label: '本周新增', value: '0', icon: Search },
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

      {/* Lead List */}
      <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
        <h3 className="font-bold text-[#0B1B2B] mb-4">潜在客户列表</h3>
        
        {mockLeads.length === 0 ? (
          <div className="text-center py-16">
            <Radar size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无发现的潜在客户</p>
            <p className="text-xs text-slate-400 mt-2">点击"启动AI调研"开始智能获客</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockLeads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-4 bg-white border border-[#E7E0D3] rounded-xl hover:border-[#C7A56A]/50 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-[#F7F3EA] rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-[#C7A56A]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-[#0B1B2B]">{lead.company}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{lead.industry}</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {lead.region}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0B1B2B]">{lead.score}</span>
                    <span className="text-xs text-slate-400">分</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    lead.status === '高意向' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
