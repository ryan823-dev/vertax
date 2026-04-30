"use client";

/**
 * 目标客户画像配置页面
 * 集成 EngineHeader + Stepper，保持暗色内容区
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Info, BookOpen, Zap, ArrowLeft } from 'lucide-react';
import { ScoringProfileConfig } from '@/components/knowledge/scoring-profile-config';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
import { EngineHeader } from '@/components/knowledge/engine-header';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ScoringProfilePage() {
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);

  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      // Pipeline status is non-critical
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState is called after await
  useEffect(() => { void loadPipelineStatus(); }, [loadPipelineStatus]);

  if (!mounted) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B1018' }}>
      {/* Engine Header with Stepper */}
      {pipelineStatus && (
        <EngineHeader
          title="评分规则配置"
          description="定义目标客户画像，获客雷达将根据规则评分"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Back link */}
          <Link
            href="/customer/knowledge/profiles"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = 'var(--ci-accent)'; e.currentTarget.style.borderColor = 'rgba(79,141,246,0.3)'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <ArrowLeft size={13} />
            返回买家画像
          </Link>

          {/* Quick Tips */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div
              className="flex items-start gap-3 p-4 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <Zap size={16} style={{ color: '#22C55E' }} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">正向信号</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>匹配后加分，分数越高越优质</p>
              </div>
            </div>
            <div
              className="flex items-start gap-3 p-4 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <Zap size={16} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">负向信号</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>匹配后直接排除，不进入推荐列表</p>
              </div>
            </div>
            <div
              className="flex items-start gap-3 p-4 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="p-2 rounded-lg" style={{ background: 'rgba(79,141,246,0.12)' }}>
                <BookOpen size={16} style={{ color: 'var(--ci-accent)' }} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">层级阈值</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>A/B/C三级客户分层标准</p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: 'rgba(79,141,246,0.04)', border: '1px solid rgba(79,141,246,0.15)' }}
          >
            <div className="flex items-start gap-3">
              <Info size={18} style={{ color: 'var(--ci-accent)' }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1.5">为什么要配置评分规则？</p>
                <ul className="space-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <li>• <strong className="text-white/70">精准匹配</strong>：您最了解自己的目标客户，自定义规则比AI猜测更准确</li>
                  <li>• <strong className="text-white/70">排除无效</strong>：排除零售商、供应商等非目标客户，节省筛选时间</li>
                  <li>• <strong className="text-white/70">持续优化</strong>：根据获客效果不断调整规则，提升匹配精度</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Configuration Component */}
          <div
            className="p-6 rounded-xl"
            style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ScoringProfileConfig />
          </div>

          {/* How it works */}
          <div
            className="mt-8 p-6 rounded-xl"
            style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="text-base font-bold text-white mb-5">评分规则如何工作？</h2>
            <div className="grid grid-cols-4 gap-4">
              {['获客雷达发现新候选', '检查负向信号（排除）', '计算正向信号得分', '按阈值分A/B/C层级'].map((text, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(79,141,246,0.1)', border: '1px solid rgba(79,141,246,0.2)' }}
                  >
                    <span className="font-bold" style={{ color: 'var(--ci-accent)' }}>{i + 1}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
