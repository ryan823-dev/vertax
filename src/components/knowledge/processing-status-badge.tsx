"use client";

import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { AssetProcessingStatus } from '@/types/knowledge';

const STATUS_CONFIG: Record<AssetProcessingStatus, {
  label: string;
  bg: string;
  color: string;
  border: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}> = {
  unprocessed: {
    label: '未处理',
    bg: 'rgba(0,0,0,0.04)',
    color: '#94A3B8',
    border: 'rgba(0,0,0,0.08)',
    icon: Clock,
  },
  pending: {
    label: '排队中',
    bg: 'rgba(59,130,246,0.08)',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.2)',
    icon: Loader2,
  },
  extracting: {
    label: '提取文本',
    bg: 'rgba(59,130,246,0.08)',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.2)',
    icon: Loader2,
  },
  chunking: {
    label: '分块中',
    bg: 'rgba(59,130,246,0.08)',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.2)',
    icon: Loader2,
  },
  processing: {
    label: '处理中',
    bg: 'rgba(59,130,246,0.08)',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.2)',
    icon: Loader2,
  },
  ready: {
    label: '已就绪',
    bg: 'rgba(79,141,246,0.08)',
    color: 'var(--ci-accent-strong)',
    border: 'rgba(79,141,246,0.25)',
    icon: CheckCircle2,
  },
  failed: {
    label: '失败',
    bg: 'rgba(239,68,68,0.08)',
    color: '#DC2626',
    border: 'rgba(239,68,68,0.2)',
    icon: AlertCircle,
  },
};

export function ProcessingStatusBadge({
  status,
  size = 'sm',
}: {
  status: AssetProcessingStatus;
  size?: 'xs' | 'sm';
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = status === 'processing';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      <Icon size={size === 'xs' ? 10 : 12} className={isSpinning ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}
