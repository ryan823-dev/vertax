"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  Target,
  FileText,
  BookOpen,
  HelpCircle,
  BarChart3,
  Layers,
  CheckCircle2,
  ArrowLeft,
  Square,
  CheckSquare,
  Zap,
  FileEdit,
  ArrowRight,
} from 'lucide-react';
import {
  getLatestTopicCluster,
  syncMarketingFromKnowledge,
} from '@/actions/sync';
import {
  createBriefsFromTopicCluster,
  type ContentMapItem,
  type BatchBriefResult,
} from '@/actions/briefs';
import { getPersonasBySegment } from '@/actions/personas';
import { toast } from 'sonner';

// Content type badge colors
const CONTENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  BuyingGuide: { bg: 'bg-blue-50', text: 'text-blue-600' },
  Whitepaper: { bg: 'bg-purple-50', text: 'text-purple-600' },
  FAQ: { bg: 'bg-amber-50', text: 'text-amber-600' },
  QnA: { bg: 'bg-teal-50', text: 'text-teal-600' },
  KnowledgeBase: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Comparison: { bg: 'bg-rose-50', text: 'text-rose-600' },
  UseCasePage: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
};

// Funnel badge colors
const FUNNEL_COLORS: Record<string, { bg: string; text: string }> = {
  TOFU: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  MOFU: { bg: 'bg-amber-100', text: 'text-amber-700' },
  BOFU: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

interface TopicClusterContent {
  topicCluster: {
    name: string;
    clusters: Array<{
      pillar: string;
      intent: string;
      contentMap: Array<{
        type: string;
        title: string;
        briefGoal: string;
        funnel: string;
        intent: string;
        mustUseEvidenceIds: string[];
      }>;
      requiredEvidenceIds: string[];
    }>;
  };
  openQuestions?: string[];
  confidence?: number;
}

interface VersionData {
  id: string;
  entityId: string;
  version: number;
  status: string;
  content: TopicClusterContent;
  meta: Record<string, unknown>;
  createdAt: Date;
  createdBy: string | null;
}

interface PersonaItem {
  id: string;
  name: string;
  title: string;
}

// Selection key format: `${clusterIndex}-${itemIndex}`
type SelectionKey = string;

export default function MarketingStrategyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<VersionData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set([0]));
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<SelectionKey>>(new Set());
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  
  // Batch creation state
  const [isCreating, setIsCreating] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchBriefResult | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [latest, personasData] = await Promise.all([
        getLatestTopicCluster(),
        getPersonasBySegment(),
      ]);
      setCurrentVersion(latest as VersionData | null);
      setPersonas(personasData.map(p => ({ id: p.id, name: p.name, title: p.title })));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Regenerate TopicCluster
  const handleRegenerate = async () => {
    setIsSyncing(true);
    try {
      const result = await syncMarketingFromKnowledge();
      if (result.success) {
        toast.success('TopicCluster 已更新');
        loadData();
      } else {
        toast.error('同步失败', { description: result.error });
      }
    } catch (err) {
      toast.error('同步失败', { description: err instanceof Error ? err.message : '未知错误' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle cluster expansion
  const toggleCluster = (idx: number) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Toggle item selection
  const toggleItemSelection = (clusterIdx: number, itemIdx: number) => {
    const key: SelectionKey = `${clusterIdx}-${itemIdx}`;
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all items in a cluster
  const toggleSelectAllInCluster = (clusterIdx: number) => {
    const cluster = topicCluster?.clusters?.[clusterIdx];
    if (!cluster?.contentMap) return;
    
    const clusterKeys = cluster.contentMap.map((_, itemIdx) => `${clusterIdx}-${itemIdx}`);
    const allSelected = clusterKeys.every(k => selectedItems.has(k));
    
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (allSelected) {
        clusterKeys.forEach(k => next.delete(k));
      } else {
        clusterKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Select all items
  const selectAll = () => {
    if (!topicCluster?.clusters) return;
    const allKeys: SelectionKey[] = [];
    topicCluster.clusters.forEach((cluster, clusterIdx) => {
      cluster.contentMap?.forEach((_, itemIdx) => {
        allKeys.push(`${clusterIdx}-${itemIdx}`);
      });
    });
    
    const allSelected = allKeys.every(k => selectedItems.has(k));
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allKeys));
    }
  };

  // Get selected items data
  const getSelectedItemsData = (): ContentMapItem[] => {
    if (!topicCluster?.clusters) return [];
    
    const items: ContentMapItem[] = [];
    selectedItems.forEach(key => {
      const [clusterIdxStr, itemIdxStr] = key.split('-');
      const clusterIdx = parseInt(clusterIdxStr);
      const itemIdx = parseInt(itemIdxStr);
      
      const cluster = topicCluster.clusters[clusterIdx];
      const item = cluster?.contentMap?.[itemIdx];
      
      if (item) {
        items.push({
          ...item,
          pillar: cluster.pillar,
          clusterIndex: clusterIdx,
          itemIndex: itemIdx,
        });
      }
    });
    
    return items;
  };

  // Batch create briefs
  const handleBatchCreate = async () => {
    const items = getSelectedItemsData();
    if (items.length === 0) {
      toast.error('请先选择内容项');
      return;
    }
    
    setIsCreating(true);
    setBatchResult(null);
    
    try {
      const result = await createBriefsFromTopicCluster(
        items,
        selectedPersonaId || undefined
      );
      
      setBatchResult(result);
      
      if (result.success) {
        toast.success(`成功创建 ${result.created} 个 Brief`);
        setSelectedItems(new Set());
      } else {
        toast.warning(`创建完成，${result.created} 成功，${result.errors.length} 失败`);
      }
    } catch (err) {
      toast.error('批量创建失败', { description: err instanceof Error ? err.message : '未知错误' });
    } finally {
      setIsCreating(false);
    }
  };

  const topicCluster = currentVersion?.content?.topicCluster;
  const totalItems = topicCluster?.clusters?.reduce((acc, c) => acc + (c.contentMap?.length || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - 指令台 深蓝舞台风格 */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
        }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/marketing"
              className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors rounded-lg hover:bg-white/10"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">内容策略</h1>
              <p className="text-sm text-slate-400 mt-1">
                从 TopicCluster 批量生成 ContentBrief，实现内容工业化生产
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRegenerate}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
            >
              {isSyncing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              重新生成
            </button>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
              title="刷新数据"
            >
              <RefreshCw size={18} />
            </button>
          </div>
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

      {/* No Data State */}
      {!topicCluster ? (
        <div className="rounded-2xl p-12 text-center" style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
        }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
            <Target size={28} className="text-[#D4AF37]" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-2">尚未生成主题集群</h3>
          <p className="text-sm text-slate-400 mb-6">
            请先在知识引擎完善企业认知，然后点击「同步到增长系统」自动生成
          </p>
          <Link
            href="/customer/knowledge/company"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
          >
            前往知识引擎
            <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {/* Batch Action Bar */}
          <div className="bg-gradient-to-r from-[#0B1B2B] to-[#10263B] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
                  <Zap size={24} className="text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">批量生成 Brief</h2>
                  <p className="text-sm text-slate-400">
                    已选择 <span className="text-[#D4AF37] font-bold">{selectedItems.size}</span> / {totalItems} 个内容项
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Select All */}
                <button
                  onClick={selectAll}
                  className="px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  {selectedItems.size === totalItems ? (
                    <CheckSquare size={16} className="text-[#D4AF37]" />
                  ) : (
                    <Square size={16} />
                  )}
                  {selectedItems.size === totalItems ? '取消全选' : '全选'}
                </button>
                
                {/* Persona Selector */}
                <select
                  value={selectedPersonaId}
                  onChange={e => setSelectedPersonaId(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="" className="text-slate-900">不指定 Persona</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id} className="text-slate-900">
                      {p.name} ({p.title})
                    </option>
                  ))}
                </select>
                
                {/* Create Button */}
                <button
                  onClick={handleBatchCreate}
                  disabled={selectedItems.size === 0 || isCreating}
                  className="px-4 py-2 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-sm font-bold hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileEdit size={16} />
                  )}
                  生成 {selectedItems.size} 个 Brief
                </button>
              </div>
            </div>
            
            {/* Batch Result */}
            {batchResult && (
              <div className={`mt-4 p-3 rounded-lg ${batchResult.success ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                <div className="flex items-center gap-2 text-sm">
                  {batchResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-400" />
                  )}
                  <span className="text-white">
                    成功创建 <span className="font-bold text-[#D4AF37]">{batchResult.created}</span> 个 Brief
                    {batchResult.errors.length > 0 && (
                      <span className="text-amber-300">，{batchResult.errors.length} 个失败</span>
                    )}
                  </span>
                  <Link
                    href="/customer/marketing/briefs"
                    className="ml-auto text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    查看 Briefs
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {batchResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-amber-200/70">
                    {batchResult.errors.slice(0, 3).map((e, i) => (
                      <div key={i}>• {e}</div>
                    ))}
                    {batchResult.errors.length > 3 && (
                      <div>...还有 {batchResult.errors.length - 3} 个错误</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clusters */}
          <div className="space-y-4">
            {topicCluster.clusters?.map((cluster, clusterIdx) => {
              const isExpanded = expandedClusters.has(clusterIdx);
              const clusterItemCount = cluster.contentMap?.length || 0;
              const selectedInCluster = cluster.contentMap?.filter((_, itemIdx) =>
                selectedItems.has(`${clusterIdx}-${itemIdx}`)
              ).length || 0;
              const allSelectedInCluster = clusterItemCount > 0 && selectedInCluster === clusterItemCount;
              
              return (
                <div
                  key={clusterIdx}
                  className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] overflow-hidden"
                >
                  {/* Cluster Header */}
                  <div className="flex items-center p-5 hover:bg-[#F0EBD8] transition-colors">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelectAllInCluster(clusterIdx)}
                      className="mr-4 p-1 text-slate-400 hover:text-[#D4AF37] transition-colors"
                    >
                      {allSelectedInCluster ? (
                        <CheckSquare size={20} className="text-[#D4AF37]" />
                      ) : selectedInCluster > 0 ? (
                        <div className="relative">
                          <Square size={20} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-[#D4AF37] rounded-sm" />
                          </div>
                        </div>
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                    
                    <button
                      onClick={() => toggleCluster(clusterIdx)}
                      className="flex-1 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/70 rounded-xl flex items-center justify-center">
                          <Layers size={18} className="text-[#0B1B2B]" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-[#0B1B2B]">{cluster.pillar}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cluster.intent} ·
                            <span className={selectedInCluster > 0 ? 'text-[#D4AF37]' : ''}>
                              {' '}{selectedInCluster}/{clusterItemCount} 已选
                            </span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Cluster Content Map */}
                  {isExpanded && cluster.contentMap && (
                    <div className="border-t border-[#E8E0D0] p-5">
                      <div className="grid gap-3">
                        {cluster.contentMap.map((item, itemIdx) => {
                          const isSelected = selectedItems.has(`${clusterIdx}-${itemIdx}`);
                          const typeColor = CONTENT_TYPE_COLORS[item.type] || { bg: 'bg-[#F7F3E8]', text: 'text-slate-600' };
                          const funnelColor = FUNNEL_COLORS[item.funnel] || { bg: 'bg-slate-100', text: 'text-slate-700' };

                          return (
                            <div
                              key={itemIdx}
                              onClick={() => toggleItemSelection(clusterIdx, itemIdx)}
                              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]'
                                  : 'bg-[#FFFCF7] border-[#E8E0D0] hover:border-[#D4AF37]/30'
                              }`}
                            >
                              {/* Checkbox */}
                              <div className="shrink-0 pt-0.5">
                                {isSelected ? (
                                  <CheckSquare size={18} className="text-[#D4AF37]" />
                                ) : (
                                  <Square size={18} className="text-slate-300" />
                                )}
                              </div>
                              
                              {/* Icon */}
                              <div className="shrink-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColor.bg}`}>
                                  {item.type === 'BuyingGuide' && <BookOpen size={14} className={typeColor.text} />}
                                  {item.type === 'Whitepaper' && <FileText size={14} className={typeColor.text} />}
                                  {item.type === 'FAQ' && <HelpCircle size={14} className={typeColor.text} />}
                                  {item.type === 'QnA' && <HelpCircle size={14} className={typeColor.text} />}
                                  {item.type === 'KnowledgeBase' && <Layers size={14} className={typeColor.text} />}
                                  {item.type === 'Comparison' && <BarChart3 size={14} className={typeColor.text} />}
                                  {item.type === 'UseCasePage' && <Target size={14} className={typeColor.text} />}
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${typeColor.bg} ${typeColor.text}`}>
                                    {item.type}
                                  </span>
                                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${funnelColor.bg} ${funnelColor.text}`}>
                                    {item.funnel}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                    {item.intent}
                                  </span>
                                </div>
                                <h4 className="font-medium text-[#0B1B2B] text-sm">{item.title}</h4>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.briefGoal}</p>
                                {item.mustUseEvidenceIds?.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                    <span className="text-[10px] text-slate-400">
                                      引用 {item.mustUseEvidenceIds.length} 条证据
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Required Evidence */}
                      {cluster.requiredEvidenceIds?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            此支柱需要 {cluster.requiredEvidenceIds.length} 条证据支撑
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
