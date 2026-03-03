"use client";

import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { AssetProcessingStatus } from '@/types/knowledge';

const STATUS_CONFIG: Record<AssetProcessingStatus, {
  label: string;
  className: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = {
  unprocessed: {
    label: '未处理',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: Clock,
  },
  processing: {
    label: '处理中',
    className: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: Loader2,
  },
  ready: {
    label: '已就绪',
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    icon: CheckCircle2,
  },
  failed: {
    label: '失败',
    className: 'bg-red-50 text-red-600 border-red-200',
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
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <Icon size={size === 'xs' ? 10 : 12} className={isSpinning ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}
