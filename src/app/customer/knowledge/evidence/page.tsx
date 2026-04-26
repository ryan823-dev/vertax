"use client";

/**
 * 证据库页面 - 从素材中提取营销证据
 *
 * 视觉规范：深蓝+金色+奶油白体系
 * 交互改进：搜索防抖、删除确认、分页器、错误提示
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Loader2, Search, RefreshCw, ShieldCheck, Sparkles,
  Pencil, Trash2, ExternalLink, Filter, FileStack, AlertCircle,
  ChevronLeft, ChevronRight, X, Check,
} from 'lucide-react';
import {
  getEvidences, createEvidence, updateEvidence,
  deleteEvidence, batchGenerateEvidences,
} from '@/actions/evidence';
import { getKnowledgeAssets } from '@/actions/assets';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
import { EngineHeader, NextStepBanner } from '@/components/knowledge/engine-header';
import type { EvidenceData, EvidenceTypeValue, CreateEvidenceInput } from '@/types/knowledge';
import type { AssetWithProcessingStatus } from '@/types/assets';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

// ============================================
// 金色系 TypeTag 配色（同色系5档）
// ============================================

const TYPE_CONFIG: Record<EvidenceTypeValue, { label: string; color: string; bg: string; border: string }> = {
  claim:         { label: '产品主张', color: 'var(--ci-accent-strong)', bg: 'rgba(79,141,246,0.10)', border: 'rgba(79,141,246,0.30)' },
  statistic:     { label: '数据统计', color: '#8B6914', bg: 'rgba(184,134,11,0.08)', border: 'rgba(184,134,11,0.25)' },
  testimonial:   { label: '客户证言', color: '#A0522D', bg: 'rgba(160,82,45,0.08)',  border: 'rgba(160,82,45,0.25)' },
  case_study:    { label: '案例研究', color: '#6B7B3A', bg: 'rgba(107,123,58,0.08)', border: 'rgba(107,123,58,0.25)' },
  certification: { label: '资质认证', color: '#7B6D3A', bg: 'rgba(123,109,58,0.08)', border: 'rgba(123,109,58,0.25)' },
};

function EvidenceTypeTag({ type }: { type: EvidenceTypeValue }) {
  const c = TYPE_CONFIG[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  );
}

// ============================================
// 搜索防抖 Hook
// ============================================

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ============================================
// Toast 通知
// ============================================

type ToastType = 'success' | 'error' | 'info';

function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: 'rgba(79,141,246,0.08)', border: 'rgba(79,141,246,0.3)', color: 'var(--ci-accent-strong)' },
    error:   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#DC2626' },
    info:    { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', color: '#2563EB' },
  };
  const s = styles[type];

  return (
    <div
      className="fixed top-20 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-slide-up"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)' }}
    >
      {type === 'success' && <Check size={14} />}
      {type === 'error' && <AlertCircle size={14} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

// ============================================
// 确认弹窗
// ============================================

function ConfirmDialog({ title, message, onConfirm, onCancel, isLoading }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; isLoading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div
        className="w-[400px] rounded-xl p-6 animate-slide-up"
        style={{ background: '#0F1728', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-2">{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-xl font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            取消
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="px-4 py-2 text-sm rounded-xl font-medium transition-colors disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export default function EvidencePage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evidences, setEvidences] = useState<EvidenceData[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<EvidenceTypeValue[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

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

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      setToast({ message: '加载流水线状态失败', type: 'error' });
    }
  }, []);

  const loadEvidences = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEvidences(
        { search: debouncedSearch || undefined, type: typeFilter.length > 0 ? typeFilter : undefined },
        { page, pageSize },
      );
      setEvidences(result.items);
      setTotal(result.total);
    } catch {
      setToast({ message: '加载证据列表失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, typeFilter, page]);

  useEffect(() => { loadPipelineStatus(); }, [loadPipelineStatus]);
  useEffect(() => { loadEvidences(); }, [loadEvidences]);

  // Reset page on search/filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.content) return;
    setIsCreating(true);
    try {
      await createEvidence(createForm);
      setShowCreate(false);
      setCreateForm({ title: '', content: '', type: 'claim' });
      setToast({ message: '证据创建成功', type: 'success' });
      loadEvidences();
    } catch {
      setToast({ message: '创建失败，请重试', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteEvidence(deleteTarget.id);
      setToast({ message: `已删除「${deleteTarget.title}」`, type: 'success' });
      setDeleteTarget(null);
      loadEvidences();
    } catch {
      setToast({ message: '删除失败，请重试', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = async (id: string) => {
    try {
      await updateEvidence(id, { title: editTitle, content: editContent });
      setEditingId(null);
      setToast({ message: '更新成功', type: 'success' });
      loadEvidences();
    } catch {
      setToast({ message: '更新失败，请重试', type: 'error' });
    }
  };

  const handleBatchGenerate = async () => {
    if (!selectedAssetId) return;
    setIsBatchGenerating(true);
    try {
      const result = await batchGenerateEvidences(selectedAssetId);
      setBatchResult(result);
      setToast({ message: `AI 生成了 ${result.generated} 条证据`, type: 'success' });
      loadEvidences();
    } catch {
      setToast({ message: 'AI 批量生成失败', type: 'error' });
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const openBatchDialog = async () => {
    setShowBatchDialog(true);
    setBatchResult(null);
    setSelectedAssetId(null);
    try {
      const result = await getKnowledgeAssets({ status: 'active' });
      setReadyAssets(result.items);
    } catch {
      setToast({ message: '加载素材列表失败', type: 'error' });
    }
  };

  // Keyboard handler for edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Escape') {
      setEditingId(null);
    } else if (e.key === 'Enter' && e.metaKey) {
      handleEditSave(id);
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);

  const hasReady = pipelineStatus?.counts?.assetsParsed ?? 0;
  const stepNumber = pipelineStatus?.currentStep ?? 2;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--ci-surface-strong)' }}>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      {pipelineStatus && (
        <EngineHeader
          title="证据库"
          description="从素材中提取可引用的营销证据"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={stepNumber}
          primaryAction={{
            label: 'AI 批量提取',
            onClick: openBatchDialog,
            disabled: hasReady === 0,
            hint: hasReady === 0 ? '请先在资料库处理文件' : undefined,
          }}
        />
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* 来源提示条 */}
        {hasReady > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs animate-slide-up"
            style={{ background: 'rgba(79,141,246,0.06)', border: '1px solid rgba(79,141,246,0.15)' }}
          >
            <FileStack size={14} style={{ color: 'var(--ci-accent)' }} />
            <span style={{ color: '#8B7D3C' }}>
              已有 <strong className="font-semibold" style={{ color: 'var(--ci-accent-strong)' }}>{hasReady}</strong> 个素材可提取
            </span>
            <Link
              href="/customer/knowledge/assets"
              className="ml-auto flex items-center gap-1 font-medium transition-colors"
              style={{ color: 'var(--ci-accent)' }}
            >
              查看资料库 <ExternalLink size={11} />
            </Link>
          </div>
        )}

        {/* 工具栏 */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl animate-slide-up-delay-1"
          style={{ background: '#FFFFFF', border: '1px solid var(--ci-border)' }}
        >
          {/* 搜索框 */}
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B0A78C' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索证据标题..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none transition-all"
              style={{ background: 'var(--ci-surface-strong)', border: '1px solid var(--ci-border)', color: '#0B1B2B' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,141,246,0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ci-border)')}
            />
          </div>

          {/* 类型过滤 */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} style={{ color: '#B0A78C' }} />
            {(Object.entries(TYPE_CONFIG) as [EvidenceTypeValue, typeof TYPE_CONFIG[EvidenceTypeValue]][]).map(([key, cfg]) => {
              const isActive = typeFilter.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => setTypeFilter(isActive ? typeFilter.filter(t => t !== key) : [...typeFilter, key])}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all"
                  style={
                    isActive
                      ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                      : { background: 'transparent', color: '#94A3B8', border: '1px solid transparent' }
                  }
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* 手动新增 */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
            style={{ background: 'rgba(79,141,246,0.08)', color: 'var(--ci-accent-strong)', border: '1px solid rgba(79,141,246,0.25)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79,141,246,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(79,141,246,0.08)')}
          >
            <Plus size={13} />
            手动添加
          </button>

          {/* 刷新 */}
          <button
            onClick={loadEvidences}
            disabled={isLoading}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: '#94A3B8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ci-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 统计概览 */}
        {total > 0 && (
          <div className="flex items-center gap-2 px-1 animate-slide-up-delay-2">
            <span className="text-xs" style={{ color: '#94A3B8' }}>
              共 <strong style={{ color: '#0B1B2B' }}>{total}</strong> 条证据
            </span>
            {typeFilter.length > 0 && (
              <button onClick={() => setTypeFilter([])} className="text-[10px] px-2 py-0.5 rounded-full transition-colors" style={{ background: 'rgba(79,141,246,0.08)', color: 'var(--ci-accent-strong)' }}>
                清除筛选 ×
              </button>
            )}
          </div>
        )}

        {/* 证据列表 */}
        {isLoading && evidences.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ci-accent)' }} />
          </div>
        ) : evidences.length === 0 ? (
          /* 空态 */
          <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(79,141,246,0.08)', border: '1px solid rgba(79,141,246,0.2)', boxShadow: '0 0 24px rgba(79,141,246,0.1)' }}
            >
              <ShieldCheck size={28} style={{ color: 'var(--ci-accent)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0B1B2B' }}>证据库尚未建立</h3>
            <p className="text-sm mb-6 max-w-md" style={{ color: 'rgba(0,0,0,0.45)' }}>
              证据是 AI 生成营销内容的核心素材。上传资料后，AI 可自动提取产品主张、数据统计、客户证言等证据。
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={openBatchDialog}
                disabled={hasReady === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{
                  background: hasReady > 0 ? 'var(--ci-accent)' : 'rgba(0,0,0,0.06)',
                  color: hasReady > 0 ? '#0B1220' : 'rgba(0,0,0,0.3)',
                  boxShadow: hasReady > 0 ? '0 4px 16px -2px rgba(79,141,246,0.35)' : 'none',
                }}
              >
                <Sparkles size={15} />
                AI 批量提取
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--ci-surface-muted)', color: '#4A5568', border: '1px solid var(--ci-border)' }}
              >
                <Plus size={15} />
                手动添加
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {evidences.map((ev, idx) => (
              <div
                key={ev.id}
                className={`p-4 rounded-xl transition-all group ${idx < 4 ? `animate-slide-up-delay-${idx}` : 'animate-slide-up'}`}
                style={{ background: '#FFFFFF', border: '1px solid var(--ci-border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(79,141,246,0.4)';
                  e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(79,141,246,0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ci-border)';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = '';
                }}
              >
                {editingId === ev.id ? (
                  /* 编辑态 */
                  <div className="space-y-2" onKeyDown={(e) => handleEditKeyDown(e, ev.id)}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg outline-none"
                      style={{ background: 'var(--ci-surface-strong)', border: '1px solid rgba(79,141,246,0.3)', color: '#0B1B2B' }}
                      autoFocus
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-1.5 text-sm rounded-lg outline-none resize-none"
                      style={{ background: 'var(--ci-surface-strong)', border: '1px solid rgba(79,141,246,0.3)', color: '#0B1B2B' }}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] mr-auto" style={{ color: '#94A3B8' }}>Esc 取消 · Cmd+Enter 保存</span>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs rounded-lg" style={{ color: '#94A3B8', border: '1px solid var(--ci-border)' }}>取消</button>
                      <button onClick={() => handleEditSave(ev.id)} className="px-3 py-1 text-xs rounded-lg font-medium" style={{ background: 'rgba(79,141,246,0.1)', color: 'var(--ci-accent-strong)', border: '1px solid rgba(79,141,246,0.3)' }}>保存</button>
                    </div>
                  </div>
                ) : (
                  /* 展示态 */
                  <>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <EvidenceTypeTag type={ev.type} />
                          <h4 className="text-sm font-semibold truncate" style={{ color: '#0B1B2B' }}>{ev.title}</h4>
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: 'rgba(0,0,0,0.5)' }}>{ev.content}</p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => { setEditingId(ev.id); setEditTitle(ev.title); setEditContent(ev.content); }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#94A3B8' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ci-accent)'; e.currentTarget.style.background = 'rgba(79,141,246,0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = ''; }}
                          title="编辑"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: ev.id, title: ev.title })}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#94A3B8' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = ''; }}
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* 底部 meta */}
                    <div className="flex items-center gap-3 mt-2.5 pt-2.5" style={{ borderTop: '1px solid #EDE8DF' }}>
                      <span className="text-[10px]" style={{ color: '#B0A78C' }}>
                        {new Date(ev.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      {ev.sourceLocator && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(79,141,246,0.06)', color: '#B0A78C' }}
                        >
                          AI 提取
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 分页器 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-4 pb-2 animate-slide-up">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg transition-all disabled:opacity-30"
              style={{ color: '#94A3B8' }}
              onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.color = 'var(--ci-accent)'; }}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <span key={p} className="flex items-center">
                    {showEllipsis && <span className="px-1.5 text-[10px]" style={{ color: '#CBD5E1' }}>···</span>}
                    <button
                      onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                      style={
                        p === page
                          ? { background: 'rgba(79,141,246,0.12)', color: 'var(--ci-accent)', border: '1px solid rgba(79,141,246,0.3)', fontWeight: 700 }
                          : { color: '#94A3B8', border: '1px solid transparent' }
                      }
                    >
                      {p}
                    </button>
                  </span>
                );
              })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg transition-all disabled:opacity-30"
              style={{ color: '#94A3B8' }}
              onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.color = 'var(--ci-accent)'; }}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* 创建证据弹窗 - 深色毛玻璃 */}
      {/* ============================================ */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-[520px] rounded-xl p-6 animate-slide-up"
            style={{ background: '#0F1728', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-1">手动添加证据</h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>录入一条可引用的营销证据</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>标题</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,141,246,0.4)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  placeholder="例：产品通过 ISO 9001 认证"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>类型</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(TYPE_CONFIG) as [EvidenceTypeValue, typeof TYPE_CONFIG[EvidenceTypeValue]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setCreateForm({ ...createForm, type: key })}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                      style={
                        createForm.type === key
                          ? { background: 'rgba(79,141,246,0.15)', color: 'var(--ci-accent)', border: '1px solid rgba(79,141,246,0.4)' }
                          : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>内容</label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,141,246,0.4)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  placeholder="证据的具体内容描述..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !createForm.title || !createForm.content}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-semibold transition-all disabled:opacity-40"
                style={{
                  background: 'var(--ci-accent)', color: '#FFFFFF',
                  boxShadow: '0 2px 12px -2px rgba(79,141,246,0.4)',
                }}
              >
                {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* AI 批量生成弹窗 - 深色毛玻璃 */}
      {/* ============================================ */}
      {showBatchDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowBatchDialog(false)}
        >
          <div
            className="w-[520px] rounded-xl p-6 animate-slide-up"
            style={{ background: '#0F1728', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles size={16} style={{ color: 'var(--ci-accent)' }} />
              AI 批量提取证据
            </h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>选择一个已处理的素材，AI 将从每个文本片段中提取可引用证据</p>

            {batchResult ? (
              /* 结果展示 */
              <div
                className="p-4 rounded-xl mb-5"
                style={{ background: 'rgba(79,141,246,0.08)', border: '1px solid rgba(79,141,246,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Check size={16} style={{ color: 'var(--ci-accent)' }} />
                  <span className="text-sm font-semibold text-white">提取完成</span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  成功生成 <strong style={{ color: 'var(--ci-accent)' }}>{batchResult.generated}</strong> 条证据
                  {batchResult.errors > 0 && <span style={{ color: '#EF4444' }}>，{batchResult.errors} 条失败</span>}
                </p>
              </div>
            ) : (
              /* 素材选择列表 */
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto mb-5 pr-1">
                {readyAssets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>没有已处理的素材</p>
                    <Link href="/customer/knowledge/assets" className="text-xs mt-2 inline-block" style={{ color: 'var(--ci-accent)' }}>
                      前往资料库 →
                    </Link>
                  </div>
                ) : readyAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssetId(a.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={
                      selectedAssetId === a.id
                        ? { background: 'rgba(79,141,246,0.1)', border: '1px solid rgba(79,141,246,0.4)' }
                        : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{a.originalName}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {a.processingMeta.chunkCount} 个片段
                      </p>
                    </div>
                    {selectedAssetId === a.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--ci-accent)' }}>
                        <Check size={12} style={{ color: '#0B1220' }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchDialog(false)}
                className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {batchResult ? '关闭' : '取消'}
              </button>
              {!batchResult && (
                <button
                  onClick={handleBatchGenerate}
                  disabled={!selectedAssetId || isBatchGenerating}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--ci-accent)', color: '#FFFFFF',
                    boxShadow: '0 2px 12px -2px rgba(79,141,246,0.4)',
                  }}
                >
                  {isBatchGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isBatchGenerating ? '生成中...' : '开始提取'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Step Banner */}
      {pipelineStatus && (
        <NextStepBanner steps={pipelineStatus.steps} currentStep={pipelineStatus.currentStep} />
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除证据「${deleteTarget.title}」吗？此操作不可撤销。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
