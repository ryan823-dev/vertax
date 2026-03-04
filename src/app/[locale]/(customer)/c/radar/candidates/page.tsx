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
  RefreshCw,
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
  Star,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowRight,
  Zap,
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
import { getRadarPipelineStatus } from '@/actions/radar-pipeline';
import type { RadarPipelineStatus } from '@/lib/radar/pipeline';
import type { RadarCandidate, RadarSource } from '@/generated/prisma/client';
import type { CandidateType, CandidateStatus } from '@/generated/prisma/enums';
import { RadarHeader } from '@/components/radar/radar-header';

// ==================== 类型 ====================

type CandidateWithSource = RadarCandidate & { source: RadarSource };

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
        getRadarPipelineStatus(),
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

  if (isLoading || !pipelineStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#C7A56A] animate-spin" />
      </div>
    );
  }

  const { steps, counts, currentStep, primaryCTA, errors } = pipelineStatus;

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
        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E7E0D3] p-2">
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
                    ? 'bg-[#0B1B2B] text-[#C7A56A]' 
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {filter.color && (
                  <span className={`w-2 h-2 rounded-full bg-${filter.color}-400`} />
                )}
                {filter.label}
                {count !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[#C7A56A]/20' : 'bg-slate-100'
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
            className="px-3 py-1.5 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C7A56A]"
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
              className="w-40 pl-9 pr-3 py-1.5 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C7A56A]"
            />
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0B1B2B] rounded-xl">
            <span className="text-[#C7A56A] text-sm font-medium">
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
          <div className="col-span-7 bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden">
            {/* List Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E7E0D3] bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.size === candidates.length && candidates.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-[#C7A56A] focus:ring-[#C7A56A]"
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
                    <div className="w-16 h-16 rounded-2xl bg-[#F7F3EA] flex items-center justify-center mx-auto mb-4">
                      <Search size={28} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">暂无候选数据</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      还没有发现任何候选，请先创建发现任务
                    </p>
                    <Link 
                      href="/c/radar/tasks"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
                    >
                      前往发现任务
                      <ArrowRight size={14} />
                    </Link>
                  </>
                )}
                {emptyStateType === 'no_results' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                      <Filter size={28} className="text-amber-400" />
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
              <div className="divide-y divide-[#E7E0D3] max-h-[calc(100vh-320px)] overflow-y-auto">
                {candidates.map((candidate) => {
                  const statusInfo = getStatusLabel(candidate.status);
                  const TypeIcon = getTypeIcon(candidate.candidateType);
                  const isSelected = selectedCandidate?.id === candidate.id;
                  const isChecked = selectedIds.has(candidate.id);
                  
                  return (
                    <div 
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(isSelected ? null : candidate)}
                      className={`flex items-center gap-3 p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#C7A56A]/5' 
                          : 'hover:bg-slate-50'
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
                        className="w-4 h-4 rounded border-slate-300 text-[#C7A56A] focus:ring-[#C7A56A]"
                      />
                      
                      <div className="w-10 h-10 bg-[#F7F3EA] rounded-xl flex items-center justify-center shrink-0">
                        <TypeIcon size={18} className="text-[#C7A56A]" />
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
                        isSelected ? 'text-[#C7A56A]' : 'text-slate-300'
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
                <div className="bg-white rounded-2xl border border-[#E7E0D3] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/80 rounded-xl flex items-center justify-center">
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
                            className="text-[#C7A56A] hover:underline"
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
                    <div className="mb-4 p-3 bg-[#F7F3EA] rounded-xl">
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
                      <a href={`mailto:${selectedCandidate.email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#C7A56A]">
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
                {selectedCandidate.aiSummary && (
                  <div className="bg-white rounded-2xl border border-[#E7E0D3] p-5">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B] mb-3">
                      <Sparkles size={14} className="text-[#C7A56A]" />
                      AI 分析
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedCandidate.aiSummary}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="bg-white rounded-2xl border border-[#E7E0D3] p-5">
                  <h4 className="text-sm font-bold text-[#0B1B2B] mb-3">操作</h4>
                  
                  {/* Qualify Tier */}
                  {selectedCandidate.status !== 'IMPORTED' && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2">分层评级</p>
                      <div className="flex gap-2">
                        {(['A', 'B', 'C', 'excluded'] as const).map((tier) => {
                          const isActive = selectedCandidate.qualifyTier === tier || 
                            (tier === 'excluded' && selectedCandidate.status === 'EXCLUDED');
                          return (
                            <button
                              key={tier}
                              onClick={() => handleQualify(selectedCandidate.id, tier)}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
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
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors"
                    >
                      <Download size={16} />
                      导入到{selectedCandidate.candidateType === 'OPPORTUNITY' ? '机会池' : '线索库'}
                    </button>
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
              <div className="bg-white rounded-2xl border border-[#E7E0D3] p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F7F3EA] flex items-center justify-center mx-auto mb-4">
                  <Search size={28} className="text-slate-300" />
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
    </div>
  );
}
