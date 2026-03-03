"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Search, RefreshCw, ShieldCheck, Sparkles,
  Pencil, Trash2, ExternalLink, Filter,
} from 'lucide-react';
import {
  getEvidences, createEvidence, updateEvidence,
  deleteEvidence, batchGenerateEvidences,
} from '@/actions/evidence';
import { getKnowledgeAssets } from '@/actions/assets';
import type { EvidenceData, EvidenceTypeValue, CreateEvidenceInput } from '@/types/knowledge';
import type { AssetWithProcessingStatus } from '@/types/assets';

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
  const [isLoading, setIsLoading] = useState(true);
  const [evidences, setEvidences] = useState<EvidenceData[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EvidenceTypeValue[]>([]);
  const [page, setPage] = useState(1);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEvidenceInput>({
    title: '', content: '', type: 'claim',
  });
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

  useEffect(() => { loadEvidences(); }, [loadEvidences]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.content) return;
    setIsCreating(true);
    try {
      await createEvidence(createForm);
      setShowCreate(false);
      setCreateForm({ title: '', content: '', type: 'claim' });
      loadEvidences();
    } catch { /* silent */ } finally { setIsCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvidence(id);
      loadEvidences();
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
      const result = await batchGenerateEvidences(selectedAssetId);
      setBatchResult(result);
      loadEvidences();
    } catch { /* silent */ } finally { setIsBatchGenerating(false); }
  };

  const toggleTypeFilter = (type: EvidenceTypeValue) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">证据库</h1>
          <p className="text-sm text-slate-500 mt-1">从素材中提取营销证据，用于支撑企业认知和内容生成</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadEvidences()} className="p-2 text-slate-400 hover:text-[#C7A56A] rounded-lg hover:bg-[#F7F3EA] transition-colors">
            <RefreshCw size={18} />
          </button>
          <button onClick={openBatchDialog} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0B1B2B] border border-[#E7E0D3] rounded-xl hover:bg-[#F7F3EA] transition-colors">
            <Sparkles size={16} />
            AI 批量生成
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-[#C7A56A] rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors">
            <Plus size={16} />
            新建证据
          </button>
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
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E7E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C7A56A]/30 focus:border-[#C7A56A] text-[#0B1B2B]"
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
                  : 'border-[#E7E0D3] text-slate-400 hover:text-slate-600'
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
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-[#C7A56A] animate-spin" /></div>
      ) : evidences.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3]">
          <ShieldCheck size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">暂无证据</p>
          <p className="text-xs text-slate-400 mt-1">从已处理的素材中提取证据，或手动创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidences.map((ev) => (
            <div key={ev.id} className="p-4 border border-[#E7E0D3] rounded-xl bg-[#FFFCF6] hover:border-[#C7A56A]/40 transition-all">
              {editingId === ev.id ? (
                <div className="space-y-3">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" />
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="w-full px-3 py-1.5 text-xs border border-[#E7E0D3] rounded-lg bg-white text-[#0B1B2B]" />
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(ev.id)} className="px-3 py-1 text-xs bg-[#0B1B2B] text-[#C7A56A] rounded-lg">保存</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs border border-[#E7E0D3] rounded-lg text-slate-500">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <EvidenceTypeTag type={ev.type} />
                    <h4 className="text-sm font-medium text-[#0B1B2B] truncate flex-1">{ev.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">{ev.content}</p>
                  {ev.assetName && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
                      <ExternalLink size={10} />
                      <span>来源：{ev.assetName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(ev.id); setEditTitle(ev.title); setEditContent(ev.content); }} className="p-1.5 text-slate-400 hover:text-[#C7A56A] rounded-lg hover:bg-[#F7F3EA] transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                    {ev.tags.length > 0 && (
                      <div className="flex gap-1 ml-auto">
                        {ev.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 text-[9px] bg-[#F7F3EA] text-slate-500 rounded">{t}</span>
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

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] shadow-xl w-[480px] p-6" onClick={(e) => e.stopPropagation()}>
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
              <button onClick={handleCreate} disabled={isCreating || !createForm.title || !createForm.content} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50">
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Generate Dialog */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowBatchDialog(false)}>
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] shadow-xl w-[480px] p-6" onClick={(e) => e.stopPropagation()}>
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
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedAssetId === a.id ? 'border-[#C7A56A] bg-[#C7A56A]/5' : 'border-[#E7E0D3] hover:border-[#C7A56A]/30'}`}>
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
                <button onClick={handleBatchGenerate} disabled={!selectedAssetId || isBatchGenerating} className="px-4 py-2 text-sm bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium disabled:opacity-50">
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
