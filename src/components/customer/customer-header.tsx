"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield, Eye, LayoutList } from 'lucide-react';
import { useRoleContext } from '@/contexts/role-context';
import { DISPLAY_MODES } from '@/lib/constants';

interface CustomerHeaderProps {
  tenantName?: string;
  tenantSlug?: string;
}

export function CustomerHeader({ 
  tenantName = '客户企业', 
  tenantSlug = 'tenant',
}: CustomerHeaderProps) {
  const { appRole, isDecider, displayMode, setDisplayMode, userName, roleLabel, roleDescription } = useRoleContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-[#FFFCF6] border-b border-[#E7E0D3] px-6 flex items-center justify-between shrink-0 z-20">
      {/* 左侧：项目标识 */}
      <div className="flex items-center gap-1.5 bg-[#F7F3EA] px-5 py-2 rounded-full border border-[#E7E0D3] text-sm">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">项目</span>
        <span className="font-bold text-[#0B1B2B]">{tenantName}</span>
        <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-1.5 py-0.5 rounded font-mono border border-[#D4AF37]/20">
          {tenantSlug}.vertax.top
        </span>
      </div>
      
      {/* 右侧：模式切换 + 身份胶囊 */}
      <div className="flex items-center gap-3">
        {/* 显示模式切换（独立于身份） */}
        <div className="flex items-center bg-[#F7F3EA] border border-[#E7E0D3] rounded-lg overflow-hidden">
          <button
            onClick={() => setDisplayMode(DISPLAY_MODES.SECRETARY)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
              displayMode === DISPLAY_MODES.SECRETARY
                ? 'bg-[#0B1B2B] text-[#D4AF37]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye size={12} />
            秘书
          </button>
          <button
            onClick={() => setDisplayMode(DISPLAY_MODES.ANALYST)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
              displayMode === DISPLAY_MODES.ANALYST
                ? 'bg-[#0B1B2B] text-[#D4AF37]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutList size={12} />
            分析
          </button>
        </div>

        {/* 唯一身份胶囊 */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border-2 transition-all select-none active:scale-[0.98] ${
              isDecider
                ? 'bg-[#0B1B2B] border-[#D4AF37]/40 hover:border-[#D4AF37]/70'
                : 'bg-[#0B1B2B] border-blue-400/30 hover:border-blue-400/60'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
              isDecider ? 'bg-[#D4AF37] text-[#0B1B2B]' : 'bg-blue-500 text-white'
            }`}>
              {roleLabel.slice(0, 1)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[11px] font-bold text-white leading-none">{userName}</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield size={9} className={isDecider ? 'text-[#D4AF37]' : 'text-blue-400'} />
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{roleLabel}</p>
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-500 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* 下拉菜单 */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E7E0D3] rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
              {/* 当前角色信息 */}
              <div className="px-4 py-3 bg-slate-50 border-b border-[#E7E0D3]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">当前身份</p>
              </div>
              <div className="p-3">
                {/* 决策者 */}
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDecider ? 'bg-[#F7F3EA] border border-[#D4AF37]/20' : 'opacity-50'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${isDecider ? 'bg-[#D4AF37] text-[#0B1B2B]' : 'bg-[#D4AF37]/30 text-[#D4AF37]'}`}>
                    决
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B1B2B]">决策者</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">全权限 · 可审批发布配置</p>
                  </div>
                  {isDecider && <Shield size={14} className="text-[#D4AF37] ml-auto" />}
                </div>
                
                {/* 执行者 */}
                <div className={`flex items-center gap-3 p-3 rounded-xl mt-1 ${!isDecider ? 'bg-blue-50 border border-blue-200/50' : 'opacity-50'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${!isDecider ? 'bg-blue-500 text-white' : 'bg-blue-200 text-blue-400'}`}>
                    执
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B1B2B]">执行者</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">日常执行 · 不可审批删除</p>
                  </div>
                  {!isDecider && <Shield size={14} className="text-blue-500 ml-auto" />}
                </div>
              </div>
              
              {/* 底部说明 */}
              <div className="px-4 py-2.5 border-t border-[#E7E0D3] bg-slate-50">
                <p className="text-[10px] text-slate-400">身份由管理员分配，如需变更请联系管理员</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
