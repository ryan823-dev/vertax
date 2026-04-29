"use client";

/**
 * 买家画像页面 - 管理 ICP 细分市场和买家角色
 * 
 * 重构重点：
 * - 集成 EngineHeader + Stepper
 * - 输入来源提示（依赖企业档案）
 * - 明确前置条件
 * - 弹窗深色毛玻璃、CTA金渐变、删除确认、错误toast
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Loader2, Users2, Trash2, Sparkles, ChevronRight, MessageSquare,
  Building2, AlertCircle, Radar, RefreshCw, Settings, X,
} from 'lucide-react';
import {
  getICPSegments, createICPSegment, deleteICPSegment,
  getPersonasBySegment, createPersona, deletePersona,
  getMessagingMatrix, generatePersonaMessaging,
  generatePersonasFromProfile,
} from '@/actions/personas';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
import { EngineHeader, NextStepBanner } from '@/components/knowledge/engine-header';
import type { ICPSegmentData, PersonaData, MessagingMatrixData, CreatePersonaInput } from '@/types/knowledge';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

// Dark dialog wrapper styles
const DIALOG_OVERLAY: React.CSSProperties = { background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' };
const DIALOG_PANEL: React.CSSProperties = { background: '#0F1728', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)' };
const DIALOG_LABEL: React.CSSProperties = { color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
const DIALOG_INPUT: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' };
const DIALOG_CANCEL: React.CSSProperties = { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' };
const DIALOG_CONFIRM: React.CSSProperties = { background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 12px 24px -18px rgba(29,78,216,0.58)' };

export default function ProfilesPage() {
  // Pipeline status
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [segments, setSegments] = useState<ICPSegmentData[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MessagingMatrixData[]>([]);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);

  // Create segment
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentIndustry, setSegmentIndustry] = useState('');

  // Create persona
  const [showCreatePersona, setShowCreatePersona] = useState(false);
  const [personaForm, setPersonaForm] = useState<CreatePersonaInput>({ name: '', title: '' });

  // AI generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [valuePropInput, setValuePropInput] = useState('');

  // Auto-generate state
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'segment' | 'persona'; id: string; name: string } | null>(null);

  // Sync to radar
  const [isSyncing, setIsSyncing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load pipeline status
  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      // Pipeline status is non-critical
    }
  }, []);

  // Load data
  const loadSegments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getICPSegments();
      setSegments(data);
      if (data.length > 0) {
        setSelectedSegmentId((current) => current ?? data[0].id);
      }
    } catch {
      setToast({ message: '加载细分市场失败', type: 'error' });
    } finally { setIsLoading(false); }
  }, []);

  const loadPersonas = useCallback(async () => {
    if (!selectedSegmentId) return;
    try {
      const data = await getPersonasBySegment(selectedSegmentId);
      setPersonas(data);
    } catch {
      setToast({ message: '加载买家角色失败', type: 'error' });
    }
  }, [selectedSegmentId]);

  const loadMatrix = useCallback(async () => {
    if (!selectedPersonaId) return;
    setIsLoadingMatrix(true);
    try {
      const data = await getMessagingMatrix(selectedPersonaId);
      setMatrix(data);
    } catch {
      setToast({ message: '加载信息矩阵失败', type: 'error' });
    } finally { setIsLoadingMatrix(false); }
  }, [selectedPersonaId]);

  // P1-2: Pipeline 状态轮询 — AI 任务后台运行期间每 4s 刷新 stepper 进度
  const startPipelinePolling = useCallback((initialStep: number, maxSeconds = 90) => {
    const deadline = Date.now() + maxSeconds * 1000;
    const interval = setInterval(async () => {
      if (Date.now() >= deadline) { clearInterval(interval); return; }
      try {
        const status = await getKnowledgePipelineStatus();
        setPipelineStatus(status);
        if (status.currentStep > initialStep || status.currentStep >= status.steps.length - 1) {
          clearInterval(interval);
          loadSegments();
        }
      } catch { /* 静默 */ }
    }, 4000);
    return interval;
  }, [loadSegments]);

  useEffect(() => { 
    loadPipelineStatus();
    loadSegments(); 
  }, [loadPipelineStatus, loadSegments]);
  useEffect(() => { loadPersonas(); }, [selectedSegmentId, loadPersonas]);
  useEffect(() => { loadMatrix(); }, [selectedPersonaId, loadMatrix]);

  const handleCreateSegment = async () => {
    if (!segmentName) return;
    try {
      await createICPSegment({ name: segmentName, industry: segmentIndustry || undefined });
      setShowCreateSegment(false);
      setSegmentName('');
      setSegmentIndustry('');
      loadSegments();
      loadPipelineStatus();
      setToast({ message: '细分市场已创建', type: 'success' });
    } catch {
      setToast({ message: '创建细分市场失败', type: 'error' });
    }
  };

  const handleDeleteSegment = async (id: string) => {
    try {
      await deleteICPSegment(id);
      if (selectedSegmentId === id) setSelectedSegmentId(null);
      loadSegments();
      loadPipelineStatus();
      setToast({ message: '细分市场已删除', type: 'success' });
    } catch {
      setToast({ message: '删除细分市场失败', type: 'error' });
    }
  };

  const handleCreatePersona = async () => {
    if (!personaForm.name || !personaForm.title) return;
    try {
      await createPersona({ ...personaForm, segmentId: selectedSegmentId || undefined });
      setShowCreatePersona(false);
      setPersonaForm({ name: '', title: '' });
      loadPersonas();
      loadPipelineStatus();
      setToast({ message: '买家角色已创建', type: 'success' });
    } catch {
      setToast({ message: '创建买家角色失败', type: 'error' });
    }
  };

  const handleDeletePersona = async (id: string) => {
    try {
      await deletePersona(id);
      if (selectedPersonaId === id) { setSelectedPersonaId(null); setMatrix([]); }
      loadPersonas();
      loadPipelineStatus();
      setToast({ message: '买家角色已删除', type: 'success' });
    } catch {
      setToast({ message: '删除买家角色失败', type: 'error' });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'segment') handleDeleteSegment(deleteTarget.id);
    else handleDeletePersona(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAIGenerate = async () => {
    if (!selectedPersonaId || !valuePropInput.trim()) return;
    setIsGenerating(true);
    try {
      const props = valuePropInput.split('\n').filter(Boolean).map(s => s.trim());
      await generatePersonaMessaging(selectedPersonaId, props);
      loadMatrix();
      setToast({ message: '信息矩阵已生成', type: 'success' });
    } catch {
      setToast({ message: 'AI 生成失败', type: 'error' });
    } finally { setIsGenerating(false); }
  };

  // Auto-generate from CompanyProfile
  const handleAutoGenerate = async (overwrite = false) => {
    if (segments.length > 0 && !overwrite) {
      setShowOverwriteConfirm(true);
      return;
    }
    setShowOverwriteConfirm(false);
    setIsAutoGenerating(true);
    const currentStep = pipelineStatus?.currentStep ?? 0;
    try {
      const result = await generatePersonasFromProfile({ overwrite: segments.length > 0 });

      if (result.needsAI) {
        setToast({ message: '正在 AI 生成买家画像...', type: 'success' });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 55000);
        try {
          const resp = await fetch('/api/knowledge/generate-personas', {
            method: 'POST',
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(err.error || `HTTP ${resp.status}`);
          }
          const dbResult = await generatePersonasFromProfile({ overwrite: segments.length > 0 });
          setToast({ message: `AI 生成完成: ${dbResult.segmentsCreated} 个细分市场, ${dbResult.personasCreated} 个买家角色`, type: 'success' });
        } catch (e) {
          clearTimeout(timer);
          const errMsg = e instanceof Error && e.name === 'AbortError' ? '请求超时' : (e instanceof Error ? e.message : 'Unknown error');
          setToast({ message: `AI 生成失败: ${errMsg}`, type: 'error' });
          return;
        }
      } else {
        setToast({ message: `已生成: ${result.segmentsCreated} 个细分市场, ${result.personasCreated} 个买家角色`, type: 'success' });
      }

      setSelectedSegmentId(null);
      setSelectedPersonaId(null);
      setMatrix([]);
      loadSegments();
      loadPipelineStatus();
      // 启动轮询跟踪后台 stepper 进度
      startPipelinePolling(currentStep);
    } catch (e) {
      setToast({ message: `生成失败: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // Sync to radar
  const handleSyncToRadar = async () => {
    setIsSyncing(true);
    try {
      const resp = await fetch('/api/radar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      // 读取 SSE 流式响应
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');
      const decoder = new TextDecoder();
      let buffer = '';
      let success = false;
      let errorMsg = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(part.slice(6)) as { type: string; success?: boolean; error?: string };
            if (event.type === 'done' && event.success) success = true;
            if (event.type === 'error') errorMsg = event.error || '同步失败';
          } catch { /* skip */ }
        }
      }
      if (errorMsg) throw new Error(errorMsg);
      if (success) setToast({ message: '已同步到获客雷达', type: 'success' });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      setToast({ message: `同步失败: ${errMsg}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Check prerequisites
  const hasCompanyProfile = pipelineStatus?.counts.companyProfileHasContent;

  // Primary CTA config
  const getPrimaryCTA = () => {
    return {
      label: isAutoGenerating ? '生成中...' : '生成买家画像',
      onClick: () => handleAutoGenerate(),
      disabled: !hasCompanyProfile || isAutoGenerating,
    };
  };

  return (
    <div className="space-y-0">
      {/* Engine Header with Stepper */}
      {pipelineStatus && (
        <EngineHeader
          title="买家画像"
          description="管理 ICP 细分市场、买家角色和定制化信息矩阵"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
          primaryAction={getPrimaryCTA()}
        />
      )}

      <div className="p-5 space-y-5">
        {/* Input Source Hint */}
        <div className="ci-panel-strong rounded-[var(--ci-radius-panel)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <span className="text-xs text-slate-500">输入来源：</span>
                <span className="text-xs font-medium" style={{ color: hasCompanyProfile ? 'var(--ci-accent-strong)' : '#94A3B8' }}>
                  企业档案 {hasCompanyProfile ? '✓ 已生成' : '× 未生成'}
                </span>
              </div>
              {!hasCompanyProfile && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ci-warning)' }}>
                  <AlertCircle size={14} />
                  <span>请先生成企业档案</span>
                  <Link href="/customer/knowledge/company" className="text-[var(--ci-accent-strong)] hover:underline">去企业档案</Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/customer/knowledge/scoring"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ color: 'var(--ci-accent-strong)', background: 'var(--ci-accent-soft)', border: '1px solid rgba(79,141,246,0.22)' }}
              >
                <Settings size={14} />
                评分配置
              </Link>
              <button onClick={() => setShowCreateSegment(true)} disabled={!hasCompanyProfile}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-[var(--ci-border)] rounded-lg hover:bg-[var(--ci-surface-muted)] transition-colors disabled:opacity-50">
                <Plus size={14} />
                新建细分
              </button>
              <button onClick={() => setShowCreatePersona(true)} disabled={!selectedSegmentId || !hasCompanyProfile}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-[var(--ci-border)] rounded-lg hover:bg-[var(--ci-surface-muted)] transition-colors disabled:opacity-50">
                <Plus size={14} />
                新建角色
              </button>
              {segments.length > 0 && (
                <button onClick={handleSyncToRadar} disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={DIALOG_CONFIRM}>
                  {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
                  同步到获客雷达
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-[var(--ci-accent)] animate-spin" /></div>
        ) : !hasCompanyProfile ? (
          <div className="ci-panel-strong text-center py-12 rounded-[var(--ci-radius-panel)]">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--ci-accent-soft)', border: '1px solid rgba(79,141,246,0.22)', boxShadow: '0 16px 30px -24px rgba(29,78,216,0.46)' }}
            >
              <Users2 size={28} className="text-[var(--ci-accent-strong)]" />
            </div>
            <p className="text-sm text-slate-500 mb-2">需要先生成企业档案</p>
            <p className="text-xs text-slate-400 mb-4">企业档案将提供目标客户信息作为画像输入</p>
            <Link
              href="/customer/knowledge/company"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={DIALOG_CONFIRM}
            >
              <Building2 size={16} />
              去企业档案
            </Link>
          </div>
        ) : (
           <div className="grid grid-cols-1 gap-5 min-h-[500px] xl:grid-cols-5">
            {/* Left: Segments */}
            <div className="col-span-1 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">① 选择市场</p>
              {segments.length === 0 ? (
                <div className="ci-data-panel text-center py-8 rounded-[var(--ci-radius-panel)]">
                  <p className="text-xs text-slate-400 mb-3">暂无细分市场</p>
                  <button onClick={() => setShowCreateSegment(true)} 
                    className="text-xs text-[var(--ci-accent-strong)] hover:underline">创建第一个</button>
                </div>
              ) : segments.map((seg) => (
                <div key={seg.id}
                  className={`w-full text-left p-3 rounded-[var(--ci-radius-panel)] border transition-all duration-200 cursor-pointer ${
                    selectedSegmentId === seg.id ? 'border-[var(--ci-accent)] bg-[var(--ci-accent-soft)]' : 'border-[var(--ci-border)] bg-white/80 hover:border-[rgba(79,141,246,0.34)]'
                  }`}
                  onClick={() => { setSelectedSegmentId(seg.id); setSelectedPersonaId(null); setMatrix([]); }}
                  onMouseEnter={(e) => { if (selectedSegmentId !== seg.id) { e.currentTarget.style.boxShadow = '0 14px 28px -24px rgba(29,78,216,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--ci-text)] truncate">{seg.name}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'segment', id: seg.id, name: seg.name }); }}
                        className="p-1 text-slate-400 opacity-40 hover:opacity-100 hover:text-red-500 rounded transition-all"
                        >
                        <Trash2 size={12} />
                      </button>
                      {selectedSegmentId === seg.id && <ChevronRight size={14} className="text-[var(--ci-accent-strong)]" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {seg.industry && <span className="text-[10px] text-slate-400">{seg.industry}</span>}
                    <span className="text-[10px] text-slate-400">{seg.personaCount || 0} 角色</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Middle: Personas */}
            <div className="col-span-2 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">② 选择角色</p>
              {personas.length === 0 ? (
                <div className="ci-data-panel text-center py-12 rounded-[var(--ci-radius-panel)]">
                  <Users2 size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">{selectedSegmentId ? '暂无角色，点击下方创建' : '← 先选择左侧细分市场'}</p>
                </div>
              ) : personas.map((p) => (
                <div key={p.id} onClick={() => setSelectedPersonaId(p.id)}
                  className={`p-4 rounded-[var(--ci-radius-panel)] border cursor-pointer transition-all duration-200 ${
                    selectedPersonaId === p.id ? 'border-[var(--ci-accent)] bg-[var(--ci-accent-soft)]' : 'border-[var(--ci-border)] bg-white/80 hover:border-[rgba(79,141,246,0.34)]'
                  }`}
                  onMouseEnter={(e) => { if (selectedPersonaId !== p.id) { e.currentTarget.style.boxShadow = '0 14px 28px -24px rgba(29,78,216,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-[var(--ci-text)]">{p.name}</h4>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'persona', id: p.id, name: p.name }); }} className="p-1 text-slate-400 hover:text-red-500 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{p.title}{p.seniority ? ` · ${p.seniority}` : ''}</p>
                  {p.concerns.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.concerns.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] rounded-full" style={{ background: 'var(--ci-accent-soft)', color: 'var(--ci-accent-strong)', border: '1px solid rgba(79,141,246,0.18)' }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right: Messaging Matrix */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">③ 配置信息</p>
              </div>
              {!selectedPersonaId ? (
                <div className="ci-data-panel text-center py-12 rounded-[var(--ci-radius-panel)]">
                  <MessageSquare size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">选择角色查看信息矩阵</p>
                </div>
              ) : isLoadingMatrix ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-[var(--ci-accent)] animate-spin" /></div>
              ) : (
                <>
                  {matrix.length > 0 && (
                    <div className="space-y-2">
                      {matrix.map((m) => (
                        <div key={m.id} className="ci-object-card p-3 rounded-[var(--ci-radius-panel)] transition-all duration-200"
                          onMouseEnter={(e) => { const t = e.currentTarget; t.style.borderColor = 'rgba(79,141,246,0.34)'; t.style.boxShadow = '0 14px 28px -24px rgba(29,78,216,0.42)'; t.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { const t = e.currentTarget; t.style.borderColor = ''; t.style.boxShadow = ''; t.style.transform = ''; }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded" style={{ background: 'var(--ci-accent-soft)', color: 'var(--ci-accent-strong)' }}>{m.valueProp}</span>
                            {m.channel && <span className="text-[10px] text-slate-400">{m.channel}</span>}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{m.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* AI Generate Section */}
                  <div className="ci-data-panel p-4 rounded-[var(--ci-radius-panel)] mt-3">
                    <p className="text-xs font-medium text-[var(--ci-text)] mb-2">AI 生成定制信息</p>
                    <textarea value={valuePropInput} onChange={(e) => setValuePropInput(e.target.value)}
                      rows={3} placeholder={"输入价值主张（每行一条），如：\n降低运营成本\n提升产品质量\n加速交付周期"}
                      className="w-full px-3 py-2 text-xs border border-[var(--ci-border)] rounded-lg bg-white mb-2 text-[#0B1220]" />
                    <button onClick={handleAIGenerate} disabled={isGenerating || !valuePropInput.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg font-semibold disabled:opacity-50 transition-all"
                      style={DIALOG_CONFIRM}>
                      {isGenerating ? <><Loader2 size={12} className="animate-spin" />生成中...</> : <><Sparkles size={12} />生成</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 right-6 z-[60] max-w-sm px-4 py-3 rounded-xl shadow-[var(--ci-shadow-soft)] text-sm flex items-center gap-2 animate-slide-up"
          style={{
            background: toast.type === 'success' ? 'rgba(15,159,110,0.12)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(15,159,110,0.24)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.type === 'success' ? 'var(--ci-success)' : '#DC2626',
            backdropFilter: 'blur(12px)',
          }}
        >
          {isAutoGenerating && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={DIALOG_OVERLAY} onClick={() => setDeleteTarget(null)}>
          <div className="rounded-xl w-[400px] p-6" style={DIALOG_PANEL} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={18} style={{ color: '#EF4444' }} />
              <h3 className="text-lg font-bold text-white">确认删除</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
              确定要删除{deleteTarget.type === 'segment' ? '细分市场' : '买家角色'} <span className="text-white font-medium">&quot;{deleteTarget.name}&quot;</span> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-xl" style={DIALOG_CANCEL}>取消</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm rounded-xl font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirm Dialog */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={DIALOG_OVERLAY} onClick={() => setShowOverwriteConfirm(false)}>
          <div className="rounded-xl w-[400px] p-6" style={DIALOG_PANEL} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={18} style={{ color: 'var(--ci-accent)' }} />
              <h3 className="text-lg font-bold text-white">重新生成买家画像</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
              当前已有 {segments.length} 个细分市场。重新生成将<span style={{ color: '#EF4444' }} className="font-medium">覆盖</span>所有现有细分市场和买家角色数据。
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowOverwriteConfirm(false)} className="px-4 py-2 text-sm rounded-xl" style={DIALOG_CANCEL}>取消</button>
              <button onClick={() => handleAutoGenerate(true)} className="px-4 py-2 text-sm rounded-xl font-semibold" style={DIALOG_CONFIRM}>确认覆盖</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Segment Dialog */}
      {showCreateSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={DIALOG_OVERLAY} onClick={() => setShowCreateSegment(false)}>
          <div className="rounded-xl w-[400px] p-6" style={DIALOG_PANEL} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">新建细分市场</h3>
            <div className="space-y-3">
              <div>
                <label className="block mb-1.5" style={DIALOG_LABEL}>市场名称</label>
                <input value={segmentName} onChange={(e) => setSegmentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={DIALOG_INPUT} placeholder="细分市场名称" />
              </div>
              <div>
                <label className="block mb-1.5" style={DIALOG_LABEL}>目标行业</label>
                <input value={segmentIndustry} onChange={(e) => setSegmentIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={DIALOG_INPUT} placeholder="目标行业（可选）" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreateSegment(false)} className="px-4 py-2 text-sm rounded-xl" style={DIALOG_CANCEL}>取消</button>
              <button onClick={handleCreateSegment} disabled={!segmentName} className="px-4 py-2 text-sm rounded-xl font-semibold disabled:opacity-50" style={DIALOG_CONFIRM}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Persona Dialog */}
      {showCreatePersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={DIALOG_OVERLAY} onClick={() => setShowCreatePersona(false)}>
          <div className="rounded-xl w-[450px] p-6" style={DIALOG_PANEL} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">新建买家角色</h3>
            <div className="space-y-3">
              <div>
                <label className="block mb-1.5" style={DIALOG_LABEL}>角色名称</label>
                <input value={personaForm.name} onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={DIALOG_INPUT} placeholder="如：采购经理" />
              </div>
              <div>
                <label className="block mb-1.5" style={DIALOG_LABEL}>典型职位</label>
                <input value={personaForm.title} onChange={(e) => setPersonaForm({ ...personaForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={DIALOG_INPUT} placeholder="如：采购部总监" />
              </div>
              <div>
                <label className="block mb-1.5" style={DIALOG_LABEL}>级别</label>
                <select value={personaForm.seniority || ''} onChange={(e) => setPersonaForm({ ...personaForm, seniority: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={DIALOG_INPUT}>
                  <option value="">级别（可选）</option>
                  <option value="junior">初级</option>
                  <option value="mid">中级</option>
                  <option value="senior">高级</option>
                  <option value="executive">高管</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreatePersona(false)} className="px-4 py-2 text-sm rounded-xl" style={DIALOG_CANCEL}>取消</button>
              <button onClick={handleCreatePersona} disabled={!personaForm.name || !personaForm.title} className="px-4 py-2 text-sm rounded-xl font-semibold disabled:opacity-50" style={DIALOG_CONFIRM}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Next Step Banner */}
      {pipelineStatus && (
        <NextStepBanner steps={pipelineStatus.steps} currentStep={pipelineStatus.currentStep} />
      )}
    </div>
  );
}
