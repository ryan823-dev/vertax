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
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  DollarSign,
  Filter,
  ChevronRight,
  Download,
  Sparkles,
  Clock,
  ArrowRight,
  Zap,
  SearchCheck,
  Target,
  Users,
  TrendingUp,
  Shield,
  Linkedin,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import {
  getCandidatesV2,
  qualifyCandidateV2,
  qualifyCandidatesBatchV2,
  importCandidatesBatchV2,
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
import type { CandidateStatus } from '@prisma/client';
import { RadarHeader } from '@/components/radar/radar-header';
import { toast } from 'sonner';

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
      phone?: string;
      linkedIn?: string;
      linkedin?: string;
    }>;
    companyContacts?: {
      emails?: string[];
      phones?: string[];
      linkedInUrls?: string[];
    };
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
}> = [
  { value: '', label: '全部公司候选' },
  { value: 'NEW', label: '待审核' },
  { value: 'QUALIFIED', label: '已分层' },
  { value: 'IMPORTED', label: '已导入' },
  { value: 'EXCLUDED', label: '已排除' },
];

const TIER_FILTERS = [
  { value: '', label: '全部层级' },
  { value: 'A,B', label: 'A / B 高优先' },
  { value: 'A', label: '仅 A 级' },
  { value: 'B', label: '仅 B 级' },
  { value: 'C', label: '仅 C 级' },
] as const;

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
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
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
    status: (initialStatus || '') as CandidateStatus | '',
    qualifyTier: initialTier || '',
    search: '',
  });

  // 加载数据
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    
    setError(null);
    try {
      const [result, statsData, pipeline] = await Promise.all([
        getCandidatesV2({
          candidateType: 'COMPANY',
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

  useEffect(() => {
    setSelectedIds((prev) => {
      const nextIds = candidates.filter((candidate) => prev.has(candidate.id)).map((candidate) => candidate.id);
      const next = new Set(nextIds);
      const unchanged = next.size === prev.size && nextIds.every((id) => prev.has(id));
      return unchanged ? prev : next;
    });

    if (selectedCandidate && !candidates.some((candidate) => candidate.id === selectedCandidate.id)) {
      setSelectedCandidate(null);
    }
  }, [candidates, selectedCandidate]);

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

  const handleBatchEnrich = async () => {
    if (selectedIds.size === 0) return;

    setIsBatchEnriching(true);
    try {
      const ids = Array.from(selectedIds);
      let successCount = 0;

      for (let index = 0; index < ids.length; index += 3) {
        const batch = ids.slice(index, index + 3);
        const results = await Promise.allSettled(batch.map((id) => enrichCandidateNow(id)));

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount += 1;
          }
        }
      }

      await loadData(true);
      toast.success('批量丰富情报完成', {
        description: `成功更新 ${successCount} / ${ids.length} 个候选`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量丰富化失败');
    } finally {
      setIsBatchEnriching(false);
    }
  };

  // 导入
  const handleBatchImport = async () => {
    const companyIds = candidates
      .filter(
        (candidate) =>
          selectedIds.has(candidate.id) &&
          candidate.candidateType === 'COMPANY' &&
          candidate.status !== 'IMPORTED'
      )
      .map((candidate) => candidate.id);

    if (companyIds.length === 0) {
      setError('请先选择至少一个公司候选再导入线索库');
      return;
    }

    setIsBatchImporting(true);
    try {
      const result = await importCandidatesBatchV2(companyIds, 'company');
      setSelectedIds(new Set());
      await loadData(true);
      toast.success('批量导入线索库完成', {
        description: `成功导入 ${result.imported} / ${companyIds.length} 个公司候选`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量导入线索库失败');
    } finally {
      setIsBatchImporting(false);
    }
  };

  const handleImport = async (candidate: CandidateWithSource) => {
    try {
      if (candidate.candidateType === 'OPPORTUNITY') {
        await importCandidateToOpportunityV2(candidate.id);
        toast.success('已导入采购机会', {
          description: '可前往采购机会页面继续跟进',
          action: {
            label: '前往采购机会',
            onClick: () => window.location.href = '/customer/radar/opportunities',
          },
        });
      } else {
        await importCandidateToCompanyV2(candidate.id);
        toast.success('已导入线索库', {
          description: '可在线索库继续跟进，生成外联邮件',
          action: {
            label: '前往线索库',
            onClick: () => window.location.href = '/customer/radar/prospects',
          },
        });
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
        return true; // 有背调结果
      }
      return false; // 无背调结果
    } catch {
      return false;
    }
  };

  // v2.0: 当选择候选时，加载背调结果，如果没有则自动触发背调
  useEffect(() => {
    if (selectedCandidate) {
      // 先加载已有的背调结果
      loadResearchData(selectedCandidate.id).then((hasResult) => {
        // 如果没有背调结果，自动触发背调（避免调用handleResearch导致依赖问题）
        if (!hasResult) {
          setIsResearching(true);
          fetch('/api/research/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: selectedCandidate.id }),
          })
            .then(res => res.json())
            .then(result => {
              if (result.success) {
                setResearchData(result.data);
              }
            })
            .catch(() => {})
            .finally(() => setIsResearching(false));
        }
      });
    } else {
      setResearchData(null);
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
      NEW: { label: '待审核', color: 'bg-blue-50 text-blue-600' },
      REVIEWING: { label: '审核中', color: 'bg-amber-50 text-amber-600' },
      QUALIFIED: { label: '已分层', color: 'bg-emerald-50 text-emerald-600' },
      IMPORTED: { label: '已导入', color: 'bg-purple-50 text-purple-600' },
      EXCLUDED: { label: '已排除', color: 'bg-red-50 text-red-600' },
      EXPIRED: { label: '已过期', color: 'bg-slate-50 text-slate-600' },
      ENRICHING: { label: '补全中', color: 'bg-cyan-50 text-cyan-600' },
    };
    return map[status] || { label: status, color: 'bg-slate-50 text-slate-600' };
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
    profilesActiveCount: 0, sourcesConfiguredCount: 0, candidateTotalCount: 0, prospectCompanyCount: 0, opportunityCount: 0,
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
    ? total === 0
      ? (stats?.opportunities ? 'opportunity_only' : 'no_task')
      : filters.status || filters.qualifyTier || filters.search 
        ? 'no_results' 
        : 'empty'
    : null;

  return (
    <div className="space-y-6">
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

        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7A1C]">候选池默认语义</div>
              <h2 className="mt-2 text-lg font-bold text-[#0B1B2B]">当前只展示公司候选，先回答“为什么是它”</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">采购机会已迁到采购机会页统一管理，联系人不再作为一级列表对象，而是在候选详情中承接。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-[#E8E0D0] bg-[#FCFAF4] px-4 py-3 text-sm">
                <div className="text-xs text-slate-500">公司候选</div>
                <div className="mt-1 font-semibold text-[#0B1B2B]">{total}</div>
              </div>
              <Link
                href="/customer/radar/opportunities"
                className="rounded-2xl border border-[#D4AF37]/35 bg-[#FFF8E8] px-4 py-3 text-sm transition-colors hover:bg-[#FFF2CE]"
              >
                <div className="text-xs text-slate-500">采购机会</div>
                <div className="mt-1 flex items-center gap-2 font-semibold text-[#0B1B2B]">
                  {stats?.opportunities ?? 0} 条机会
                  <ArrowRight size={14} className="text-[#9A7A1C]" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#E8E0D0] bg-[#FFFCF7] p-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const isActive = filters.status === filter.value;

              return (
                <button
                  key={filter.value}
                  onClick={() => setFilters(prev => ({ ...prev, status: filter.value as CandidateStatus | '' }))}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'bg-[#F7F3E8] text-slate-600 hover:bg-[#F0EBD8]'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={filters.qualifyTier}
              onChange={(e) => setFilters(prev => ({ ...prev, qualifyTier: e.target.value }))}
              className="rounded-lg border border-[#E8E0D0] bg-[#FCFAF4] px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              {TIER_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="搜索公司名、网站、行业或来源"
                className="w-full min-w-[240px] rounded-lg border border-[#E8E0D0] bg-[#FCFAF4] py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </div>
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
              onClick={handleBatchImport}
              disabled={isBatchImporting}
              className="px-3 py-1.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs font-medium hover:bg-[#D4AF37]/30 transition-colors disabled:opacity-50"
            >
              {isBatchImporting ? '导入中...' : '批量导入线索库'}
            </button>
            <button
              onClick={handleBatchEnrich}
              disabled={isBatchEnriching}
              className="px-3 py-1.5 bg-sky-500/20 text-sky-300 rounded-lg text-xs font-medium hover:bg-sky-500/30 transition-colors disabled:opacity-50"
            >
              {isBatchEnriching ? '丰富中...' : '批量丰富情报'}
            </button>
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
            {/* Candidates List */}
          <div className="min-w-0 overflow-hidden rounded-[28px] border border-[#E8E0D0] bg-[#F7F3E8] shadow-[0_18px_36px_-28px_rgba(11,27,43,0.35)]">
            {/* List Header */}
            <div className="border-b border-[#E8E0D0] bg-[#F0EBD8] px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === candidates.length && candidates.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <span className="text-sm font-medium text-[#0B1B2B]">公司候选列表</span>
                <span className="text-xs text-slate-400">
                  {candidates.length} / {total}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-white px-2.5 py-1">公司名 / 网站</span>
                <span className="rounded-full bg-white px-2.5 py-1">国家 / 地区</span>
                <span className="rounded-full bg-white px-2.5 py-1">行业</span>
                <span className="rounded-full bg-white px-2.5 py-1">联系人覆盖</span>
                <span className="rounded-full bg-white px-2.5 py-1">匹配理由</span>
                <span className="rounded-full bg-white px-2.5 py-1">ICP 分数 / Tier / 状态</span>
              </div>
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
                      还没有发现任何候选，请先开始自动搜索
                    </p>
                    <Link 
                      href="/customer/radar/search"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-colors"
                      style={{background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)'}}
                    >
                      前往自动搜索
                      <ArrowRight size={14} />
                    </Link>
                  </>
                )}
                {emptyStateType === 'opportunity_only' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                      <Filter size={28} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">当前没有公司候选</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      系统目前沉淀的是采购机会对象，已经和公司候选分开呈现。
                    </p>
                    <Link
                      href="/customer/radar/opportunities"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-colors"
                      style={{background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)'}}
                    >
                      查看采购机会
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
                      onClick={() => setFilters({ status: '', qualifyTier: '', search: '' })}
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
                  const isSelected = selectedCandidate?.id === candidate.id;
                  const isChecked = selectedIds.has(candidate.id);
                  const website = getCandidateWebsite(candidate);
                  const matchReasons = getCandidateReasons(candidate);
                  const contactCoverage = getContactCoverage(candidate);
                  
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
                      className={`cursor-pointer p-4 transition-all ${
                        isSelected 
                          ? 'bg-[#FFF7E5]' 
                          : 'hover:bg-[#F0EBD8]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(candidate.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                        />

                        <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0EBD8] shrink-0" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                          <Building2 size={18} className="text-[#D4AF37]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#0B1B2B] truncate">
                              {candidate.displayName}
                            </h4>
                            {candidate.qualifyTier && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                candidate.qualifyTier === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                candidate.qualifyTier === 'B' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                Tier {candidate.qualifyTier}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            <CandidateMetaPill label={website.label} href={website.href} />
                            <CandidateMetaPill label={getCandidateLocation(candidate)} />
                            <CandidateMetaPill label={getCandidateIndustry(candidate)} />
                            <CandidateMetaPill label={contactCoverage.label} tone={contactCoverage.tone} />
                            <CandidateMetaPill label={`来源：${candidate.source.name}`} />
                          </div>

                          <div className="mt-3 rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7A1C]">
                              为什么是它
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {matchReasons.slice(0, 2).map((reason) => (
                                <ReasonPill key={reason} reason={reason} />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <div className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] px-3 py-2 text-right">
                            <div className="text-[10px] text-slate-400">ICP 分数</div>
                            <div className={`text-lg font-bold ${getMatchScoreColor(candidate.matchScore)}`}>
                              {formatMatchScore(candidate.matchScore)}
                            </div>
                          </div>
                          <ChevronRight size={16} className={`transition-colors ${
                            isSelected ? 'text-[#D4AF37]' : 'text-slate-300'
                          }`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4 xl:sticky xl:top-6">
            {selectedCandidate ? (
              <>
                {/* Basic Info Card */}
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/80 rounded-xl flex items-center justify-center">
                      <Building2 size={24} className="text-[#0B1B2B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#0B1B2B] truncate">{selectedCandidate.displayName}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">{selectedCandidate.source.name}</span>
                        {selectedCandidate.qualifyTier ? (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0B1B2B]">
                            Tier {selectedCandidate.qualifyTier}
                          </span>
                        ) : null}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${getStatusLabel(selectedCandidate.status).color}`}>
                          {getStatusLabel(selectedCandidate.status).label}
                        </span>
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="网站" value={getCandidateWebsite(selectedCandidate).label} href={getCandidateWebsite(selectedCandidate).href} />
                    <DetailItem label="国家 / 地区" value={getCandidateLocation(selectedCandidate)} />
                    <DetailItem label="行业" value={getCandidateIndustry(selectedCandidate)} />
                    <DetailItem label="联系人质量" value={getContactCoverage(selectedCandidate).label} />
                    <DetailItem label="公司电话" value={getCandidatePhone(selectedCandidate).label} href={getCandidatePhone(selectedCandidate).href} />
                    <DetailItem label="公司邮箱" value={getCandidateEmail(selectedCandidate).label} href={getCandidateEmail(selectedCandidate).href} />
                    <DetailItem label="公司 LinkedIn" value={getCandidateLinkedIn(selectedCandidate).label} href={getCandidateLinkedIn(selectedCandidate).href} />
                    <DetailItem label="ICP 分数" value={formatMatchScore(selectedCandidate.matchScore)} accent={getMatchScoreColor(selectedCandidate.matchScore)} />
                    <DetailItem label="补全状态" value={getEnrichmentStatus(selectedCandidate)} />
                  </div>
                  {selectedCandidate.description ? (
                    <div className="mt-4 rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] p-3 text-xs leading-6 text-slate-600">
                      {selectedCandidate.description}
                    </div>
                  ) : null}
                </div>

                {/* Match Reasons */}
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                    <Target size={14} className="text-[#D4AF37]" />
                    为什么命中画像
                  </h4>
                  <div className="space-y-2">
                    {getCandidateReasons(selectedCandidate, 4).map((reason) => (
                      <div key={reason} className="flex items-start gap-2 rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] px-3 py-2 text-xs text-slate-600">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(() => {
                  const rel = selectedCandidate.aiRelevance as {
                    tier?: string;
                    dataGaps?: string[];
                    exclusionReason?: string | null;
                  } | null;
                  const isExcluded = selectedCandidate.qualifyTier === 'excluded' || selectedCandidate.status === 'EXCLUDED';
                  const decisionReason = selectedCandidate.qualifyReason || rel?.exclusionReason || null;
                  const tierSummary = isExcluded
                    ? '当前被判定为不建议进入外联主链路。'
                    : selectedCandidate.qualifyTier === 'A'
                      ? '高匹配、高优先级，建议优先转入富化与外联。'
                      : selectedCandidate.qualifyTier === 'B'
                        ? '匹配度明确，但还需要补足关键信息来提高命中率。'
                        : selectedCandidate.qualifyTier === 'C'
                          ? '当前相关性偏弱，更适合低频跟进或继续观察。'
                          : '当前还没有形成最终分层结论。';

                  if (!decisionReason && !selectedCandidate.qualifyTier && !(rel?.dataGaps?.length)) {
                    return null;
                  }

                  return (
                    <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                        <AlertCircle size={14} className="text-[#D4AF37]" />
                        分层解释
                      </h4>
                      {selectedCandidate.qualifyTier && (
                        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] px-3 py-3 mb-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-[#0B1B2B]">
                              {isExcluded ? '为什么被排除' : `为什么是 ${selectedCandidate.qualifyTier} 档`}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isExcluded
                                ? 'bg-red-50 text-red-600'
                                : selectedCandidate.qualifyTier === 'A'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : selectedCandidate.qualifyTier === 'B'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isExcluded ? '已排除' : `Tier ${selectedCandidate.qualifyTier}`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mt-2">{tierSummary}</p>
                          {decisionReason && (
                            <p className="text-xs text-slate-700 leading-relaxed mt-2">{decisionReason}</p>
                          )}
                        </div>
                      )}
                      {rel?.dataGaps?.length ? (
                        <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-[#FFF9E9] px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7A1C]">
                            还缺什么
                          </p>
                          <div className="mt-2 space-y-1">
                            {rel.dataGaps.slice(0, 4).map((gap) => (
                              <p key={gap} className="text-xs text-slate-600">
                                {gap}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Enrichment Summary */}
                {selectedCandidate.aiSummary && !researchData && (
                  <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                      <Sparkles size={14} className="text-[#D4AF37]" />
                      enrichment 结果摘要
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
                  if (!rel?.matchReasons?.length && !rel?.approachAngle) return null;
                  return (
                    <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                        <MessageSquare size={14} className="text-[#D4AF37]" />
                        推荐接触角度
                        {rel.tier && (
                          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                            rel.tier === 'A' ? 'bg-emerald-100 text-emerald-700' :
                            rel.tier === 'B' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>Tier {rel.tier}</span>
                        )}
                      </h4>
                      {rel.approachAngle ? (
                        <div className="bg-[#F0EBD8] rounded-xl p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#0B1B2B] mb-1">
                            <Zap size={11} className="text-[#D4AF37]" />
                            推荐接触角度
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{rel.approachAngle}</p>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">系统会结合匹配理由、联系人覆盖与近期信号，生成后续触达角度。</div>
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
                                  {person.phone && (
                                    <a
                                      href={buildPhoneHref(person.phone)}
                                      className="text-[10px] text-[#0B1B2B] hover:underline flex items-center gap-1 truncate mt-1"
                                    >
                                      <Phone size={9} />
                                      {person.phone}
                                    </a>
                                  )}
                                  {(person.linkedIn || person.linkedin) && (
                                    <a
                                      href={person.linkedIn || person.linkedin}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-[#0A66C2] hover:underline flex items-center gap-1 truncate mt-1"
                                    >
                                      <Linkedin size={9} />
                                      LinkedIn 主页
                                    </a>
                                  )}
                                  {!person.email && !person.phone && !(person.linkedIn || person.linkedin) && (
                                    <div className="text-[10px] text-amber-600 mt-1">已识别角色，但还没有可触达方式</div>
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
                    // v2.0: 背调改为自动触发，不再显示手动按钮
                    <div className="text-center py-6">
                      <Loader2 size={20} className="text-[#D4AF37] animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-500">
                        AI 正在自动背调中...
                      </p>
                      {researchError && (
                        <p className="text-xs text-red-500 mt-2">{researchError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* v2.0: 内容联动面板暂隐藏，定位待明确 */}
                {/* <RadarContentMatchPanel
                  candidateId={selectedCandidate.id}
                  candidateName={selectedCandidate.displayName}
                /> */}

                {/* v2.0: 邮件序列移至线索库 */}
                {/* 邮件序列模块已隐藏 - 导入线索库后可继续跟进 */}

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
                  
                  {/* v2.0: Import Button - 明确引导用户导入后去线索库继续跟进 */}
                  {selectedCandidate.status === 'QUALIFIED' && selectedCandidate.qualifyTier && (
                    <button
                      onClick={() => handleImport(selectedCandidate)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0B1B2B] text-[#D4AF37] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
                    >
                      <Download size={16} />
                      导入线索库并继续跟进
                    </button>
                  )}

                  {/* v2.0: 发送开发信移至线索库 */}
                  {/* 发送开发信模块已隐藏 - 导入线索库后可继续跟进 */}

                  {/* v2.0: LinkedIn DM移至线索库 */}
                  {/* LinkedIn DM模块已隐藏 - 导入线索库后可继续跟进 */}

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

function CandidateMetaPill({
  label,
  href,
  tone = 'default',
}: {
  label: string;
  href?: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-[#E8E0D0] bg-white text-slate-600';

  const content = <span className="truncate">{label}</span>;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 transition-colors hover:border-[#D4AF37]/35 hover:text-[#9A7A1C] ${toneClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        {content}
        <ExternalLink size={11} className="shrink-0" />
      </a>
    );
  }

  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 ${toneClass}`}>
      {content}
    </span>
  );
}

function ReasonPill({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E8E0D0] bg-white px-2.5 py-1 text-[11px] leading-5 text-slate-600">
      {reason}
    </span>
  );
}

function DetailItem({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string;
  href?: string;
  accent?: string;
}) {
  const content = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 truncate font-medium hover:text-[#9A7A1C] ${accent || 'text-[#0B1B2B]'}`}
    >
      <span className="truncate">{value}</span>
      <ExternalLink size={12} className="shrink-0" />
    </a>
  ) : (
    <span className={`truncate font-medium ${accent || 'text-[#0B1B2B]'}`}>{value}</span>
  );

  return (
    <div className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm">{content}</div>
    </div>
  );
}

function buildPhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function getCandidatePhone(candidate: CandidateWithSource) {
  if (candidate.phone) {
    return { label: candidate.phone, href: buildPhoneHref(candidate.phone) };
  }

  return { label: '电话待补全', href: undefined };
}

function getCandidateEmail(candidate: CandidateWithSource) {
  if (candidate.email) {
    return { label: candidate.email, href: `mailto:${candidate.email}` };
  }

  return { label: '邮箱待补全', href: undefined };
}

function getCandidateLinkedIn(candidate: CandidateWithSource) {
  if (candidate.linkedInUrl) {
    return { label: '已找到公司主页', href: candidate.linkedInUrl };
  }

  return { label: 'LinkedIn 待补全', href: undefined };
}

function getCandidateWebsite(candidate: CandidateWithSource) {
  const rawValue = candidate.website;
  if (!rawValue) {
    return { label: '网站待补全', href: undefined };
  }

  const href = rawValue.startsWith('http') ? rawValue : `https://${rawValue}`;

  try {
    const hostname = new URL(href).hostname.replace(/^www\./, '');
    return { label: hostname, href };
  } catch {
    return { label: rawValue, href };
  }
}

function getCandidateLocation(candidate: CandidateWithSource) {
  return candidate.buyerCountry || candidate.country || '地区待补全';
}

function getCandidateIndustry(candidate: CandidateWithSource) {
  return candidate.industry || '行业待补全';
}

function getCandidateReasons(candidate: CandidateWithSource, limit = 3) {
  const reasons = uniqueStrings([
    ...extractReasonList(candidate.matchExplain),
    ...extractReasonList(candidate.aiRelevance),
  ]);

  if (reasons.length) {
    return reasons.slice(0, limit);
  }

  return buildFallbackReasons(candidate).slice(0, limit);
}

function extractReasonList(value: unknown) {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const directReasons = Array.isArray(record.reasons) ? record.reasons : [];
  const matchReasons = Array.isArray(record.matchReasons) ? record.matchReasons : [];

  return [...directReasons, ...matchReasons].filter(
    (reason): reason is string => typeof reason === 'string' && Boolean(reason.trim())
  );
}

function buildFallbackReasons(candidate: CandidateWithSource) {
  const reasons: string[] = [];

  if (candidate.industry) {
    reasons.push(`命中目标行业：${candidate.industry}`);
  }

  const location = getCandidateLocation(candidate);
  if (location !== '地区待补全') {
    reasons.push(`位于目标市场：${location}`);
  }

  if (candidate.companySize) {
    reasons.push(`公司规模符合画像：${candidate.companySize}`);
  }

  reasons.push(`来自有效来源：${candidate.source.name}`);

  return uniqueStrings(reasons);
}

function getDecisionMakers(candidate: CandidateWithSource) {
  const rawData = candidate.rawData as CandidateRadarData | null;
  return rawData?.intelligence?.contacts?.decisionMakers ?? [];
}

function getReachableDecisionMakerCount(candidate: CandidateWithSource) {
  return getDecisionMakers(candidate).filter(
    (person) => person.email || person.phone || person.linkedIn || person.linkedin
  ).length;
}

function getContactCoverage(candidate: CandidateWithSource) {
  const decisionMakers = getDecisionMakers(candidate);
  const reachableCount = getReachableDecisionMakerCount(candidate);

  if (reachableCount > 0) {
    return {
      label: `已识别 ${reachableCount} 位可触达联系人`,
      tone: 'success' as const,
    };
  }

  if (decisionMakers.length > 0) {
    return {
      label: `已识别 ${decisionMakers.length} 位角色联系人`,
      tone: 'warning' as const,
    };
  }

  if (candidate.email || candidate.phone) {
    return {
      label: '已有公司级联系方式',
      tone: 'success' as const,
    };
  }

  if (candidate.status === 'ENRICHING') {
    return {
      label: '自动识别联系人中',
      tone: 'warning' as const,
    };
  }

  return {
    label: '待补全联系人',
    tone: 'default' as const,
  };
}

function getEnrichmentStatus(candidate: CandidateWithSource) {
  if (candidate.status === 'ENRICHING') {
    return '自动补全中';
  }

  if (candidate.enrichedAt) {
    return `已补全 · ${new Date(candidate.enrichedAt).toLocaleDateString('zh-CN')}`;
  }

  if (candidate.aiSummary || candidate.matchScore !== null) {
    return '已完成基础评估';
  }

  return '待补全';
}

function formatMatchScore(score: number | null | undefined) {
  return score === null || score === undefined ? '待评分' : `${Math.round(score)}%`;
}

function getMatchScoreColor(score: number | null | undefined) {
  if (score === null || score === undefined) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-slate-500';
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
