"use client";

import React, { useState } from 'react';
import { Shield, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { NotificationBell } from './notification-bell';

interface CustomerHeaderProps {
  tenantName?: string;
  tenantSlug?: string;
}

export function CustomerHeader({ 
  tenantName = '客户企业', 
  tenantSlug = 'tenant',
}: CustomerHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  };
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

      {/* 右侧：通知 + 身份胶囊 + 登出 */}
      <div className="flex items-center gap-2.5">
        <NotificationBell />

        {/* 身份胶囊 — 仅决策者 */}
        <div
          className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl select-none"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)',
            border: '1px solid rgba(212,175,55,0.3)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: '#D4AF37', color: '#0B1220' }}
          >
            决
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Shield size={9} style={{ color: '#D4AF37' }} />
            <span className="text-[11px] font-bold" style={{ color: '#D4AF37' }}>决策者</span>
          </div>
        </div>

        {/* 登出按钮 */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-50"
          style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          title="退出登录"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline text-xs font-medium">退出</span>
        </button>
      </div>
    </header>
  );
}
