"use client";

import Link from 'next/link';
import { 
  Library, 
  Radar, 
  BarChart3, 
  Globe, 
  ClipboardList,
  Brain,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

export type SystemHealthStatus = 'healthy' | 'warning' | 'critical' | 'inactive';

export interface SystemProgress {
  id: string;
  name: string;
  icon: React.ElementType;
  href: string;
  /** 当前进度百分比 0-100 */
  progress: number;
  /** 进度描述文字 */
  progressLabel: string;
  /** 健康状态 */
  status: SystemHealthStatus;
  /** 状态描述 */
  statusLabel: string;
  /** 趋势 */
  trend?: 'up' | 'down' | 'flat';
  /** 趋势描述 */
  trendLabel?: string;
}

export interface ProgressStripProps {
  systems: SystemProgress[];
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 标题文本 */
  title?: string;
}

/**
 * ProgressStrip - 六大系统进度条
 * 
 * 2x3网格展示六大核心系统的健康状态
 * - 知识引擎
 * - 获客雷达
 * - 增长系统
 * - 声量枢纽
 * - 推进中台
 * - AI中枢
 */

// 默认系统配置
export const defaultSystems: Omit<SystemProgress, 'progress' | 'progressLabel' | 'status' | 'statusLabel'>[] = [
  { id: 'knowledge', name: '知识引擎', icon: Library, href: '/customer/knowledge' },
  { id: 'radar', name: '获客雷达', icon: Radar, href: '/customer/radar' },
  { id: 'marketing', name: '增长系统', icon: BarChart3, href: '/customer/marketing' },
  { id: 'social', name: '声量枢纽', icon: Globe, href: '/customer/social' },
  { id: 'hub', name: '推进中台', icon: ClipboardList, href: '/customer/hub' },
  { id: 'ai', name: 'AI 中枢', icon: Brain, href: '/customer/ai' },
];

export function ProgressStrip({ 
  systems, 
  showTitle = true,
  title = '系统运行态势',
}: ProgressStripProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-exec-primary font-bold">{title}</h3>
          <span className="text-exec-muted text-xs">实时监控</span>
        </div>
      )}
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {systems.map((system) => (
          <SystemCard key={system.id} system={system} />
        ))}
      </div>
    </div>
  );
}

function SystemCard({ system }: { system: SystemProgress }) {
  const Icon = system.icon;
  
  const statusStyles: Record<SystemHealthStatus, { bg: string; border: string; dot: string; text: string }> = {
    healthy: { 
      bg: 'bg-success-soft', 
      border: 'border-exec-success/20', 
      dot: 'bg-exec-success',
      text: 'text-exec-success',
    },
    warning: { 
      bg: 'bg-warning-soft', 
      border: 'border-exec-warning/20', 
      dot: 'bg-exec-warning',
      text: 'text-exec-warning',
    },
    critical: { 
      bg: 'bg-danger-soft', 
      border: 'border-exec-danger/20', 
      dot: 'bg-exec-danger',
      text: 'text-exec-danger',
    },
    inactive: { 
      bg: 'bg-exec-elevated', 
      border: 'border-exec-subtle', 
      dot: 'bg-exec-muted',
      text: 'text-exec-muted',
    },
  };

  const style = statusStyles[system.status];
  const TrendIcon = system.trend === 'up' ? TrendingUp : system.trend === 'down' ? TrendingDown : Minus;
  const trendColor = system.trend === 'up' ? 'text-exec-success' : system.trend === 'down' ? 'text-exec-danger' : 'text-exec-muted';

  return (
    <Link
      href={system.href}
      className="exec-card p-4 group hover:border-exec-gold/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center`}>
            <Icon size={16} className={style.text} />
          </div>
          <span className="text-exec-primary text-sm font-medium">{system.name}</span>
        </div>
        <ChevronRight 
          size={14} 
          className="text-exec-muted opacity-0 group-hover:opacity-100 transition-opacity" 
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="h-1.5 bg-exec-surface rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              system.status === 'critical' ? 'bg-exec-danger' : 
              system.status === 'warning' ? 'bg-exec-warning' : 
              'bg-exec-gold'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, system.progress))}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          <span className={`text-xs ${style.text}`}>{system.statusLabel}</span>
        </div>
        <span className="text-exec-secondary text-xs font-tabular">{system.progressLabel}</span>
      </div>

      {/* Trend (optional) */}
      {system.trend && system.trendLabel && (
        <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
          <TrendIcon size={10} />
          <span className="text-[10px]">{system.trendLabel}</span>
        </div>
      )}
    </Link>
  );
}

/**
 * 辅助函数：创建系统进度数据
 */
export function createSystemProgress(
  id: string,
  data: {
    progress: number;
    progressLabel: string;
    status: SystemHealthStatus;
    statusLabel: string;
    trend?: 'up' | 'down' | 'flat';
    trendLabel?: string;
  }
): SystemProgress | null {
  const base = defaultSystems.find(s => s.id === id);
  if (!base) return null;
  return { ...base, ...data };
}
