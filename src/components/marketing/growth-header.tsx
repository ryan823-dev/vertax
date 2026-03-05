"use client";

/**
 * 内容增长工作台顶部条
 * 
 * 包含：
 * - 左：页面标题 + 说明
 * - 中：5步 Growth Stepper（进度指示器）
 * - 右：主 CTA 按钮 + 知识引擎完成度
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, Sparkles, CheckCircle2, Circle, AlertCircle, 
  ChevronRight, Clock, Loader2, RefreshCw, Layers,
  FileText, FileEdit, CheckSquare, Send,
} from 'lucide-react';
import type { StepState, StepStatus, GrowthPipelineCounts, PrimaryCTA } from '@/lib/marketing/growth-pipeline';

// ============================================
// 类型定义
// ============================================

interface GrowthHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面说明 */
  description: string;
  /** 流水线步骤状态 */
  steps: StepState[];
  /** 计数数据 */
  counts: GrowthPipelineCounts;
  /** 当前步骤 (1-5) */
  currentStep: number;
  /** 主 CTA 配置 */
  primaryCTA?: PrimaryCTA;
  /** 是否正在刷新 */
  isRefreshing?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
}

// 步骤图标映射
const STEP_ICONS: Record<string, React.ElementType> = {
  topics: Layers,
  briefs: FileText,
  drafts: FileEdit,
  verify: CheckSquare,
  publish: Send,
};

// ============================================
// Stepper 组件
// ============================================

function GrowthStepper({ 
  steps, 
  currentStep 
}: { 
  steps: StepState[]; 
  currentStep: number;
}) {
  const router = useRouter();
  
  const getStepIcon = (step: StepState, isCurrentStep: boolean) => {
    const Icon = STEP_ICONS[step.key] || Circle;
    
    if (step.status === 'DONE') {
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    }
    if (step.status === 'BLOCKED') {
      return <AlertCircle size={16} className="text-red-400" />;
    }
    if (isCurrentStep) {
      return <Icon size={16} className="text-[#D4AF37]" />;
    }
    return <Icon size={16} className="text-slate-300" />;
  };

  const getStepTextColor = (status: StepStatus, isCurrentStep: boolean) => {
    if (status === 'DONE') return 'text-emerald-600';
    if (status === 'BLOCKED') return 'text-red-500';
    if (isCurrentStep) return 'text-[#D4AF37] font-medium';
    return 'text-slate-400';
  };

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const isCurrentStep = idx + 1 === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step */}
            <button
              onClick={() => router.push(step.href)}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:bg-[#F7F3EA] ${
                isCurrentStep ? 'bg-[#F7F3EA]' : ''
              }`}
              title={step.blocker || step.label}
            >
              {getStepIcon(step, isCurrentStep)}
              <span className={`text-[11px] whitespace-nowrap ${getStepTextColor(step.status, isCurrentStep)}`}>
                {step.label}
              </span>
              {step.count !== undefined && step.count > 0 && (
                <span className={`text-[10px] px-1 py-0.5 rounded ${
                  step.status === 'DONE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.count}
                </span>
              )}
            </button>
            
            {/* Connector */}
            {!isLast && (
              <ChevronRight size={12} className="text-slate-300 mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 知识引擎完成度指示器
// ============================================

function KnowledgeIndicator({ counts }: { counts: GrowthPipelineCounts }) {
  const { knowledgeCompleteness, hasCompanyProfile, hasPersonas, hasEvidence } = counts;
  
  if (knowledgeCompleteness >= 100) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px]">
        <CheckCircle2 size={12} />
        知识引擎就绪
      </div>
    );
  }
  
  return (
    <Link 
      href="/c/knowledge"
      className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] hover:bg-amber-100 transition-colors"
      title={`企业档案: ${hasCompanyProfile ? '✓' : '✗'} | 买家画像: ${hasPersonas ? '✓' : '✗'} | 证据库: ${hasEvidence ? '✓' : '✗'}`}
    >
      <AlertCircle size={12} />
      知识引擎 {knowledgeCompleteness}%
    </Link>
  );
}

// ============================================
// 主组件
// ============================================

export function GrowthHeader({
  title,
  description,
  steps,
  counts,
  currentStep,
  primaryCTA,
  isRefreshing = false,
  onRefresh,
}: GrowthHeaderProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '暂无记录';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className="module-header-bar px-5 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Description */}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-[#D4AF37]" />
            <h1 className="text-lg font-bold text-[#0B1B2B]">{title}</h1>
          </div>
          <p className="text-xs text-slate-500 ml-7">{description}</p>
        </div>

        {/* Center: Stepper */}
        <div className="flex-1 flex justify-center">
          <GrowthStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Right: CTA + Meta */}
        <div className="shrink-0 flex items-center gap-3">
          {/* Knowledge Indicator */}
          <KnowledgeIndicator counts={counts} />
          
          {/* Last Update Time + Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={10} />
              <span>{formatDate(counts.lastUpdatedAt)}</span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                title="刷新状态"
              >
                <RefreshCw size={12} className={`text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Primary CTA */}
          {primaryCTA && (
            <div className="relative">
              <Link
                href={primaryCTA.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  primaryCTA.disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
                    : 'bg-[#0B1B2B] text-[#D4AF37] hover:bg-[#10263B] hover:shadow-lg hover:shadow-[#D4AF37]/10'
                }`}
                onClick={(e) => primaryCTA.disabled && e.preventDefault()}
              >
                <Sparkles size={16} />
                {primaryCTA.label}
              </Link>
              
              {/* Disabled Reason Tooltip */}
              {primaryCTA.disabled && primaryCTA.disabledReason && (
                <div className="absolute top-full mt-1 right-0 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] rounded whitespace-nowrap border border-slate-200">
                  {primaryCTA.disabledReason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 统计卡片组件
// ============================================

interface GrowthStatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  highlight?: boolean;
  subValue?: string;
}

export function GrowthStatCard({ 
  label, 
  value, 
  icon, 
  href, 
  highlight = false,
  subValue,
}: GrowthStatCardProps) {
  const content = (
    <div className={`p-4 rounded-xl border transition-all ${
      highlight 
        ? 'bg-[#F7F3E8] border-[#E8E0D0] hover:border-[#D4AF37]' 
        : 'bg-[#FFFCF7] border-[#E8E0D0] hover:border-[#D4AF37]/50'
    } ${href ? 'cursor-pointer hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-white' : 'bg-slate-50'}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#0B1B2B] mb-0.5">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {subValue && (
        <div className="text-[10px] text-slate-400 mt-1">{subValue}</div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ============================================
// 秘书催办栏组件
// ============================================

interface SecretaryPanelProps {
  counts: GrowthPipelineCounts;
}

export function GrowthSecretaryPanel({ counts }: SecretaryPanelProps) {
  const items: Array<{
    type: 'warning' | 'info' | 'action';
    title: string;
    description: string;
    href?: string;
  }> = [];

  // 待处理简报
  if (counts.briefsDraft > 0) {
    items.push({
      type: 'action',
      title: `${counts.briefsDraft} 个简报待完善`,
      description: '草稿状态的简报需要补充信息',
      href: '/c/marketing/briefs?status=draft',
    });
  }

  // 就绪简报待生成草稿
  if (counts.briefsReady > 0) {
    items.push({
      type: 'action',
      title: `${counts.briefsReady} 个简报待生成`,
      description: '已就绪的简报可以生成内容草稿',
      href: '/c/marketing/briefs?status=ready',
    });
  }

  // 缺证据内容
  if (counts.missingProofCount > 0) {
    items.push({
      type: 'warning',
      title: `${counts.missingProofCount} 条内容缺证据`,
      description: '请补充证据引用以增强可信度',
      href: '/c/marketing/contents',
    });
  }

  // 待发布草稿
  if (counts.draftsPending > 0) {
    items.push({
      type: 'info',
      title: `${counts.draftsPending} 个草稿待发布`,
      description: '完成审核后可创建发布包',
      href: '/c/marketing/contents?status=draft',
    });
  }

  // 待审核发布包
  if (counts.publishPacksPending > 0) {
    items.push({
      type: 'action',
      title: `${counts.publishPacksPending} 个发布包待审核`,
      description: '审核通过后可发布到目标渠道',
      href: '/c/marketing/strategy',
    });
  }

  // 知识引擎未完成
  if (counts.knowledgeCompleteness < 100) {
    items.push({
      type: 'warning',
      title: '知识引擎未完善',
      description: '完善知识引擎可提升内容质量',
      href: '/c/knowledge',
    });
  }

  // 没有任何待办
  if (items.length === 0) {
    items.push({
      type: 'info',
      title: '一切顺利',
      description: '内容增长流程运行正常',
    });
  }

  return (
    <div className="module-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E8E0D0] bg-[#F7F3E8]">
        <h3 className="text-sm font-medium text-[#0B1B2B]">待办事项</h3>
      </div>
      <div className="divide-y divide-[#E8E0D0]">
        {items.map((item, idx) => (
          <div key={idx} className="p-3">
            {item.href ? (
              <Link href={item.href} className="block group">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${
                    item.type === 'warning' ? 'text-amber-500' :
                    item.type === 'action' ? 'text-blue-500' :
                    'text-slate-400'
                  }`}>
                    {item.type === 'warning' ? <AlertCircle size={14} /> :
                     item.type === 'action' ? <Circle size={14} className="fill-current" /> :
                     <CheckCircle2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0B1B2B] group-hover:text-[#D4AF37] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-[#D4AF37] transition-colors mt-0.5" />
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 ${
                  item.type === 'warning' ? 'text-amber-500' :
                  item.type === 'action' ? 'text-blue-500' :
                  'text-slate-400'
                }`}>
                  {item.type === 'warning' ? <AlertCircle size={14} /> :
                   item.type === 'action' ? <Circle size={14} className="fill-current" /> :
                   <CheckCircle2 size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0B1B2B]">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
