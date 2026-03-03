"use client";

import { useState } from 'react';
import { ChevronDown, CheckCircle2, ShieldCheck, MessageSquare } from 'lucide-react';

export type RoleType = 'BOSS' | 'STAFF';

export interface UserRole {
  type: RoleType;
  label: string;
  description: string;
  accessLevel: string;
  color: string;
}

const ROLES: Record<RoleType, UserRole> = {
  BOSS: { 
    type: 'BOSS', 
    label: '决策者', 
    description: '老板/负责人', 
    accessLevel: '全局战略视图', 
    color: 'bg-[#C7A56A]',
  },
  STAFF: { 
    type: 'STAFF', 
    label: '执行者', 
    description: '员工/助理', 
    accessLevel: '任务执行视图', 
    color: 'bg-blue-500',
  },
};

interface CustomerHeaderProps {
  tenantName?: string;
  tenantSlug?: string;
  onToggleAI?: () => void;
  showAI?: boolean;
}

export function CustomerHeader({ 
  tenantName = '客户企业', 
  tenantSlug = 'tenant',
  onToggleAI,
  showAI = false
}: CustomerHeaderProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>(ROLES.BOSS);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  return (
    <header className="h-20 bg-[#FFFCF6] border-b border-[#E7E0D3] px-10 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-1.5 bg-[#F7F3EA] px-6 py-3 rounded-full border border-[#E7E0D3] shadow-sm group cursor-pointer hover:bg-white transition-colors">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">当前演示项目</span>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold text-[#0B1B2B]">
              {tenantName}
            </span>
            <span className="text-[10px] bg-[#C7A56A]/10 text-[#C7A56A] px-2 py-0.5 rounded-md font-mono border border-[#C7A56A]/20">
              {tenantSlug}.vertax.top
            </span>
            <ChevronDown size={14} className="text-[#C7A56A] group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
      
      {/* Role Switcher */}
      <div className="flex items-center gap-4">
        {/* AI Sidebar Toggle */}
        <button
          onClick={onToggleAI}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
            showAI 
              ? 'bg-[#C7A56A] text-[#0B1B2B] border-[#C7A56A] shadow-lg shadow-[#C7A56A]/20' 
              : 'bg-[#0B1B2B] text-[#C7A56A] border-[#10263B] hover:bg-[#10263B]'
          }`}
        >
          <MessageSquare size={16} />
          <span className="text-xs font-bold hidden xl:inline">AI 顾问</span>
        </button>

        <div className="relative">
          <div 
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)} 
            className="flex items-center gap-3 bg-[#0B1B2B] p-2 pr-5 rounded-[1.5rem] border border-[#10263B] cursor-pointer hover:bg-[#10263B] transition-all select-none shadow-2xl shadow-[#0B1B2B]/10 active:scale-95"
          >
            <div className={`w-10 h-10 rounded-xl ${currentRole.color} flex items-center justify-center text-xs font-bold text-[#0B1B2B] transition-colors shadow-inner`}>
              {currentRole.label}
            </div>
            <div className="hidden xl:block">
              <p className="text-[11px] font-bold text-white leading-none">{currentRole.description}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <ShieldCheck size={12} className="text-[#C7A56A]" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{currentRole.accessLevel}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-slate-500 ml-2 transition-transform duration-300 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
          
          {/* Role Dropdown */}
          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-white border border-[#E7E0D3] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-50">
              <div className="px-6 py-5 bg-slate-50 border-b border-[#E7E0D3]">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">切换工作视图维度</p>
              </div>
              <div className="p-3">
                {Object.values(ROLES).map((role) => (
                  <button 
                    key={role.type} 
                    onClick={() => { setCurrentRole(role); setIsRoleDropdownOpen(false); }} 
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      currentRole.type === role.type ? 'bg-[#F7F3EA] border-[#C7A56A]/20 shadow-sm' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${role.color} flex items-center justify-center text-xs font-bold text-[#0B1B2B] shadow-md`}>
                      {role.label}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#0B1B2B]">{role.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{role.accessLevel}</p>
                    </div>
                    {currentRole.type === role.type && <CheckCircle2 size={18} className="text-[#C7A56A] ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
