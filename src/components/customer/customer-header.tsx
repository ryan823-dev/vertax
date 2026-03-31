"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield, Eye, LayoutList, Zap } from 'lucide-react';
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
    <header
      className="h-14 px-5 flex items-center justify-between shrink-0 z-20"
      style={{
        background: 'rgba(11,18,32,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212,175,55,0.12)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 24px -4px rgba(0,0,0,0.3)',
      }}
    >
      {/* 左侧：项目标识 */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            项目
          </span>
          <span className="font-semibold text-white text-[13px]">{tenantName}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              background: 'rgba(212,175,55,0.1)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            {tenantSlug}.vertax.top
          </span>
        </div>

        {/* AI 引擎状态指示 */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[10px] font-medium" style={{ color: '#22C55E' }}>引擎运行中</span>
        </div>
      </div>

      {/* 右侧：模式切换 + 身份胶囊 */}
      <div className="flex items-center gap-2.5">
        {/* 显示模式切换 */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={() => setDisplayMode(DISPLAY_MODES.SECRETARY)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
            style={
              displayMode === DISPLAY_MODES.SECRETARY
                ? { background: 'rgba(212,175,55,0.15)', color: '#D4AF37', borderRight: '1px solid rgba(212,175,55,0.2)' }
                : { color: 'rgba(255,255,255,0.4)', borderRight: '1px solid rgba(255,255,255,0.06)' }
            }
          >
            <Eye size={11} />
            秘书
          </button>
          <button
            onClick={() => setDisplayMode(DISPLAY_MODES.ANALYST)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
            style={
              displayMode === DISPLAY_MODES.ANALYST
                ? { background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <LayoutList size={11} />
            分析
          </button>
        </div>

        {/* 身份胶囊 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl transition-all select-none active:scale-[0.98]"
            style={{
              background: isDecider
                ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)'
                : 'rgba(59,130,246,0.1)',
              border: isDecider
                ? '1px solid rgba(212,175,55,0.3)'
                : '1px solid rgba(59,130,246,0.25)',
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
              style={
                isDecider
                  ? { background: '#D4AF37', color: '#0B1220' }
                  : { background: '#3B82F6', color: 'white' }
              }
            >
              {roleLabel.slice(0, 1)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[11px] font-bold text-white leading-none">{userName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield size={8} style={{ color: isDecider ? '#D4AF37' : '#60A5FA' }} />
                <p
                  className="text-[9px] font-bold uppercase tracking-tight"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {roleLabel}
                </p>
              </div>
            </div>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              style={{ color: 'rgba(255,255,255,0.35)' }}
            />
          </button>

          {/* 下拉菜单 */}
          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden z-50 animate-fade-in"
              style={{
                background: '#0F1728',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 48px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)',
              }}
            >
              {/* 当前角色信息 */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  当前身份
                </p>
              </div>
              <div className="p-3 space-y-1">
                {/* 决策者 */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={
                    isDecider
                      ? { background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }
                      : { opacity: 0.4, border: '1px solid transparent' }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={
                      isDecider
                        ? { background: '#D4AF37', color: '#0B1220' }
                        : { background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }
                    }
                  >
                    决
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">决策者</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      全权限 · 可审批发布配置
                    </p>
                  </div>
                  {isDecider && <Shield size={13} className="text-[#D4AF37] ml-auto" />}
                </div>

                {/* 执行者 */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={
                    !isDecider
                      ? { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }
                      : { opacity: 0.4, border: '1px solid transparent' }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={
                      !isDecider
                        ? { background: '#3B82F6', color: 'white' }
                        : { background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }
                    }
                  >
                    执
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">执行者</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      日常执行 · 不可审批删除
                    </p>
                  </div>
                  {!isDecider && <Shield size={13} className="text-blue-400 ml-auto" />}
                </div>
              </div>

              {/* 底部说明 */}
              <div
                className="px-4 py-2.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  身份由管理员分配，如需变更请联系管理员
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
