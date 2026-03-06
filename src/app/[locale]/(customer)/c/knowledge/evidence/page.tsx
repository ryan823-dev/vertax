"use client";

/**
 * 证据库页面 - 从素材中提取营销证据
 * 
 * 重构重点：
 * - 集成 EngineHeader + Stepper
 * - 输入来源提示
 * - 明确前置条件
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Loader2, Search, RefreshCw, ShieldCheck, Sparkles,
  Pencil, Trash2, ExternalLink, Filter, FileStack, AlertCircle,
} from 'lucide-react';
import {
  getEvidences, createEvidence, updateEvidence,
  deleteEvidence, batchGenerateEvidences,
} from '@/actions/evidence';
import { getKnowledgeAssets } from '@/actions/assets';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
import { EngineHeader } from '@/components/knowledge/engine-header';
import type { EvidenceData, EvidenceTypeValue, CreateEvidenceInput } from '@/types/knowledge';
import type { AssetWithProcessingStatus } from '@/types/assets';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

const TYPE_CONFIG: Record<EvidenceTypeValue, { label: string; color: string; bg: string }> = {
  claim: { label: '产品主张', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  statistic: { label: '数据统计', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  testimonial: { label: '客户证言', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  case_study: { label: '案例研究', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  certification: { label: '资质认证', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
};

function EvidenceTypeTag({ type }: { type: EvidenceTypeValue }) {
  const c = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
}

export default function EvidencePage() {
  // Pipeline status
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [evidences, setEvidences] = useState<EvidenceData[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EvidenceTypeValue[]>([]);
  const [page, setPage] = useState(1);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEvidenceInput>({ title: '', content: '', type: 'claim' });
  const [isCreating, setIsCreating] = useState(false);

  // Batch generate
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [readyAssets, setReadyAssets] = useState<AssetWithProcessingStatus[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchResult, setBatchResult] = useState<{ generated: number; errors: number } | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Load pipeline status
  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      // silent
    }
  }, []);

  const loadEvidences = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEvidences(
        { search: search || undefined, type: typeFilter.length > 0 ? typeFilter : undefined },
        { page, pageSize: 20 }
      );
      setEvidences(result.items);
      setTotal(result.total);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [search, typeFilter, page]);

  useEffect(() => { 
    loadPipelineStatus();
    loadEvidences(); 
  }, [loadPipelineStatus, loadEvidences]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.content) return;
    setIsCreating(true);
    try {
      await createEvidence(createForm);
      setShowCreate(false);
      setCreateForm({ title: '', content: '', type: 'claim' });
      loadEvidences();
      loadPipelineStatus();
    } catch { /* silent */ } finally { setIsCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvidence(id);
      loadEvidences();
      loadPipelineStatus();
    } catch { /* silent */ }
  };

  const handleEdit = async (id: string) => {
    try {
      await updateEvidence(id, { title: editTitle, content: editContent });
      setEditingId(null);
      loadEvidences();
    } catch { /* silent */ }
  };

  const openBatchDialog = async () => {
    setShowBatchDialog(true);
    setBatchResult(null);
    try {
      const result = await getKnowledgeAssets({ processingStatus: 'ready' } as Parameters<typeof getKnowledgeAssets>[0]);
      setReadyAssets(result.items);
    } catch { /* silent */ }
  };

  const handleBatchGenerate = async () => {
    if (!selectedAssetId) return;
    setIsBatchGenerating(true);
    try {
      // Use REST API instead of Server Action to avoid 10s timeout
      const res = await fetch('/api/evidence/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: selectedAssetId }),
      });
      const result = await res.json() as { generated?: number; errors?: number; error?: string; errorDetails?: string[] };
      if (!res.ok) throw new Error(result.error || '生成失败');
      if (result.errorDetails?.length) console.error('Evidence errors:', result.errorDetails);
      setBatchResult({ generated: result.generated ?? 0, errors: result.errors ?? 0 });
      loadEvidences();
      loadPipelineStatus();
    } catch (err) {
      setBatchResult({ generated: 0, errors: 1 });
      console.error('batch generate error:', err);
    } finally { setIsBatchGenerating(false); }
  };

  const toggleTypeFilter = (type: EvidenceTypeValue) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  // Check prerequisites
  const canGenerate = pipelineStatus && pipelineStatus.counts.assetsParsed >= 1;

  // Primary CTA config
  const getPrimaryCTA = () => {
    if (!canGenerate) {
      return {
        label: '生成证据',
        onClick: openBatchDialog,
        disabled: true,
      };
    }
    return {
      label: '生成证据',
      onClick: openBatchDialog,
      loading: isBatchGenerating,
    };
  };

  return (
    <div className="space-y-0">
      {/* Engine Header with Stepper */}
      {pipelineStatus && (
        <EngineHeader
          title="证据库"
          description="从已解析素材中提取营销证据，支撑企业认知和内容生成"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
          primaryAction={getPrimaryCTA()}
        />
      )}

      <div className="p-5 space-y-5">
        {/* Input Source Hint */}
        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileStack size={16} className="text-slate-400" />
                <span className="text-xs text-slate-500">输入来源：</span>
                <span className="text-xs font-medium text-[#0B1220]">
                  已解析素材 {pipelineStatus?.counts.assetsParsed || 0} 个
                </span>
              </div>
              {!canGenerate && (
                <div className="flex items-center gap-2 text-amber-600 text-xs">
                  <AlertCircle size={14} />
                  <span>请先完成资料解析</span>
                  <Link href="/c/knowledge/assets" className="text-[#D4AF37] hover:underline">去资料库</Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadEvidences()} className="p-2 text-slate-400 hover:text-[#D4AF37] rounded-lg hover:bg-[#F0EBD8] transition-colors">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-[#E8E0D0] rounded-lg hover:bg-[#F0EBD8] transition-colors">
                <Plus size={14} />
                手动添加
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索证据..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FFFCF7] border border-[#E8E0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] text-[#0B1220]"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-slate-400 mr-1" />
            {(Object.keys(TYPE_CONFIG) as EvidenceTypeValue[]).map((type) => (
              <button
                key={type}
                onClick={() => toggleTypeFilter(type)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors ${
                  typeFilter.includes(type)
                    ? TYPE_CONFIG[type].bg + ' ' + TYPE_CONFIG[type].color
                    : 'border-[#E8E0D0] text-slate-400 hover:text-slate-600'
                }`}
              >
                {TYPE_CONFIG[type].label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 ml-auto">{total} 条证据</span>
        </div>

        {/* Evidence Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-[#D4AF37] animate-spin" /></div>
        ) : evidences.length === 0 ? (
          <div className="text-center py-12 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0]">
            <ShieldCheck size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-2">暂无证据</p>
            {canGenerate ? (
              <>
                <p className="text-xs text-slate-400 mb-4">从已处理的素材中提取证据</p>
                <button
                  onClick={openBatchDialog}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors shadow-[0_4px_16px_-2px_rgba(212,175,55,0.35)]"
                >
                  <Sparkles size={16} />
                  生成证据
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-4">需要先完成资料解析</p>
                <Link
                  href="/c/knowledge/assets"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors shadow-[0_4px_16px_-2px_rgba(212,175,55,0.35)]"
                >
                  <FileStack size={16} />
                  去资料库上传
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidences.map((ev) => (
              <div key={ev.id} className="p-4 border border-[#E8E0D0] rounded-2xl bg-[#F7F3E8] hover:border-[#D4AF37]/40 transition-all">
                {editingId === ev.id ? (
                  <div className="space-y-3">
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-[#E8E0D0] rounded-lg bg-[#FFFCF7] text-[#0B1220]" />
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="w-full px-3 py-1.5 text-xs border border-[#E8E0D0] rounded-lg bg-[#FFFCF7] text-[#0B1220]" />
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(ev.id)} className="px-3 py-1 text-xs bg-[#D4AF37] text-[#0B1220] rounded-lg">保存</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs border border-[#E8E0D0] rounded-lg text-slate-500">取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <EvidenceTypeTag type={ev.type} />
                      <h4 className="text-sm font-medium text-[#0B1220] truncate flex-1">{ev.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">{ev.content}</p>
                    {ev.assetName && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
                        <ExternalLink size={10} />
                        <span>来源：{ev.assetName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingId(ev.id); setEditTitle(ev.title); setEditContent(ev.content); }} className="p-1.5 text-slate-400 hover:text-[#D4AF37] rounded-lg hover:bg-[#F0EBD8] transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                      {ev.tags.length > 0 && (
                        <div className="flex gap-1 ml-auto">
                          {ev.tags.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 text-[9px] bg-[#F0EBD8] text-slate-500 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xl w-[480px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-4">新建证据</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">标题</label>
                <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="证据标题" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">类型</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_CONFIG) as EvidenceTypeValue[]).map((type) => (
                    <button key={type} onClick={() => setCreateForm({ ...createForm, type })}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${createForm.type === type ? TYPE_CONFIG[type].bg + ' ' + TYPE_CONFIG[type].color + ' font-medium' : 'border-[#E7E0D3] text-slate-400'}`}>
                      {TYPE_CONFIG[type].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">内容</label>
                <textarea value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} rows={4} className="w-full px-3 py-2 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" placeholder="证据内容..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[#E7E0D3] rounded-xl text-slate-500 hover:bg-[#F7F3EA] transition-colors">取消</button>
              <button onClick={handleCreate} disabled={isCreating || !createForm.title || !createForm.content} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#D4AF37] rounded-xl font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50">
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Generate Dialog */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowBatchDialog(false)}>
          <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xl w-[480px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">AI 批量生成证据</h3>
            <p className="text-xs text-slate-500 mb-4">选择一个已处理的素材，AI 将从每个文本片段中提取证据</p>
            {batchResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                <p className="text-sm text-emerald-700">生成完成：{batchResult.generated} 条证据{batchResult.errors > 0 ? `，${batchResult.errors} 条失败` : ''}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                {readyAssets.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">没有已处理的素材</p>
                ) : readyAssets.map((a) => (
                  <button key={a.id} onClick={() => setSelectedAssetId(a.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedAssetId === a.id ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#E7E0D3] hover:border-[#D4AF37]/30'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0B1B2B] truncate">{a.originalName}</p>
                      <p className="text-[10px] text-slate-400">{a.processingMeta.chunkCount} 个片段</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBatchDialog(false)} className="px-4 py-2 text-sm border border-[#E7E0D3] rounded-xl text-slate-500">
                {batchResult ? '关闭' : '取消'}
              </button>
              {!batchResult && (
                <button onClick={handleBatchGenerate} disabled={!selectedAssetId || isBatchGenerating} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#D4AF37] rounded-xl font-medium disabled:opacity-50">
                  {isBatchGenerating ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />生成中...</span> : '开始生成'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
