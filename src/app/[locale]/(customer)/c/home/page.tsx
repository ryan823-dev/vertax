"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  TrendingUp,
  Target,
  FileText,
  Clock,
  ChevronRight,
  Send,
  Briefcase,
  BarChart3,
  Lightbulb,
  Library,
  Radar,
  Globe,
} from 'lucide-react';

// Quick action buttons for AI chat
const quickPrompts = [
  { label: '一分钟汇报', icon: Clock },
  { label: '本周战果', icon: TrendingUp },
  { label: '哪些线索值得跟进', icon: Target },
  { label: '增长瓶颈在哪', icon: Lightbulb },
];

// Module health indicators
const moduleStats = [
  { key: 'knowledge', label: '知识体系', value: '78', unit: '%', change: '+8% 本周', href: '/c/knowledge' },
  { key: 'leads', label: '潜在客户', value: '0', unit: '家', change: '已发现', href: '/c/radar' },
  { key: 'content', label: '内容资产', value: '3', unit: '篇', change: '2篇待确认', href: '/c/marketing' },
  { key: 'actions', label: '待决策项', value: '0', unit: '项', change: 'P0 级阻塞', href: '/c/hub' },
];

// Pending actions
const pendingActions = [
  { id: '1', priority: 'P1', title: '社媒账号未授权', action: '授权接入' },
];

export default function StrategicHomePage() {
  const [inputValue, setInputValue] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // TODO: Implement AI chat
    console.log('Send:', inputValue);
    setInputValue('');
  };

  return (
    <div className="space-y-8">
      {/* Decision Briefing Header */}
      <div className="bg-[#FFFCF6] rounded-[2rem] border border-[#E7E0D3] p-8 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0B1B2B] flex items-center gap-3">
              <Sparkles className="text-[#C7A56A]" size={24} />
              今日决策简报
            </h2>
            <p className="text-sm text-slate-500 mt-1">{currentDate}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#0B1B2B]">{currentTime}</p>
            <p className="text-xs text-slate-400">更新</p>
          </div>
        </div>

        <div className="bg-[#F7F3EA] rounded-2xl p-6 mb-6">
          <p className="text-sm text-slate-600">
            <span className="font-bold text-[#0B1B2B]">涂豆科技</span> 全球化获客态势
          </p>
          <p className="text-xs text-slate-500 mt-2">
            VertaX 智能引擎已完成深度分析，以下是需要您关注的关键指标与决策事项。
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {moduleStats.map((stat) => (
            <Link
              key={stat.key}
              href={stat.href}
              className="bg-white rounded-xl p-4 border border-[#E7E0D3] hover:border-[#C7A56A]/50 hover:shadow-md transition-all group"
            >
              <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</span>
                <span className="text-sm text-slate-400">{stat.unit}</span>
              </div>
              <p className="text-[10px] text-[#C7A56A] mt-1">{stat.change}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Core Growth Conclusion */}
      <div className="bg-gradient-to-br from-[#0B1B2B] to-[#10263B] rounded-[2rem] p-8 text-white">
        <h3 className="text-sm font-bold text-[#C7A56A] mb-3">核心增长结论</h3>
        <p className="text-sm leading-relaxed text-slate-300">
          【出海获客智能体】当前系统正聚焦于 <span className="text-white font-medium">涂豆科技 (tdpaintcell)</span> 的全球增长任务。
          我已完成初步的产品建模与 ICP 推演，正在为您构建闭环增长引擎。
        </p>
        <button className="mt-4 px-4 py-2 bg-[#C7A56A]/10 border border-[#C7A56A]/30 rounded-lg text-[#C7A56A] text-sm font-medium hover:bg-[#C7A56A]/20 transition-colors">
          展开详细仪表盘
        </button>

        {/* Module Quick Links */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
          {[
            { label: '知识', icon: Library, href: '/c/knowledge' },
            { label: '获客', icon: Radar, href: '/c/radar' },
            { label: '内容', icon: FileText, href: '/c/marketing' },
            { label: '社媒', icon: Globe, href: '/c/social' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-slate-400 hover:text-white"
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div className="bg-[#FFFCF6] rounded-[2rem] border border-[#E7E0D3] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#0B1B2B]">待您拍板推进</h3>
            <button className="text-xs text-[#C7A56A] hover:underline">查看全部</button>
          </div>
          
          {pendingActions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">暂无待决策事项</p>
          ) : (
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E7E0D3]">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    action.priority === 'P0' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {action.priority}
                  </span>
                  <span className="flex-1 text-sm text-[#0B1B2B]">{action.title}</span>
                  <span className="text-xs text-slate-400">{action.action}</span>
                  <button className="px-3 py-1.5 bg-[#C7A56A] text-[#0B1B2B] text-xs font-bold rounded-lg hover:bg-[#C7A56A]/90 transition-colors">
                    拍板
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Strategic Advisor */}
        <div className="bg-[#FFFCF6] rounded-[2rem] border border-[#E7E0D3] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/80 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-[#0B1B2B]" />
            </div>
            <div>
              <h2 className="font-bold text-[#0B1B2B]">VertaX 出海战略顾问</h2>
              <p className="text-xs text-emerald-500">在线 · 深度了解您的业务</p>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => setInputValue(prompt.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E7E0D3] rounded-lg text-xs text-slate-600 hover:border-[#C7A56A]/50 hover:text-[#0B1B2B] transition-colors"
              >
                <prompt.icon size={12} />
                {prompt.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 mb-3">
            点击快捷指令或直接提问<br />
            已同步您的产品、客户、进展数据
          </p>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="请指示..."
              className="flex-1 px-4 py-2.5 bg-white border border-[#E7E0D3] rounded-xl text-sm focus:outline-none focus:border-[#C7A56A] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 bg-[#0B1B2B] text-[#C7A56A] rounded-xl hover:bg-[#10263B] transition-colors disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
