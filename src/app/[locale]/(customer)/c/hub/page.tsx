"use client";

import { ClipboardList, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';

// Mock actions data
const mockActions = [
  { id: '1', priority: 'P1', title: '社媒账号未授权', module: '声量枢纽', status: '待处理', action: '授权接入' },
  { id: '2', priority: 'P2', title: '完善企业资料', module: '知识引擎', status: '待处理', action: '上传更多' },
];

export default function HubPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">推进中台</h1>
          <p className="text-sm text-slate-500 mt-1">任务跟踪与待办事项管理</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '待处理', value: mockActions.filter(a => a.status === '待处理').length.toString(), icon: Clock, color: 'text-amber-500' },
          { label: 'P0阻塞', value: '0', icon: AlertCircle, color: 'text-red-500' },
          { label: '进行中', value: '0', icon: ArrowRight, color: 'text-blue-500' },
          { label: '已完成', value: '0', icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#FFFCF6] rounded-xl border border-[#E7E0D3] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
        <h3 className="font-bold text-[#0B1B2B] mb-4">待办事项</h3>
        
        {mockActions.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={48} className="text-emerald-300 mx-auto mb-4" />
            <p className="text-slate-500">太棒了！没有待处理事项</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockActions.map((action) => (
              <div key={action.id} className="flex items-center gap-4 p-4 bg-white border border-[#E7E0D3] rounded-xl">
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                  action.priority === 'P0' ? 'bg-red-100 text-red-600' : 
                  action.priority === 'P1' ? 'bg-amber-100 text-amber-600' : 
                  'bg-slate-100 text-slate-600'
                }`}>
                  {action.priority}
                </span>
                <div className="flex-1">
                  <h4 className="font-medium text-[#0B1B2B]">{action.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">来自：{action.module}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  action.status === '待处理' ? 'bg-amber-50 text-amber-600' : 
                  action.status === '进行中' ? 'bg-blue-50 text-blue-600' : 
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {action.status}
                </span>
                <button className="px-4 py-2 bg-[#C7A56A] text-[#0B1B2B] text-xs font-bold rounded-lg hover:bg-[#C7A56A]/90 transition-colors">
                  {action.action}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
