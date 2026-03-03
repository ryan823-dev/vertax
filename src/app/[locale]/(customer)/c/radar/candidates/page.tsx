"use client";

import { useState, useEffect, useCallback } from 'react';
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
  Check,
  XCircle,
  Star,
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
import type { RadarCandidate, RadarSource } from '@/generated/prisma/client';
import type { CandidateType, CandidateStatus } from '@/generated/prisma/enums';

// ==================== 类型 ====================

type CandidateWithSource = RadarCandidate & { source: RadarSource };

// ==================== 页面组件 ====================

export default function RadarCandidatesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithSource[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<RadarStatsData | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithSource | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // 筛选条件
  const [filters, setFilters] = useState({
    candidateType: '' as CandidateType | '',
    status: '' as CandidateStatus | '',
    qualifyTier: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [result, statsData] = await Promise.all([
        getCandidatesV2({
          candidateType: filters.candidateType || undefined,
          status: filters.status || undefined,
          qualifyTier: filters.qualifyTier || undefined,
          search: filters.search || undefined,
          limit: 100,
        }),
        getRadarStatsV2(),
      ]);
      setCandidates(result.candidates);
      setTotal(result.total);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 合格化
  const handleQualify = async (candidateId: string, tier: 'A' | 'B' | 'C' | 'excluded') => {
    try {
      await qualifyCandidateV2(candidateId, tier);
      loadData();
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
      loadData();
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
      loadData();
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
      NEW: { label: '新发现', color: 'bg-blue-50 text-blue-600' },
      REVIEWING: { label: '审核中', color: 'bg-amber-50 text-amber-600' },
      QUALIFIED: { label: '已合格', color: 'bg-emerald-50 text-emerald-600' },
      IMPORTED: { label: '已导入', color: 'bg-purple-50 text-purple-600' },
      EXCLUDED: { label: '已排除', color: 'bg-red-50 text-red-600' },
      EXPIRED: { label: '已过期', color: 'bg-slate-50 text-slate-600' },
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
        <Loader2 className="w-8 h-8 text-[#C7A56A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">候选池</h1>
          <p className="text-sm text-slate-500 mt-1">审核、分层并导入潜在客户</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-[#C7A56A]/10 text-[#C7A56A]' : 'text-slate-400 hover:text-[#C7A56A]'}`}
          >
            <Filter size={18} />
          </button>
          <button 
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-[#C7A56A] transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-6 px-4 py-3 bg-[#F7F3EA] rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">总计</span>
            <span className="font-bold text-[#0B1B2B]">{total}</span>
          </div>
          <div className="w-px h-4 bg-[#E7E0D3]" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs text-slate-500">待处理</span>
            <span className="font-medium text-[#0B1B2B]">{stats.newCandidates}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-500">已合格</span>
            <span className="font-medium text-[#0B1B2B]">{stats.qualifiedCandidates}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-xs text-slate-500">已导入</span>
            <span className="font-medium text-[#0B1B2B]">{stats.importedCandidates}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#FFFCF6] rounded-xl border border-[#E7E0D3] p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">类型</label>
              <select
                value={filters.candidateType}
                onChange={(e) => setFilters({ ...filters, candidateType: e.target.value as CandidateType | '' })}
                className="w-full px-3 py-2 border border-[#E7E0D3] rounded-lg text-sm focus:outline-none focus:border-[#C7A56A]"
              >
                <option value="">全部</option>
                <option value="COMPANY">公司</option>
                <option value="OPPORTUNITY">机会/招标</option>
                <option value="CONTACT">联系人</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as CandidateStatus | '' })}
                className="w-full px-3 py-2 border border-[#E7E0D3] rounded-lg text-sm focus:outline-none focus:border-[#C7A56A]"
              >
                <option value="">全部</option>
                <option value="NEW">新发现</option>
                <option value="QUALIFIED">已合格</option>
                <option value="IMPORTED">已导入</option>
                <option value="EXCLUDED">已排除</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">分层</label>
              <select
                value={filters.qualifyTier}
                onChange={(e) => setFilters({ ...filters, qualifyTier: e.target.value })}
                className="w-full px-3 py-2 border border-[#E7E0D3] rounded-lg text-sm focus:outline-none focus:border-[#C7A56A]"
              >
                <option value="">全部</option>
                <option value="A">A 级</option>
                <option value="B">B 级</option>
                <option value="C">C 级</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="搜索名称..."
                  className="w-full pl-9 pr-3 py-2 border border-[#E7E0D3] rounded-lg text-sm focus:outline-none focus:border-[#C7A56A]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0B1B2B] rounded-xl">
          <span className="text-[#C7A56A] text-sm">已选择 {selectedIds.size} 项</span>
          <div className="flex-1" />
          <button
            onClick={() => handleBatchQualify('A')}
            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30"
          >
            A 级
          </button>
          <button
            onClick={() => handleBatchQualify('B')}
            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30"
          >
            B 级
          </button>
          <button
            onClick={() => handleBatchQualify('C')}
            className="px-3 py-1.5 bg-slate-500/20 text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-500/30"
          >
            C 级
          </button>
          <button
            onClick={() => handleBatchQualify('excluded')}
            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30"
          >
            排除
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-slate-400 hover:text-white"
          >
            取消
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Candidates List */}
        <div className="col-span-2 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === candidates.length && candidates.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-[#C7A56A] focus:ring-[#C7A56A]"
              />
              <h3 className="font-bold text-[#0B1B2B]">候选列表</h3>
            </div>
            <span className="text-xs text-slate-400">{candidates.length} / {total} 条</span>
          </div>
          
          {candidates.length === 0 ? (
            <div className="text-center py-16">
              <Search size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无候选数据</p>
              <p className="text-xs text-slate-400 mt-2">前往「渠道地图」启动发现任务</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {candidates.map((candidate) => {
                const statusInfo = getStatusLabel(candidate.status);
                const TypeIcon = getTypeIcon(candidate.candidateType);
                const isSelected = selectedCandidate?.id === candidate.id;
                const isChecked = selectedIds.has(candidate.id);
                
                return (
                  <div 
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(isSelected ? null : candidate)}
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#C7A56A] bg-[#C7A56A]/5' 
                        : 'border-[#E7E0D3] hover:border-[#C7A56A]/50 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(candidate.id);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[#C7A56A] focus:ring-[#C7A56A]"
                    />
                    
                    <div className="w-10 h-10 bg-[#F7F3EA] rounded-xl flex items-center justify-center shrink-0">
                      <TypeIcon size={18} className="text-[#C7A56A]" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-[#0B1B2B] truncate">
                          {candidate.displayName}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {candidate.qualifyTier && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            candidate.qualifyTier === 'A' ? 'bg-emerald-100 text-emerald-700' :
                            candidate.qualifyTier === 'B' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {candidate.qualifyTier} 级
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Globe size={10} />
                          {candidate.source.name}
                        </span>
                        {candidate.buyerCountry && (
                          <span>{candidate.buyerCountry}</span>
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
                            {candidate.estimatedValue.toLocaleString()} {candidate.currency}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="col-span-1 space-y-4">
          {selectedCandidate ? (
            <>
              {/* Basic Info */}
              <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/80 rounded-xl flex items-center justify-center">
                    {selectedCandidate.candidateType === 'OPPORTUNITY' ? (
                      <FileText size={20} className="text-[#0B1B2B]" />
                    ) : (
                      <Building2 size={20} className="text-[#0B1B2B]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#0B1B2B] truncate">{selectedCandidate.displayName}</h3>
                    <p className="text-xs text-slate-500">{selectedCandidate.source.name}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="space-y-2 text-sm">
                  {selectedCandidate.buyerName && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 size={14} className="text-slate-400" />
                      <span>采购方: {selectedCandidate.buyerName}</span>
                    </div>
                  )}
                  {(selectedCandidate.buyerCountry || selectedCandidate.country) && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe size={14} className="text-slate-400" />
                      <span>{selectedCandidate.buyerCountry || selectedCandidate.country}</span>
                    </div>
                  )}
                  {selectedCandidate.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      <span>{selectedCandidate.phone}</span>
                    </div>
                  )}
                  {selectedCandidate.email && (
                    <a href={`mailto:${selectedCandidate.email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#C7A56A]">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{selectedCandidate.email}</span>
                    </a>
                  )}
                  {selectedCandidate.deadline && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Calendar size={14} />
                      <span>截止: {new Date(selectedCandidate.deadline).toLocaleDateString('zh-CN')}</span>
                    </div>
                  )}
                  {selectedCandidate.estimatedValue && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <DollarSign size={14} />
                      <span>预估: {selectedCandidate.estimatedValue.toLocaleString()} {selectedCandidate.currency}</span>
                    </div>
                  )}
                </div>

                {/* Source Link */}
                <div className="mt-4 pt-4 border-t border-[#E7E0D3]">
                  <a 
                    href={selectedCandidate.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#C7A56A] hover:underline"
                  >
                    <ExternalLink size={12} />
                    查看原文
                  </a>
                </div>
              </div>

              {/* Description */}
              {selectedCandidate.description && (
                <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                  <h4 className="font-bold text-[#0B1B2B] text-sm mb-2">描述</h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-6">
                    {selectedCandidate.description}
                  </p>
                </div>
              )}

              {/* Match Explain */}
              {selectedCandidate.matchExplain && (
                <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                  <h4 className="font-bold text-[#0B1B2B] text-sm mb-2 flex items-center gap-2">
                    <Star size={14} className="text-amber-500" />
                    匹配来源
                  </h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    {Boolean((selectedCandidate.matchExplain as Record<string, unknown>)?.channel) && (
                      <p>渠道: {String((selectedCandidate.matchExplain as Record<string, unknown>).channel)}</p>
                    )}
                    {Boolean((selectedCandidate.matchExplain as Record<string, unknown>)?.query) && (
                      <p>查询: {String((selectedCandidate.matchExplain as Record<string, unknown>).query)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                <h4 className="font-bold text-[#0B1B2B] text-sm mb-3">操作</h4>
                
                {/* Qualify */}
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-2">合格化分层</p>
                  <div className="flex gap-2">
                    {(['A', 'B', 'C'] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => handleQualify(selectedCandidate.id, tier)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedCandidate.qualifyTier === tier
                            ? tier === 'A' ? 'bg-emerald-500 text-white' :
                              tier === 'B' ? 'bg-amber-500 text-white' :
                              'bg-slate-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tier} 级
                      </button>
                    ))}
                    <button
                      onClick={() => handleQualify(selectedCandidate.id, 'excluded')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        selectedCandidate.status === 'EXCLUDED'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600'
                      }`}
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Import */}
                {selectedCandidate.status !== 'IMPORTED' && selectedCandidate.status !== 'EXCLUDED' && (
                  <button
                    onClick={() => handleImport(selectedCandidate)}
                    className="w-full py-2.5 bg-[#0B1B2B] text-[#C7A56A] rounded-lg text-sm font-medium hover:bg-[#10263B] flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    导入到线索库
                  </button>
                )}
                
                {selectedCandidate.status === 'IMPORTED' && (
                  <div className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm">
                    <CheckCircle2 size={14} />
                    已导入
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-8 text-center">
              <Search size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">选择候选查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
