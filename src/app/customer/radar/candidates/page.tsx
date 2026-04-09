"use client";

/**
 * 候选池页面 - 处理工作台风格
 * 
 * 布局：
 * - Top: RadarHeader with Stepper
 * - Filter Bar: 状态筛选 + 本周快筛
 * - Left: 候选列表（支持批量选择）
 * - Right: 详情面板（来源、理由、建议操作）
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Building2, 
  FileText, 
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  ExternalLink,
  Globe,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Filter,
  ChevronRight,
  Download,
  Sparkles,
  Clock,
  ArrowRight,
  Zap,
  Send,
  SearchCheck,
  Target,
  Users,
  TrendingUp,
  Shield,
  MessageSquare,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  getCandidatesV2,
  qualifyCandidateV2,
  qualifyCandidatesBatchV2,
  importCandidateToCompanyV2,
  importCandidateToOpportunityV2,
  getRadarStatsV2,
  type RadarStatsData,
} from '@/actions/radar-v2';
import {
  generateOutreachDraft,
  sendOutreachDraft,
  enrichCandidateNow,
  generateLinkedInDraft,
  recordLinkedInCopy,
  type OutreachDraft,
  type LinkedInDraft,
} from '@/actions/outreach-draft';
import { getRadarPipelineStatus } from '@/actions/radar-pipeline';
import type { RadarPipelineStatus } from '@/lib/radar/pipeline';
import type { RadarCandidate, RadarSource } from '@prisma/client';
import type { CandidateType, CandidateStatus } from '@prisma/client';
import { RadarHeader } from '@/components/radar/radar-header';
import { RadarContentMatchPanel } from '@/components/radar/radar-content-match-panel';

// ==================== 类型 ====================

type CandidateWithSource = RadarCandidate & { source: RadarSource };

interface SignalScores {
  fundingSignal?: number;
  newsSignal?: number;
  timingSignal?: number;
  contactSignal?: number;
  overallScore?: number;
}

interface CandidateIntelligence {
  funding?: {
    latestRound?: string;
    latestRoundDate?: string;
    totalRaised?: string;
    valuation?: string;
    leadInvestors?: string[];
  };
  contacts?: {
    decisionMakers?: Array<{
      name: string;
      title: string;
      email?: string;
      emailConfidence?: number;
    }>;
  };
  news?: {
    recentHeadlines?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
}

interface CandidateRadarData {
  intelligence?: CandidateIntelligence;
  signalScores?: SignalScores;
}

interface ResearchData {
  overview?: {
    businessType?: string;
    scale?: string;
    marketPosition?: string;
    geographicFocus?: string;
  };
  industry?: {
    primaryIndustry?: string;
    industryTrends?: string[];
  };
  painPoints?: {
    operational?: string[];
  };
  decisionMakers?: {
    primary?: {
      role?: string;
      concerns?: string[];
    };
  };
  outreachStrategy?: {
    valueProposition?: string;
    talkingPoints?: string[];
  };
  risks?: {
    level?: string;
  };
  confidence?: number;
}

interface EmailSequenceItem {
  order?: number | string;
  name?: string;
  sendDelay?: string;
  subject?: string;
  previewText?: string;
  body?: string;
  cta?: {
    text?: string;
  };
  psychologicalTrigger?: string;
}

interface EmailSequenceData {
  goal?: string;
  estimatedDuration?: string;
  totalEmails?: number;
  emails?: EmailSequenceItem[];
}

// 状态快捷筛选
const STATUS_FILTERS: Array<{
  value: CandidateStatus | '';
  label: string;
  count: keyof RadarStatsData | 'total' | null;
  color?: string;
}> = [
  { value: '', label: '全部', count: 'total' },
  { value: 'NEW', label: '待处理', count: 'newCandidates', color: 'blue' },
  { value: 'QUALIFIED', label: '已合格', count: 'qualifiedCandidates', color: 'emerald' },
  { value: 'IMPORTED', label: '已导入', count: 'importedCandidates', color: 'purple' },
  { value: 'EXCLUDED', label: '已排除', count: null, color: 'red' },
];

// ==================== 页面组件 ====================

export default function RadarCandidatesPage() {
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithSource[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<RadarStatsData | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<RadarPipelineStatus | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithSource | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // 发送邮件状态
  const [_isSendingEmail, setIsSendingEmail] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [_emailSent, setEmailSent] = useState(false);
  const [_emailError, setEmailError] = useState<string | null>(null);

  // 背调状态
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  // 邮件序列状态
  const [isGeneratingSequence, setIsGeneratingSequence] = useState(false);
  const [emailSequence, setEmailSequence] = useState<EmailSequenceData | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [expandedEmailIndex, setExpandedEmailIndex] = useState<number | null>(null);

  // AI 草稿生成状态（P2）
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [draftSent, setDraftSent] = useState(false);

  // LinkedIn DM 状态（P6）
  const [linkedInDraft, setLinkedInDraft] = useState<LinkedInDraft | null>(null);
  const [isGeneratingLinkedIn, setIsGeneratingLinkedIn] = useState(false);
  const [linkedInCopied, setLinkedInCopied] = useState(false);

  // 手动丰富化状态（P3）
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichDone, setEnrichDone] = useState(false);

  // Task #125: 排除反馈学习
  const [showExclusionModal, setShowExclusionModal] = useState<string | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');
  const [isExcluding, setIsExcluding] = useState(false);
  
  // 从 URL 参数初始化筛选条件
  const initialStatus = searchParams.get('status') as CandidateStatus | null;
  const initialTier = searchParams.get('tier');
  
  // 筛选条件
  const [filters, setFilters] = useState({
    candidateType: '' as CandidateType | '',
    status: (initialStatus || '') as CandidateStatus | '',
    qualifyTier: initialTier || '',
    search: '',
    period: '', // 7d = 本周
  });

  // 加载数据
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    
    setError(null);
    try {
      const [result, statsData, pipeline] = await Promise.all([
        getCandidatesV2({
          candidateType: filters.candidateType || undefined,
          status: filters.status || undefined,
          qualifyTier: filters.qualifyTier || undefined,
          search: filters.search || undefined,
          limit: 100,
        }),
        getRadarStatsV2(),
        getRadarPipelineStatus().catch(() => null),
      ]);
      setCandidates(result.candidates);
      setTotal(result.total);
      setStats(statsData);
      setPipelineStatus(pipeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 刷新处理
  const handleRefresh = () => loadData(true);

  // 合格化
  const handleQualify = async (candidateId: string, tier: 'A' | 'B' | 'C' | 'excluded') => {
    if (tier === 'excluded') {
      setShowExclusionModal(candidateId);
      return;
    }
    try {
      await qualifyCandidateV2(candidateId, tier);
      loadData(true);
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const confirmExclusion = async () => {
    if (!showExclusionModal) return;
    setIsExcluding(true);
    try {
      await qualifyCandidateV2(showExclusionModal, 'excluded', exclusionReason);
      setShowExclusionModal(null);
      setExclusionReason('');
      loadData(true);
      if (selectedCandidate?.id === showExclusionModal) {
        setSelectedCandidate(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '排除失败');
    } finally {
      setIsExcluding(false);
    }
  };

  // 批量合格化
  const handleBatchQualify = async (tier: 'A' | 'B' | 'C' | 'excluded') => {
    if (selectedIds.size === 0) return;
    try {
      await qualifyCandidatesBatchV2(Array.from(selectedIds), tier);
      setSelectedIds(new Set());
      loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量操作失败');
    }
  };

  // 导入
  const handleImport = async (candidate: CandidateWithSource) => {
    try {
      if (candidate.candidateType === 'OPPORTUNITY') {
        await importCandidateToOpportunityV2(candidate.id);
      } else {
        await importCandidateToCompanyV2(candidate.id);
      }
      loadData(true);
      setSelectedCandidate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    }
  };

  // 发送Outreach邮件
  const _handleSendEmail = async (candidate: CandidateWithSource) => {
    const targetEmail = manualEmail || candidate.email;
    if (!targetEmail) {
      setEmailError('请输入邮箱地址');
      return;
    }

    setIsSendingEmail(true);
    setEmailError(null);

    try {
      const response = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          email: targetEmail,
          language: 'en',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailSent(true);
        setManualEmail('');
        loadData(true);
      } else {
        setEmailError(result.error || result.details || '发送失败');
      }
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 执行客户背调
  const handleResearch = async (candidate: CandidateWithSource) => {
    setIsResearching(true);
    setResearchError(null);

    try {
      const response = await fetch('/api/research/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      const result = await response.json();

      if (result.success) {
        setResearchData(result.data);
        loadData(true);
      } else {
        setResearchError(result.error || result.details || '背调失败');
      }
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : '背调失败');
    } finally {
      setIsResearching(false);
    }
  };

  // 加载已有背调结果
  const loadResearchData = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/research/company?candidateId=${candidateId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setResearchData(result.data);
      }
    } catch {
      // 忽略错误
    }
  };

  // 当选择候选时，加载背调结果 & 重置草稿
  useEffect(() => {
    if (selectedCandidate) {
      loadResearchData(selectedCandidate.id);
      loadEmailSequence(selectedCandidate.id);
    } else {
      setResearchData(null);
      setEmailSequence(null);
    }
    setOutreachDraft(null);
    setDraftError(null);
    setDraftSent(false);
    setEnrichDone(false);
    setLinkedInDraft(null);
    setLinkedInCopied(false);
  }, [selectedCandidate]);

  // 生成 AI 草稿（P2）
  const handleGenerateDraft = async (candidate: CandidateWithSource) => {
    setIsGeneratingDraft(true);
    setDraftError(null);
    setOutreachDraft(null);
    setDraftSent(false);
    try {
      const result = await generateOutreachDraft(candidate.id, manualEmail || undefined);
      if (result.success && result.draft) {
        setOutreachDraft(result.draft);
      } else {
        setDraftError(result.error || '生成失败');
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // 发送 AI 草稿（P2）
  const handleSendDraft = async () => {
    if (!outreachDraft) return;
    setIsSendingDraft(true);
    try {
      const result = await sendOutreachDraft(outreachDraft);
      if (result.success) {
        setDraftSent(true);
        setOutreachDraft(null);
        loadData(true);
      } else {
        setDraftError(result.error || '发送失败');
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setIsSendingDraft(false);
    }
  };

  // LinkedIn DM 草稿生成（P6）
  const handleGenerateLinkedIn = async (candidate: CandidateWithSource, linkedInUrl: string) => {
    setIsGeneratingLinkedIn(true);
    setLinkedInDraft(null);
    setLinkedInCopied(false);
    try {
      const result = await generateLinkedInDraft(candidate.id, linkedInUrl);
      if (result.success && result.draft) {
        setLinkedInDraft(result.draft);
      } else {
        setDraftError(result.error || 'LinkedIn 草稿生成失败');
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGeneratingLinkedIn(false);
    }
  };

  // 复制 LinkedIn DM 并记录外联（P6）
  const handleCopyLinkedIn = async () => {
    if (!linkedInDraft) return;
    await navigator.clipboard.writeText(linkedInDraft.message);
    setLinkedInCopied(true);
    // 异步记录，不阻塞 UI
    void recordLinkedInCopy(linkedInDraft.candidateId, linkedInDraft.linkedInUrl, linkedInDraft.message);
    setTimeout(() => setLinkedInCopied(false), 3000);
  };

  // 手动立即丰富化（P3）
  const handleEnrichNow = async (candidate: CandidateWithSource) => {
    setIsEnriching(true);
    setEnrichDone(false);
    try {
      const result = await enrichCandidateNow(candidate.id);
      if (result.success) {
        setEnrichDone(true);
        loadData(true);
      } else {
        setError(result.error || '丰富化失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '丰富化失败');
    } finally {
      setIsEnriching(false);
    }
  };

  // 生成邮件序列
  const handleGenerateSequence = async (candidate: CandidateWithSource) => {
    setIsGeneratingSequence(true);
    setSequenceError(null);

    try {
      const response = await fetch('/api/research/email-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailSequence(result.data);
      } else {
        setSequenceError(result.error || result.details || '生成失败');
      }
    } catch (err) {
      setSequenceError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGeneratingSequence(false);
    }
  };

  // 加载已有邮件序列
  const loadEmailSequence = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/research/email-sequence?candidateId=${candidateId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setEmailSequence(result.data);
      }
    } catch {
      // 忽略错误
    }
  };

  // 选择/取消选择
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  // 获取状态标签
  const getStatusLabel = (status: CandidateStatus) => {
    const map: Record<CandidateStatus, { label: string; color: string }> = {
      NEW: { label: '待处理', color: 'bg-blue-50 text-blue-600' },
      REVIEWING: { label: '审核中', color: 'bg-amber-50 text-amber-600' },
      QUALIFIED: { label: '已合格', color: 'bg-emerald-50 text-emerald-600' },
      IMPORTED: { label: '已导入', color: 'bg-purple-50 text-purple-600' },
      EXCLUDED: { label: '已排除', color: 'bg-red-50 text-red-600' },
      EXPIRED: { label: '已过期', color: 'bg-slate-50 text-slate-600' },
      ENRICHING: { label: '补全中', color: 'bg-cyan-50 text-cyan-600' },
    };
    return map[status] || { label: status, color: 'bg-slate-50 text-slate-600' };
  };

  // 获取类型图标
  const getTypeIcon = (type: CandidateType) => {
    return type === 'OPPORTUNITY' ? FileText : Building2;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  const steps = pipelineStatus?.steps ?? [];
  const counts = pipelineStatus?.counts ?? {
    profilesActiveCount: 0, sourcesConfiguredCount: 0,
    candidatesNew7d: 0, candidatesQualifiedAB7d: 0, candidatesImported7d: 0, candidatesEnriching: 0,
    lastScanAt: null, lastErrorBrief: null,
    pendingReviewCount: 0, pendingApprovalsCount: 0, enrichPendingCount: 0,
    targetingSpecExists: false, targetingSpecFresh: false, targetingSpecUpdatedAt: null,
    outreachPackGenerated7d: 0, lastUpdatedAt: null,
  };
  const currentStep = pipelineStatus?.currentStep ?? 1;
  const primaryCTA = pipelineStatus?.primaryCTA ?? undefined;
  const errors = pipelineStatus?.errors ?? [];

  // 空态类型判断
  const emptyStateType = candidates.length === 0 
    ? stats?.totalCandidates === 0 
      ? 'no_task' 
      : filters.status || filters.qualifyTier || filters.search 
        ? 'no_results' 
        : 'empty'
    : null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* RadarHeader with Stepper */}
      <RadarHeader
        title="候选池"
        description="审核、分层并导入潜在客户"
        steps={steps}
        counts={counts}
        currentStep={currentStep}
        primaryCTA={primaryCTA}
        errors={errors}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <div className="p-6 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Status Filter Bar */}
        <div className="flex items-center gap-2 bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-2">
          {STATUS_FILTERS.map((filter) => {
            const count = filter.count === 'total' 
              ? total 
              : filter.count && stats 
                ? stats[filter.count as keyof RadarStatsData] as number
                : null;
            const isActive = filters.status === filter.value;
            
            return (
              <button
                key={filter.value}
                onClick={() => setFilters(prev => ({ ...prev, status: filter.value as CandidateStatus | '' }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-[#0B1220] text-[#D4AF37]' 
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {filter.color && (
                  <span className={`w-2 h-2 rounded-full bg-${filter.color}-400`} />
                )}
                {filter.label}
                {count !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[#D4AF37]/20' : 'bg-slate-100'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          
          <div className="flex-1" />
          
          {/* Quick Filters */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, period: prev.period === '7d' ? '' : '7d' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filters.period === '7d'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap size={12} />
            本周
          </button>
          
          {/* Type Filter */}
          <select
            value={filters.candidateType}
            onChange={(e) => setFilters(prev => ({ ...prev, candidateType: e.target.value as CandidateType | '' }))}
            className="px-3 py-1.5 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          >
            <option value="">所有类型</option>
            <option value="COMPANY">公司</option>
            <option value="OPPORTUNITY">机会</option>
            <option value="CONTACT">联系人</option>
          </select>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="搜索..."
              className="w-40 pl-9 pr-3 py-1.5 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0B1B2B] rounded-xl">
            <span className="text-[#D4AF37] text-sm font-medium">
              已选择 {selectedIds.size} 项
            </span>
            <div className="flex-1" />
            <button
              onClick={() => handleBatchQualify('A')}
              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors"
            >
              标记 A 级
            </button>
            <button
              onClick={() => handleBatchQualify('B')}
              className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors"
            >
              标记 B 级
            </button>
            <button
              onClick={() => handleBatchQualify('C')}
              className="px-3 py-1.5 bg-slate-500/20 text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-500/30 transition-colors"
            >
              标记 C 级
            </button>
            <button
              onClick={() => handleBatchQualify('excluded')}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
            >
              排除
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              取消
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Candidates List */}
          <div className="col-span-7 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] overflow-hidden">
            {/* List Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E0D0] bg-[#F0EBD8]">
              <input
                type="checkbox"
                checked={selectedIds.size === candidates.length && candidates.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <span className="text-sm font-medium text-[#0B1B2B]">候选列表</span>
              <span className="text-xs text-slate-400">
                {candidates.length} / {total}
              </span>
            </div>
            
            {/* Empty States */}
            {emptyStateType && (
              <div className="text-center py-16 px-6">
                {emptyStateType === 'no_task' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-[#F0EBD8] flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                      <Search size={28} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">暂无候选数据</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      还没有发现任何候选，请先创建发现任务
                    </p>
                    <Link 
                      href="/customer/radar/tasks"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-colors"
                      style={{background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)'}}
                    >
                      前往发现任务
                      <ArrowRight size={14} />
                    </Link>
                  </>
                )}
                {emptyStateType === 'no_results' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                      <Filter size={28} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">无匹配结果</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      当前筛选条件下没有候选，请尝试调整筛选条件
                    </p>
                    <button 
                      onClick={() => setFilters({ candidateType: '', status: '', qualifyTier: '', search: '', period: '' })}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                      清除筛选
                    </button>
                  </>
                )}
              </div>
            )}
            
            {/* Candidates List */}
            {candidates.length > 0 && (
              <div className="divide-y divide-[#E8E0D0] max-h-[calc(100vh-320px)] overflow-y-auto">
                {candidates.map((candidate) => {
                  const statusInfo = getStatusLabel(candidate.status);
                  const TypeIcon = getTypeIcon(candidate.candidateType);
                  const isSelected = selectedCandidate?.id === candidate.id;
                  const isChecked = selectedIds.has(candidate.id);
                  
                  return (
                    <div 
                      key={candidate.id}
                      onClick={() => {
                        setSelectedCandidate(isSelected ? null : candidate);
                        // 重置邮件状态
                        setEmailSent(false);
                        setEmailError(null);
                        setManualEmail('');
                        // 重置背调状态
                        setResearchData(null);
                        setResearchError(null);
                        // 重置邮件序列状态
                        setEmailSequence(null);
                        setSequenceError(null);
                        setExpandedEmailIndex(null);
                      }}
                      className={`flex items-center gap-3 p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#D4AF37]/5' 
                          : 'hover:bg-[#F0EBD8]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(candidate.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      
                      <div className="w-10 h-10 bg-[#F0EBD8] rounded-xl flex items-center justify-center shrink-0" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                        <TypeIcon size={18} className="text-[#D4AF37]" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-[#0B1B2B] truncate">
                            {candidate.displayName}
                          </h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {candidate.qualifyTier && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              candidate.qualifyTier === 'A' ? 'bg-emerald-100 text-emerald-700' :
                              candidate.qualifyTier === 'B' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {candidate.qualifyTier}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Globe size={10} />
                            {candidate.source.name}
                          </span>
                          {(candidate.buyerCountry || candidate.country) && (
                            <span>{candidate.buyerCountry || candidate.country}</span>
                          )}
                          {candidate.deadline && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Calendar size={10} />
                              {new Date(candidate.deadline).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                          {candidate.estimatedValue && (
                            <span className="flex items-center gap-1">
                              <DollarSign size={10} />
                              {candidate.estimatedValue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {candidate.matchScore && (
                        <div className="text-right shrink-0">
                          <div className={`text-lg font-bold ${
                            candidate.matchScore >= 80 ? 'text-emerald-600' :
                            candidate.matchScore >= 60 ? 'text-amber-600' :
                            'text-slate-400'
                          }`}>
                            {candidate.matchScore}
                          </div>
                          <div className="text-[10px] text-slate-400">匹配分</div>
                        </div>
                      )}
                      
                      <ChevronRight size={16} className={`shrink-0 transition-colors ${
                        isSelected ? 'text-[#D4AF37]' : 'text-slate-300'
                      }`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="col-span-5 space-y-4">
            {selectedCandidate ? (
              <>
                {/* Basic Info Card */}
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/80 rounded-xl flex items-center justify-center">
                      {selectedCandidate.candidateType === 'OPPORTUNITY' ? (
                        <FileText size={24} className="text-[#0B1B2B]" />
                      ) : (
                        <Building2 size={24} className="text-[#0B1B2B]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#0B1B2B] truncate">{selectedCandidate.displayName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{selectedCandidate.source.name}</span>
                        {selectedCandidate.sourceUrl && (
                          <a 
                            href={selectedCandidate.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#D4AF37] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Score */}
                  {selectedCandidate.matchScore !== null && (
                    <div className="mb-4 p-3 bg-[#F0EBD8] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">ICP 匹配度</span>
                        <span className={`text-xl font-bold ${
                          (selectedCandidate.matchScore || 0) >= 80 ? 'text-emerald-600' :
                          (selectedCandidate.matchScore || 0) >= 60 ? 'text-amber-600' :
                          'text-slate-500'
                        }`}>
                          {selectedCandidate.matchScore}%
                        </span>
                      </div>
                      {selectedCandidate.matchExplain && (
                        <div className="text-xs text-slate-600">
                          {(selectedCandidate.matchExplain as { reasons?: string[] })?.reasons?.slice(0, 3).map((reason, i) => (
                            <div key={i} className="flex items-start gap-1.5 mt-1">
                              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="space-y-2 text-sm">
                    {selectedCandidate.buyerName && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{selectedCandidate.buyerName}</span>
                      </div>
                    )}
                    {(selectedCandidate.buyerCountry || selectedCandidate.country) && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Globe size={14} className="text-slate-400 shrink-0" />
                        <span>{selectedCandidate.buyerCountry || selectedCandidate.country}</span>
                      </div>
                    )}
                    {selectedCandidate.email && (
                      <a href={`mailto:${selectedCandidate.email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#D4AF37]">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{selectedCandidate.email}</span>
                      </a>
                    )}
                    {selectedCandidate.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span>{selectedCandidate.phone}</span>
                      </div>
                    )}
                    {selectedCandidate.deadline && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Calendar size={14} className="shrink-0" />
                        <span>截止: {new Date(selectedCandidate.deadline).toLocaleDateString('zh-CN')}</span>
                      </div>
                    )}
                    {selectedCandidate.estimatedValue && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign size={14} className="text-slate-400 shrink-0" />
                        <span>预估: {selectedCandidate.estimatedValue.toLocaleString()} {selectedCandidate.currency}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Summary */}
                {selectedCandidate.aiSummary && !researchData && (
                  <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                      <Sparkles size={14} className="text-[#D4AF37]" />
                      AI 分析
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedCandidate.aiSummary}
                    </p>
                  </div>
                )}

                {/* AI 评估依据 */}
                {(() => {
                  const rel = selectedCandidate.aiRelevance as {
                    tier?: string;
                    matchReasons?: string[];
                    approachAngle?: string;
                    signalScores?: { overallScore?: number };
                  } | null;
                  if (!rel?.matchReasons?.length) return null;
                  return (
                    <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                        <Target size={14} className="text-[#D4AF37]" />
                        AI 评估依据
                        {rel.tier && (
                          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                            rel.tier === 'A' ? 'bg-emerald-100 text-emerald-700' :
                            rel.tier === 'B' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>Tier {rel.tier}</span>
                        )}
                      </h4>
                      <div className="space-y-2 mb-3">
                        {rel.matchReasons.map((reason, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                      {rel.approachAngle && (
                        <div className="bg-[#F0EBD8] rounded-xl p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#0B1B2B] mb-1">
                            <Zap size={11} className="text-[#D4AF37]" />
                            推荐接触角度
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{rel.approachAngle}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 情报面板：融资 + 决策者邮箱 + 信号评分 */}
                {(() => {
                  const raw = selectedCandidate.rawData as CandidateRadarData | null;

                  const intel = raw?.intelligence;
                  const signals =
                    raw?.signalScores ||
                    (selectedCandidate.aiRelevance as CandidateRadarData | null)?.signalScores;
                  if (!intel && !signals) return null;

                  return (
                    <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-4">
                        <TrendingUp size={14} className="text-[#D4AF37]" />
                        情报雷达
                      </h4>

                      {/* 信号评分可视化 */}
                      {signals && (
                        <div className="mb-4 space-y-2">
                          {[
                            { label: '融资信号', value: signals.fundingSignal ?? 0, color: 'bg-emerald-400' },
                            { label: '新闻热度', value: signals.newsSignal ?? 0, color: 'bg-blue-400' },
                            { label: '联系人', value: signals.contactSignal ?? 0, color: 'bg-amber-400' },
                          ].map(({ label, value, color }) => (
                            <div key={label}>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>{label}</span>
                                <span>{value}</span>
                              </div>
                              <div className="h-1.5 bg-[#E8E0D0] rounded-full overflow-hidden">
                                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 融资信息 */}
                      {intel?.funding && (intel.funding.latestRound || intel.funding.totalRaised) && (
                        <div className="mb-3 bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                          <div className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                            <DollarSign size={11} className="text-[#D4AF37]" />
                            融资动态
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            {intel.funding.latestRound && (
                              <div><span className="text-slate-400">轮次：</span>{intel.funding.latestRound} {intel.funding.latestRoundDate}</div>
                            )}
                            {intel.funding.totalRaised && (
                              <div><span className="text-slate-400">累计：</span>{intel.funding.totalRaised}</div>
                            )}
                            {intel.funding.valuation && (
                              <div><span className="text-slate-400">估值：</span>{intel.funding.valuation}</div>
                            )}
                            {intel.funding.leadInvestors?.length ? (
                              <div className="col-span-2"><span className="text-slate-400">投资方：</span>{intel.funding.leadInvestors.slice(0, 3).join('、')}</div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* 决策者联系人 */}
                      {intel?.contacts?.decisionMakers?.length ? (
                        <div className="mb-3 bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                          <div className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                            <Users size={11} className="text-[#D4AF37]" />
                            决策者联系人
                          </div>
                          <div className="space-y-2">
                            {intel.contacts.decisionMakers.slice(0, 3).map((person, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[9px] font-bold text-[#D4AF37]">{person.name.charAt(0)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-medium text-[#0B1B2B] truncate">{person.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{person.title}</div>
                                  {person.email && (
                                    <a
                                      href={`mailto:${person.email}`}
                                      className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 truncate"
                                    >
                                      <Mail size={9} />
                                      {person.email}
                                      {person.emailConfidence && (
                                        <span className="text-slate-400 shrink-0">({person.emailConfidence}%)</span>
                                      )}
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* 最新新闻 */}
                      {intel?.news?.recentHeadlines?.length ? (
                        <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                          <div className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1.5">
                            <Clock size={11} className="text-[#D4AF37]" />
                            近期动态
                            {intel.news.sentiment && (
                              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${
                                intel.news.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                                intel.news.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {intel.news.sentiment === 'positive' ? '积极' : intel.news.sentiment === 'negative' ? '消极' : '中性'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {intel.news.recentHeadlines.slice(0, 3).map((headline, i) => (
                              <div key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                <span className="text-[#D4AF37] mt-0.5 shrink-0">•</span>
                                <span className="line-clamp-2">{headline}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* AI背调模块 */}
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B]">
                      <SearchCheck size={14} className="text-[#D4AF37]" />
                      AI 客户背调
                    </h4>
                    {researchData && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        已完成
                      </span>
                    )}
                  </div>

                  {isResearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={24} className="text-[#D4AF37] animate-spin" />
                      <span className="ml-2 text-sm text-slate-500">AI正在深度分析...</span>
                    </div>
                  ) : researchData ? (
                    <div className="space-y-4">
                      {/* 公司概况 */}
                      <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                        <h5 className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                          <Building2 size={12} className="text-[#D4AF37]" />
                          公司概况
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-400">类型：</span>{researchData.overview?.businessType}</div>
                          <div><span className="text-slate-400">规模：</span>{researchData.overview?.scale}</div>
                          <div><span className="text-slate-400">定位：</span>{researchData.overview?.marketPosition}</div>
                          <div><span className="text-slate-400">覆盖：</span>{researchData.overview?.geographicFocus}</div>
                        </div>
                      </div>

                      {/* 行业分析 */}
                      <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                        <h5 className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                          <TrendingUp size={12} className="text-[#D4AF37]" />
                          行业分析
                        </h5>
                        <div className="text-xs space-y-1">
                          <div><span className="text-slate-400">主行业：</span>{researchData.industry?.primaryIndustry}</div>
                          <div><span className="text-slate-400">趋势：</span>{researchData.industry?.industryTrends?.join('、')}</div>
                        </div>
                      </div>

                      {/* 潜在痛点 */}
                      <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                        <h5 className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                          <Target size={12} className="text-[#D4AF37]" />
                          潜在痛点
                        </h5>
                        <div className="space-y-1">
                          {researchData.painPoints?.operational?.slice(0, 3).map((p: string, i: number) => (
                            <div key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-amber-500">•</span>
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 决策链 */}
                      <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                        <h5 className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                          <Users size={12} className="text-[#D4AF37]" />
                          决策链推断
                        </h5>
                        <div className="text-xs space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">主要</span>
                            <span>{researchData.decisionMakers?.primary?.role}</span>
                          </div>
                          <div className="text-slate-500">
                            关注：{researchData.decisionMakers?.primary?.concerns?.join('、')}
                          </div>
                        </div>
                      </div>

                      {/* 推荐策略 */}
                      <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent rounded-xl border border-[#D4AF37]/30 p-3">
                        <h5 className="text-xs font-medium text-[#0B1B2B] mb-2 flex items-center gap-1">
                          <MessageSquare size={12} className="text-[#D4AF37]" />
                          推荐接触策略
                        </h5>
                        <div className="text-xs space-y-2">
                          <div className="font-medium text-[#0B1B2B]">{researchData.outreachStrategy?.valueProposition}</div>
                          <div className="text-slate-600">
                            <span className="text-slate-400">谈资：</span>
                            {researchData.outreachStrategy?.talkingPoints?.slice(0, 2).join('；')}
                          </div>
                        </div>
                      </div>

                      {/* 风险提示 */}
                      <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                        researchData.risks?.level === 'high' ? 'bg-red-50 text-red-600' :
                        researchData.risks?.level === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        <Shield size={12} />
                        <span>风险等级：{researchData.risks?.level?.toUpperCase()}</span>
                        <span className="text-slate-400 ml-auto">置信度：{researchData.confidence}%</span>
                      </div>

                      {/* 重新背调按钮 */}
                      <button
                        onClick={() => handleResearch(selectedCandidate)}
                        className="w-full py-2 text-xs text-slate-500 hover:text-[#D4AF37] transition-colors"
                      >
                        重新分析
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-slate-500 mb-3">
                        AI将深度分析目标公司的行业、痛点、决策链
                      </p>
                      <button
                        onClick={() => handleResearch(selectedCandidate)}
                        className="px-4 py-2 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors inline-flex items-center gap-2"
                      >
                        <SearchCheck size={14} />
                        开始背调
                      </button>
                      {researchError && (
                        <p className="text-xs text-red-500 mt-2">{researchError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 内容联动面板 */}
                <RadarContentMatchPanel
                  candidateId={selectedCandidate.id}
                  candidateName={selectedCandidate.displayName}
                />

                {/* 邮件序列模块 */}
                {researchData && (
                  <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B]">
                        <Mail size={14} className="text-[#D4AF37]" />
                        AI 邮件序列
                      </h4>
                      {emailSequence && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          {emailSequence.totalEmails}封邮件
                        </span>
                      )}
                    </div>

                    {isGeneratingSequence ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="text-[#D4AF37] animate-spin" />
                        <span className="ml-2 text-sm text-slate-500">AI正在设计邮件序列...</span>
                      </div>
                    ) : emailSequence ? (
                      <div className="space-y-3">
                        {/* 序列概览 */}
                        <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-slate-500">目标：{emailSequence.goal}</span>
                            <span className="text-slate-400">{emailSequence.estimatedDuration}</span>
                          </div>
                        </div>

                        {/* 邮件列表 */}
                        {emailSequence.emails?.map((email: EmailSequenceItem, idx: number) => (
                          <div key={idx} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] overflow-hidden">
                            <button
                              onClick={() => setExpandedEmailIndex(expandedEmailIndex === idx ? null : idx)}
                              className="w-full p-3 text-left flex items-center justify-between hover:bg-[#F7F3E8] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs flex items-center justify-center font-medium">
                                  {email.order}
                                </span>
                                <div>
                                  <div className="text-xs font-medium text-[#0B1B2B]">{email.name}</div>
                                  <div className="text-[10px] text-slate-400">{email.sendDelay}</div>
                                </div>
                              </div>
                              <ChevronRight
                                size={14}
                                className={`text-slate-400 transition-transform ${expandedEmailIndex === idx ? 'rotate-90' : ''}`}
                              />
                            </button>

                            {expandedEmailIndex === idx && (
                              <div className="px-3 pb-3 space-y-2 border-t border-[#E8E0D0]">
                                {/* 主题和预览 */}
                                <div className="pt-2">
                                  <div className="text-xs font-medium text-[#0B1B2B] mb-1">{email.subject}</div>
                                  <div className="text-[10px] text-slate-400 italic">{email.previewText}</div>
                                </div>

                                {/* 正文 */}
                                <div className="text-xs text-slate-600 whitespace-pre-wrap bg-white rounded-lg p-2 border border-[#E8E0D0]">
                                  {email.body}
                                </div>

                                {/* CTA */}
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-[#D4AF37] text-[#0B1B2B] rounded text-[10px] font-medium">
                                    {email.cta?.text}
                                  </span>
                                </div>

                                {/* 心理学触发点 */}
                                {email.psychologicalTrigger && (
                                  <div className="text-[10px] text-purple-600 flex items-center gap-1">
                                    <Zap size={10} />
                                    {email.psychologicalTrigger}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* 重新生成按钮 */}
                        <button
                          onClick={() => handleGenerateSequence(selectedCandidate)}
                          className="w-full py-2 text-xs text-slate-500 hover:text-[#D4AF37] transition-colors"
                        >
                          重新生成序列
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-xs text-slate-500 mb-3">
                          基于背调结果，AI将设计5轮跟进邮件
                        </p>
                        <button
                          onClick={() => handleGenerateSequence(selectedCandidate)}
                          className="px-4 py-2 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors inline-flex items-center gap-2"
                        >
                          <Mail size={14} />
                          生成邮件序列
                        </button>
                        {sequenceError && (
                          <p className="text-xs text-red-500 mt-2">{sequenceError}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                  <h4 className="text-sm font-bold text-[#0B1B2B] mb-3">操作</h4>
                  
                  {/* Qualify Tier */}
                  {selectedCandidate.status !== 'IMPORTED' && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2">分层评级</p>
                      <div className="flex gap-2 w-full">
                        {(['A', 'B', 'C', 'excluded'] as const).map((tier) => {
                          const isActive = selectedCandidate.qualifyTier === tier || 
                            (tier === 'excluded' && selectedCandidate.status === 'EXCLUDED');
                          return (
                            <button
                              key={tier}
                              onClick={() => handleQualify(selectedCandidate.id, tier)}
                              className={`flex-1 min-w-0 py-2 rounded-lg text-xs font-medium transition-all truncate ${
                                isActive
                                  ? tier === 'A' ? 'bg-emerald-500 text-white' :
                                    tier === 'B' ? 'bg-amber-500 text-white' :
                                    tier === 'C' ? 'bg-slate-500 text-white' :
                                    'bg-red-500 text-white'
                                  : tier === 'excluded'
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {tier === 'excluded' ? '排除' : `${tier} 级`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Import Button */}
                  {selectedCandidate.status === 'QUALIFIED' && selectedCandidate.qualifyTier && (
                    <button
                      onClick={() => handleImport(selectedCandidate)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0B1B2B] text-[#D4AF37] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
                    >
                      <Download size={16} />
                      导入到{selectedCandidate.candidateType === 'OPPORTUNITY' ? '机会池' : '线索库'}
                    </button>
                  )}

                  {/* 发送开发信（AI 草稿生成）*/}
                  {(selectedCandidate.status === 'QUALIFIED' || selectedCandidate.status === 'NEW') &&
                   selectedCandidate.qualifyTier && selectedCandidate.qualifyTier !== 'excluded' && (
                    <div className="mt-3 pt-3 border-t border-[#E8E0D0]">
                      <p className="text-xs text-slate-500 mb-2">发送开发信</p>

                      {/* 手动输入邮箱（候选无邮箱时）*/}
                      {!selectedCandidate.email && !outreachDraft && (
                        <input
                          type="email"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          placeholder="输入邮箱地址"
                          className="w-full px-3 py-2 mb-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                        />
                      )}

                      {draftSent ? (
                        <div className="flex items-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm">
                          <CheckCircle2 size={16} />
                          邮件已发送！
                        </div>
                      ) : outreachDraft ? (
                        /* 草稿预览 + 编辑 + 发送 */
                        <div className="space-y-2">
                          <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                            <div className="text-[10px] text-slate-400 mb-1">收件人</div>
                            <div className="text-xs text-slate-700 font-medium truncate">{outreachDraft.toEmail}</div>
                            <div className="text-[10px] text-slate-400 mt-2 mb-1">主题</div>
                            <input
                              value={outreachDraft.subject}
                              onChange={(e) => setOutreachDraft({ ...outreachDraft, subject: e.target.value })}
                              className="w-full text-xs text-[#0B1B2B] bg-transparent border-0 focus:outline-none font-medium"
                            />
                            <div className="text-[10px] text-slate-400 mt-2 mb-1">正文</div>
                            <textarea
                              value={outreachDraft.body}
                              onChange={(e) => setOutreachDraft({ ...outreachDraft, body: e.target.value })}
                              rows={8}
                              className="w-full text-[11px] text-slate-600 bg-transparent border-0 resize-none focus:outline-none leading-relaxed"
                            />
                          </div>
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => setOutreachDraft(null)}
                              className="flex-1 min-w-0 py-2 text-xs text-slate-500 border border-[#E8E0D0] rounded-xl hover:bg-[#F7F3E8] transition-colors truncate"
                            >
                              重新生成
                            </button>
                            <button
                              onClick={handleSendDraft}
                              disabled={isSendingDraft}
                              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-xs font-medium hover:bg-[#C5A030] transition-colors disabled:opacity-50"
                            >
                              {isSendingDraft ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                              {isSendingDraft ? '发送中...' : '确认发送'}
                            </button>
                          </div>
                          {draftError && <p className="text-[11px] text-red-500">{draftError}</p>}
                        </div>
                      ) : (
                        /* 生成草稿按钮 */
                        <button
                          onClick={() => handleGenerateDraft(selectedCandidate)}
                          disabled={isGeneratingDraft || (!selectedCandidate.email && !manualEmail)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingDraft ? (
                            <><Loader2 size={16} className="animate-spin" />AI 生成草稿中...</>
                          ) : (
                            <><Sparkles size={16} />AI 生成开发信草稿</>
                          )}
                        </button>
                      )}
                      {draftError && !outreachDraft && <p className="text-xs text-red-500 mt-2">{draftError}</p>}
                    </div>
                  )}

                  {/* LinkedIn DM（P6）— 有决策者 linkedIn 时显示 */}
                  {(() => {
                    const intel = (selectedCandidate.rawData as {
                      intelligence?: {
                        contacts?: {
                          decisionMakers?: Array<{ name: string; title: string; linkedIn?: string }>;
                        };
                      };
                    } | null)?.intelligence;
                    const linkedInProfiles = intel?.contacts?.decisionMakers?.filter(p => p.linkedIn) ?? [];
                    if (linkedInProfiles.length === 0) return null;
                    const targetPerson = linkedInProfiles[0];
                    const linkedInUrl = targetPerson.linkedIn!;
                    return (
                      <div className="mt-3 pt-3 border-t border-[#E8E0D0]">
                        <div className="text-[11px] font-medium text-[#0B1B2B] mb-2 flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#0A66C2]" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn DM — {targetPerson.name}
                          <a
                            href={linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-[10px] text-[#0A66C2] hover:underline"
                          >
                            查看主页 →
                          </a>
                        </div>

                        {linkedInDraft?.candidateId === selectedCandidate.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={linkedInDraft.message}
                              onChange={e => setLinkedInDraft({ ...linkedInDraft, message: e.target.value })}
                              rows={4}
                              maxLength={300}
                              className="w-full px-3 py-2 border border-[#E8E0D0] rounded-xl text-[11px] leading-relaxed resize-none focus:outline-none focus:border-[#0A66C2] bg-white"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>{linkedInDraft.message.length}/300 字符</span>
                              <button
                                onClick={() => setLinkedInDraft(null)}
                                className="hover:text-slate-600"
                              >
                                重新生成
                              </button>
                            </div>
                            <button
                              onClick={handleCopyLinkedIn}
                              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                linkedInCopied
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-[#0A66C2] text-white hover:bg-[#004182]'
                              }`}
                            >
                              {linkedInCopied ? (
                                <><CheckCircle2 size={15} />已复制！去 LinkedIn 粘贴发送</>
                              ) : (
                                <><Copy size={15} />一键复制 DM</>
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateLinkedIn(selectedCandidate, linkedInUrl)}
                            disabled={isGeneratingLinkedIn}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-[#0A66C2] text-[#0A66C2] rounded-xl text-sm font-medium hover:bg-[#0A66C2]/5 transition-colors disabled:opacity-50"
                          >
                            {isGeneratingLinkedIn ? (
                              <><Loader2 size={15} className="animate-spin" />AI 生成 DM 中...</>
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0A66C2]" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                AI 生成 LinkedIn DM
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* 立即丰富化（P3）*/}
                  {selectedCandidate.status !== 'IMPORTED' && (
                    <div className="mt-3 pt-3 border-t border-[#E8E0D0]">
                      {enrichDone ? (
                        <div className="flex items-center gap-2 py-2 text-emerald-600 text-xs">
                          <CheckCircle2 size={14} />
                          情报丰富化完成，已更新数据
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEnrichNow(selectedCandidate)}
                          disabled={isEnriching}
                          className="w-full flex items-center justify-center gap-2 py-2 border border-[#E8E0D0] text-slate-500 rounded-xl text-xs hover:bg-[#F7F3E8] hover:text-[#0B1B2B] transition-colors disabled:opacity-50"
                        >
                          {isEnriching ? (
                            <><Loader2 size={13} className="animate-spin" />情报丰富化中...</>
                          ) : (
                            <><Zap size={13} />立即丰富情报</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Already Imported */}
                  {selectedCandidate.status === 'IMPORTED' && (
                    <div className="flex items-center gap-2 py-2.5 px-4 bg-purple-50 text-purple-600 rounded-xl text-sm">
                      <CheckCircle2 size={16} />
                      已导入到{selectedCandidate.importedToType === 'Opportunity' ? '机会池' : '线索库'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* No Selection */
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                  <Search size={28} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-sm font-bold text-[#0B1B2B] mb-2">选择候选查看详情</h3>
                <p className="text-xs text-slate-500">
                  点击左侧列表中的候选项，查看详细信息并进行操作
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exclusion Reason Modal (Task #125) */}
      {showExclusionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#E8E0D0] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-[#0B1B2B] mb-2">确认排除该候选？</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                排除后，AI 将学习您的反馈，逐步优化推荐逻辑，减少此类“非目标”候选的出现。
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">排除原因 (将用于 AI 学习)</label>
                  <select 
                    value={exclusionReason.startsWith('其他: ') ? '其他' : exclusionReason}
                    onChange={(e) => setExclusionReason(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F7F3E8] border border-[#E8E0D0] rounded-xl text-sm focus:outline-none focus:border-[#D4AF37] appearance-none"
                  >
                    <option value="">-- 请选择原因 (可选) --</option>
                    <option value="行业不匹配">行业不匹配 (Wrong Industry)</option>
                    <option value="规模太小/个人">规模太小/个人 (Too Small/Individual)</option>
                    <option value="竞争对手">竞争对手 (Competitor)</option>
                    <option value="中间商/代理商">中间商/代理商 (Distributor/Agent)</option>
                    <option value="无出海需求">无出海需求 (No Overseas Demand)</option>
                    <option value="其他">其他 (Other)</option>
                  </select>
                </div>

                {(exclusionReason === '其他' || exclusionReason.startsWith('其他: ')) && (
                  <textarea
                    placeholder="请输入具体原因，帮助 AI 更好理解您的需求..."
                    rows={3}
                    defaultValue={exclusionReason.startsWith('其他: ') ? exclusionReason.replace('其他: ', '') : ''}
                    className="w-full px-4 py-3 bg-[#F7F3E8] border border-[#E8E0D0] rounded-xl text-sm focus:outline-none focus:border-[#D4AF37] resize-none"
                    onBlur={(e) => setExclusionReason(`其他: ${e.target.value}`)}
                  />
                )}
              </div>
            </div>
            
            <div className="flex border-t border-[#E8E0D0] w-full">
              <button
                onClick={() => {
                  setShowExclusionModal(null);
                  setExclusionReason('');
                }}
                className="flex-1 min-w-0 py-5 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors truncate"
              >
                返回
              </button>
              <button
                onClick={confirmExclusion}
                disabled={isExcluding}
                className="flex-1 min-w-0 py-5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors border-l border-[#E8E0D0] disabled:opacity-50 truncate"
              >
                {isExcluding ? '正在处理...' : '确认排除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
