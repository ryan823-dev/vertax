"use client";

/**
 * 企业档案页面 - 知识引擎核心产出
 * 
 * 重构重点：
 * - 集成 EngineHeader + Stepper
 * - 简化布局，去掉大面积空白
 * - 明确前置条件与一键生成
 * - 内容区 + 侧边目录架构
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Upload, Loader2, Sparkles, CheckCircle2,
  Building2, Target, Award, Zap, TrendingUp, Globe2,
  AlertCircle, Clock, Pencil, X,
  Lock, BarChart3, Radar, ArrowRight,
  Users, FileStack,
} from 'lucide-react';
import { 
  getCompanyProfile, getAnalyzableAssets,
  updateCompanyProfile, type CompanyProfileData 
} from '@/actions/knowledge';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
// syncMarketingFromKnowledge and syncRadarFromKnowledge moved to Route Handlers (avoid Server Action 10s limit)
import { toast } from 'sonner';
import { getLatestVersion, createVersion } from '@/actions/versions';
import { CollaborativeShell } from '@/components/collaboration';
import { EngineHeader, NextStepBanner } from '@/components/knowledge/engine-header';
import type { AnchorSpec, ArtifactStatusValue } from '@/types/artifact';
import type { PipelineStatus } from '@/lib/knowledge/pipeline';

type AssetItem = {
  id: string;
  originalName: string;
  fileCategory: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
};

const PROFILE_SECTIONS = [
  { key: 'companyIntro', label: '企业简介', icon: Building2, type: 'text' },
  { key: 'coreProducts', label: '核心产品', icon: Award, type: 'array' },
  { key: 'techAdvantages', label: '技术优势', icon: Zap, type: 'array' },
  { key: 'scenarios', label: '应用场景', icon: Target, type: 'array' },
  { key: 'differentiators', label: '差异化优势', icon: TrendingUp, type: 'array' },
] as const;

const NAV_ITEMS = [
  { key: 'overview', label: '企业概览' },
  { key: 'products', label: '核心产品' },
  { key: 'advantages', label: '竞争优势' },
  { key: 'icp', label: '目标客户' },
];

export default function CompanyKnowledgePage() {
  // Pipeline status
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  // Data states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  
  // Edit states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Collaboration states
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeAnchor] = useState<AnchorSpec | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  
  // Sync states
  const [isSyncingMarketing, setIsSyncingMarketing] = useState(false);
  const [isSyncingRadar, setIsSyncingRadar] = useState(false);
  
  // Active nav section
  const [activeNav, setActiveNav] = useState('overview');

  // Load pipeline status
  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getKnowledgePipelineStatus();
      setPipelineStatus(status);
    } catch {
      // silent
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileData, assetsData] = await Promise.all([
        getCompanyProfile(),
        getAnalyzableAssets(),
      ]);
      setProfile(profileData);
      setAssets(assetsData);

      if (profileData?.id) {
        try {
          const latestVersion = await getLatestVersion('CompanyProfile', profileData.id);
          if (latestVersion) {
            setCurrentVersionId(latestVersion.id);
            const status = latestVersion.status as ArtifactStatusValue;
            setIsReadOnly(status === 'approved' || status === 'archived');
          }
        } catch {
          if (profileData) {
            const newVersion = await createVersion(
              'CompanyProfile',
              profileData.id,
              profileData as unknown as Record<string, unknown>,
              { changeNote: '初始版本' }
            );
            setCurrentVersionId(newVersion.id);
            setIsReadOnly(false);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPipelineStatus();
    loadData();
  }, [loadPipelineStatus, loadData]);

  // P1-2: Pipeline 状态轮询 — AI 任务后台运行期间每 4s 刷新 stepper 进度
  const startPipelinePolling = useCallback((initialStep: number, maxSeconds = 90) => {
    const deadline = Date.now() + maxSeconds * 1000;
    const interval = setInterval(async () => {
      if (Date.now() >= deadline) { clearInterval(interval); return; }
      try {
        const status = await getKnowledgePipelineStatus();
        setPipelineStatus(status);
        if (
          status.currentStep > initialStep ||
          status.currentStep >= status.steps.length - 1 ||
          status.counts.companyProfileHasContent
        ) {
          clearInterval(interval);
          loadData();
        }
      } catch { /* 静默 */ }
    }, 4000);
    return interval;
  }, [loadData]);

  // AI Analysis - uses Route Handler to bypass 10s Server Action timeout
  const handleAnalyze = async () => {
    const idsToAnalyze = selectedAssetIds.length > 0 ? selectedAssetIds : assets.map(a => a.id);
    if (idsToAnalyze.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    const currentStep = pipelineStatus?.currentStep ?? 0;
    try {
      const res = await fetch('/api/knowledge/analyze-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds: idsToAnalyze }),
      });
      const data = await res.json() as {
        ok?: boolean;
        profile?: CompanyProfileData;
        error?: string;
        selection?: {
          mode?: 'requested' | 'all-ready-assets';
          consideredCount?: number;
          selectedCount?: number;
          selectedChunkCount?: number;
          selectedEvidenceCount?: number;
          evidenceSeedCount?: number;
          reusedEvidenceCount?: number;
          generatedEvidenceCount?: number;
        };
      };
      if (!res.ok) throw new Error(data.error || 'AI分析失败');
      if (data.profile) setProfile(data.profile as CompanyProfileData);
      if (data.selection?.consideredCount) {
        toast.success(
          `已综合 ${data.selection.consideredCount} 个素材，并自动提炼关键片段进行分析`,
        );
      }
      if ((data.selection?.generatedEvidenceCount ?? 0) + (data.selection?.reusedEvidenceCount ?? 0) > 0) {
        toast.dismiss();
        toast.success(
          `已综合 ${data.selection?.consideredCount ?? 0} 个素材，生成 ${data.selection?.generatedEvidenceCount ?? 0} 条新证据并复用 ${data.selection?.reusedEvidenceCount ?? 0} 条证据后完成分析`,
        );
      }
      setSelectedAssetIds([]);
      // 立即刷新一次，然后启动轮询持续跟踪后台进度
      loadPipelineStatus();
      startPipelinePolling(currentStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Edit functions
  const startEditing = (sectionKey: string) => {
    if (!profile || isReadOnly) return;
    const value = profile[sectionKey as keyof CompanyProfileData];
    if (typeof value === 'string') {
      setEditBuffer(value || '');
    } else if (Array.isArray(value)) {
      setEditBuffer(JSON.stringify(value, null, 2));
    }
    setEditingSection(sectionKey);
  };

  const saveEdit = async () => {
    if (!editingSection || !profile) return;
    setIsSaving(true);
    try {
      const sectionConfig = PROFILE_SECTIONS.find(s => s.key === editingSection);
      const updatePayload: Record<string, unknown> = {};
      
      if (sectionConfig?.type === 'text') {
        updatePayload[editingSection] = editBuffer;
      } else {
        updatePayload[editingSection] = JSON.parse(editBuffer);
      }

      const updated = await updateCompanyProfile(updatePayload as Parameters<typeof updateCompanyProfile>[0]);
      setProfile(updated);
      setEditingSection(null);
      setEditBuffer('');
      loadPipelineStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditBuffer('');
  };

  // Sync functions
  const handleSyncMarketing = async () => {
    if (!profile) return;
    setIsSyncingMarketing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      
      const res = await fetch('/api/knowledge/sync-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const result = await res.json() as { success?: boolean; error?: string };
      if (result.success) {
        toast.success('已同步到增长系统');
      } else {
        toast.error('同步失败', { description: result.error });
      }
    } catch (err) {
      const errMsg = err instanceof Error && err.name === 'AbortError'
        ? '请求超时，AI分析时间过长'
        : (err instanceof Error ? err.message : '未知错误');
      toast.error('同步失败', { description: errMsg });
    } finally {
      setIsSyncingMarketing(false);
    }
  };

  const handleSyncRadar = async () => {
    console.log('[SyncRadar] clicked, profile:', !!profile);
    if (!profile) return;
    setIsSyncingRadar(true);
    try {
      console.log('[SyncRadar] sending fetch...');
      // 设置55秒超时（Vercel maxDuration=60，留5秒余量）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      
      const res = await fetch('/api/knowledge/sync-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      console.log('[SyncRadar] response status:', res.status);
      const result = await res.json() as { success?: boolean; error?: string; detail?: string };
      console.log('[SyncRadar] result:', result);
      if (result.success) {
        toast.success('已同步到获客雷达');
      } else {
        toast.error('同步失败', { description: result.error });
      }
    } catch (err) {
      console.error('[SyncRadar] fetch error:', err);
      const errMsg = err instanceof Error && err.name === 'AbortError'
        ? '请求超时，AI分析时间过长'
        : (err instanceof Error ? err.message : '未知错误');
      toast.error('同步失败', { description: errMsg });
    } finally {
      setIsSyncingRadar(false);
    }
  };

  // Calculate completeness
  const calculateCompleteness = () => {
    if (!profile) return 0;
    let score = 0;
    if (profile.companyName) score += 10;
    if (profile.companyIntro) score += 15;
    if (profile.coreProducts?.length > 0) score += 20;
    if (profile.techAdvantages?.length > 0) score += 15;
    if (profile.scenarios?.length > 0) score += 10;
    if (profile.differentiators?.length > 0) score += 10;
    if (profile.targetIndustries?.length > 0) score += 10;
    if (profile.buyerPersonas?.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  // Determine CTA config based on pipeline status
  const getPrimaryCTA = () => {
    if (!pipelineStatus) return undefined;
    
    const { counts } = pipelineStatus;
    const canGenerate = counts.assetsParsed >= 1 || counts.evidenceCount >= 1;
    
    if (!profile || !profile.companyName) {
      const hint =
        counts.assetsParsed > 1
          ? '系统会综合全部已解析素材，并自动提炼高价值片段进行分析'
          : counts.evidenceCount < 3
          ? '建议先补齐证据(≥3)以获得更好效果'
          : undefined;

      return {
        label: '一键生成企业档案',
        onClick: handleAnalyze,
        disabled: !canGenerate,
        loading: isAnalyzing,
        hint,
      };
    }
    
    return {
      label: '更新企业档案',
      onClick: handleAnalyze,
      disabled: !canGenerate,
      loading: isAnalyzing,
    };
  };

  // Anchor functions for collaboration
  const handleAnchorClick = (anchor: AnchorSpec) => {
    setHighlightedSection(anchor.value);
    setTimeout(() => setHighlightedSection(null), 3000);
  };

  const handleStatusChange = (newStatus: ArtifactStatusValue) => {
    setIsReadOnly(newStatus === 'approved' || newStatus === 'archived');
    loadData();
  };

  const getSectionHighlightClass = (sectionKey: string) => {
    if (highlightedSection === sectionKey) {
      return 'ring-2 ring-[var(--ci-accent)] ring-offset-2 transition-all duration-300';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
      </div>
    );
  }

  // Check prerequisites
  const hasPrerequisites = pipelineStatus && (
    pipelineStatus.counts.assetsParsed >= 1 || pipelineStatus.counts.evidenceCount >= 1
  );

  return (
    <div className="space-y-0">
      {/* Engine Header with Stepper */}
      {pipelineStatus && (
        <EngineHeader
          title="企业档案"
          description="AI 自动从资料和证据中提炼企业能力画像"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
          primaryAction={getPrimaryCTA()}
        />
      )}

      <div className="p-5">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* No Profile - Show Empty State */}
        {(!profile || !profile.companyName) && (
          <div className="ci-panel-strong rounded-[var(--ci-radius-panel)] p-8">
            {!hasPrerequisites ? (
              // Blocked - need to upload assets first
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-xl bg-[var(--ci-accent-soft)] border border-[rgba(79,141,246,0.22)] flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-[var(--ci-accent-strong)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--ci-text)] mb-2">尚未生成企业档案</h3>
                <p className="text-sm text-slate-500 mb-2">需要先完成以下步骤：</p>
                <div className="flex items-center justify-center gap-6 my-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={
                      pipelineStatus?.counts.assetsParsed && pipelineStatus.counts.assetsParsed >= 1
                        ? { background: 'var(--ci-accent-soft)', color: 'var(--ci-accent-strong)' }
                        : { background: 'rgba(0,0,0,0.04)', color: '#94A3B8' }
                    }>
                      <FileStack size={18} />
                    </div>
                    <span className="text-xs text-slate-500">
                      已解析素材: {pipelineStatus?.counts.assetsParsed || 0}
                    </span>
                  </div>
                  <span className="text-slate-300">或</span>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={
                      pipelineStatus?.counts.evidenceCount && pipelineStatus.counts.evidenceCount >= 1
                        ? { background: 'var(--ci-accent-soft)', color: 'var(--ci-accent-strong)' }
                        : { background: 'rgba(0,0,0,0.04)', color: '#94A3B8' }
                    }>
                      <CheckCircle2 size={18} />
                    </div>
                    <span className="text-xs text-slate-500">
                      已有证据: {pipelineStatus?.counts.evidenceCount || 0}
                    </span>
                  </div>
                </div>
                <Link
                  href="/customer/knowledge/assets"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--ci-accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_-18px_rgba(29,78,216,0.58)] transition-colors hover:bg-[var(--ci-accent-strong)]"
                >
                  <Upload size={16} />
                  去资料库上传
                </Link>
              </div>
            ) : (
              // Can generate
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-xl bg-[var(--ci-accent-soft)] border border-[rgba(79,141,246,0.22)] flex items-center justify-center mx-auto mb-4">
                  <Building2 size={28} className="text-[var(--ci-accent-strong)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--ci-text)] mb-2">准备生成企业档案</h3>
                <p className="text-sm text-slate-500 mb-4">
                  已有 {pipelineStatus?.counts.assetsParsed || 0} 个已解析素材，
                  {pipelineStatus?.counts.evidenceCount || 0} 条证据
                </p>
                {pipelineStatus?.counts.evidenceCount && pipelineStatus.counts.evidenceCount < 3 && (
                  <p className="text-xs text-[var(--ci-warning)] mb-4">
                    建议先补齐证据(≥3条)以获得更好的分析效果
                  </p>
                )}
                {pipelineStatus?.counts.assetsParsed ? (
                  <p className="text-xs text-slate-400 mb-4">
                    未手动选择素材时，系统会综合全部 {pipelineStatus.counts.assetsParsed} 个已解析素材，并自动提炼高价值片段生成企业档案。
                  </p>
                ) : null}
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--ci-accent)] px-6 py-3 text-sm font-medium text-white shadow-[0_12px_24px_-18px_rgba(29,78,216,0.58)] transition-colors hover:bg-[var(--ci-accent-strong)] disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      AI 分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      一键生成企业档案
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Has Profile - Show Content */}
        {profile && profile.companyName && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[200px_minmax(0,1fr)_280px]">
            {/* Left: Section Nav */}
            <div className="space-y-2">
              <div className="ci-data-panel rounded-[var(--ci-radius-panel)] p-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">目录</p>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveNav(item.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeNav === item.key
                        ? 'bg-[var(--ci-accent-soft)] text-[var(--ci-accent-strong)] font-semibold'
                        : 'text-slate-500 hover:text-[var(--ci-text)] hover:bg-[var(--ci-surface-muted)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Completeness */}
              <div className="ci-data-panel rounded-[var(--ci-radius-panel)] p-4">
                <p className="text-xs text-slate-400 mb-2">知识完整度</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[var(--ci-surface-muted)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--ci-accent)] rounded-full transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[var(--ci-accent-strong)]">{completeness}%</span>
                </div>
              </div>

              {/* Sync Buttons */}
              {completeness >= 30 && (
                <div className="ci-data-panel rounded-[var(--ci-radius-panel)] p-3 space-y-2">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider px-1">同步到</p>
                  <button
                    onClick={handleSyncMarketing}
                    disabled={isSyncingMarketing}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--ci-surface-muted)', color: 'var(--ci-text-secondary)', border: '1px solid var(--ci-border)' }}
                  >
                    {isSyncingMarketing ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                    增长系统
                    <ArrowRight size={10} className="ml-auto" />
                  </button>
                  <button
                    onClick={handleSyncRadar}
                    disabled={isSyncingRadar}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 12px 24px -18px rgba(29,78,216,0.58)' }}
                  >
                    {isSyncingRadar ? <Loader2 size={12} className="animate-spin" /> : <Radar size={12} />}
                    获客雷达
                    <ArrowRight size={10} className="ml-auto" />
                  </button>
                </div>
              )}
            </div>

            {/* Center: Profile Content */}
            <div className="space-y-4">
              {/* Read-only Banner */}
              {isReadOnly && (
                <div className="bg-[var(--ci-accent-soft)] border border-[rgba(79,141,246,0.22)] rounded-lg p-3 flex items-center gap-3">
                  <Lock className="text-[var(--ci-accent-strong)] shrink-0" size={16} />
                  <p className="text-xs text-[#0B1B2B]">此版本已批准，内容已锁定。如需修改请在协作面板中创建新版本。</p>
                </div>
              )}

              {/* Company Header */}
              <div className="ci-panel-strong rounded-[var(--ci-radius-panel)] p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[var(--ci-accent-soft)] border border-[rgba(79,141,246,0.22)] rounded-lg flex items-center justify-center">
                    <Building2 size={24} className="text-[var(--ci-accent-strong)]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-[var(--ci-text)]">{profile.companyName}</h2>
                    <p className="text-sm text-slate-500">企业能力画像</p>
                  </div>
                  {profile.lastAnalyzedAt && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(profile.lastAnalyzedAt).toLocaleString('zh-CN')}
                    </span>
                  )}
                </div>

                {/* Company Intro - Editable */}
                {editingSection === 'companyIntro' ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBuffer}
                      onChange={(e) => setEditBuffer(e.target.value)}
                      className="w-full p-4 bg-[var(--ci-surface-muted)] border border-[var(--ci-accent)] rounded-lg text-sm text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/20"
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-slate-500 rounded-lg border border-slate-200">
                        取消
                      </button>
                      <button onClick={saveEdit} disabled={isSaving} className="px-3 py-1.5 text-xs text-white bg-[var(--ci-accent)] rounded-lg disabled:opacity-50">
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isReadOnly && startEditing('companyIntro')}
                    className={`p-4 bg-[var(--ci-surface-muted)] rounded-lg ${!isReadOnly ? 'cursor-pointer hover:ring-2 hover:ring-[var(--ci-accent)]/20' : ''} transition-all group relative ${getSectionHighlightClass('companyIntro')}`}
                  >
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {profile.companyIntro || '点击编辑企业简介...'}
                    </p>
                    {!isReadOnly && <Pencil size={14} className="absolute top-3 right-3 text-slate-300 opacity-0 group-hover:opacity-100" />}
                  </div>
                )}
              </div>

              {/* Profile Sections Grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {PROFILE_SECTIONS.filter(s => s.key !== 'companyIntro').map((section) => {
                  const SectionIcon = section.icon;
                  const isEditing = editingSection === section.key;
                  const value = profile[section.key as keyof CompanyProfileData];
                  const items = Array.isArray(value) ? value : [];

                  return (
                    <div 
                      key={section.key} 
                      className={`ci-object-card rounded-[var(--ci-radius-panel)] p-4 group relative transition-all duration-200 ${getSectionHighlightClass(section.key)}`}
                      onMouseEnter={(e) => { const t = e.currentTarget; t.style.borderColor = 'rgba(79,141,246,0.34)'; t.style.boxShadow = '0 14px 28px -24px rgba(29,78,216,0.42)'; t.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { const t = e.currentTarget; t.style.borderColor = ''; t.style.boxShadow = ''; t.style.transform = ''; }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <SectionIcon size={16} className="text-[var(--ci-accent-strong)]" />
                        <h4 className="font-bold text-[var(--ci-text)] text-sm flex-1">{section.label}</h4>
                        {!isEditing && !isReadOnly && (
                          <button
                            onClick={() => startEditing(section.key)}
                            className="p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-[var(--ci-accent-strong)] transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editBuffer}
                            onChange={(e) => setEditBuffer(e.target.value)}
                            className="w-full p-3 bg-[var(--ci-surface-muted)] border border-[var(--ci-accent)] rounded-lg text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ci-accent)]/20"
                            rows={6}
                            placeholder="JSON 数组格式"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={cancelEdit} className="px-2.5 py-1 text-[11px] text-slate-500 rounded border border-slate-200">取消</button>
                            <button onClick={saveEdit} disabled={isSaving} className="px-2.5 py-1 text-[11px] text-white bg-[var(--ci-accent)] rounded disabled:opacity-50">
                              {isSaving ? '保存中...' : '保存'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                          {items.length > 0 ? (
                            items.map((item: unknown, i: number) => {
                              const obj = item as Record<string, string> | null;
                              if (!obj || typeof obj !== 'object') return null;
                              return (
                                <div key={i} className="text-xs text-slate-600">
                                  <span className="font-medium text-[#0B1B2B]">
                                    {obj.name || obj.title || obj.point || obj.industry || ''}
                                  </span>
                                  {(obj.description || obj.scenario || obj.howWeHelp) && (
                                    <p className="text-slate-400 mt-0.5">{obj.description || obj.scenario || obj.howWeHelp}</p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-400">暂无数据，点击编辑添加</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ICP Section */}
              <div
                className="ci-object-card rounded-[var(--ci-radius-panel)] p-5 transition-all duration-200"
                onMouseEnter={(e) => { const t = e.currentTarget; t.style.borderColor = 'rgba(79,141,246,0.34)'; t.style.boxShadow = '0 14px 28px -24px rgba(29,78,216,0.42)'; t.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { const t = e.currentTarget; t.style.borderColor = ''; t.style.boxShadow = ''; t.style.transform = ''; }}
              >
                <h3 className="font-bold text-[var(--ci-text)] mb-4 flex items-center gap-2">
                  <Users size={18} className="text-[var(--ci-accent-strong)]" />
                  目标客户画像 (ICP)
                </h3>
                
                <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                  <div className="p-3 bg-[var(--ci-surface-muted)] rounded-lg">
                    <p className="text-xs text-slate-500 mb-2">目标行业</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.targetIndustries?.length > 0 ? (
                        profile.targetIndustries.map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-white text-xs text-[var(--ci-text)] rounded border border-[var(--ci-border)]">{item}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">暂无数据</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-[var(--ci-surface-muted)] rounded-lg">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Globe2 size={12} />海外目标市场
                    </p>
                    <div className="space-y-2">
                      {profile.targetRegions?.length > 0 ? (
                        profile.targetRegions.map((item, i) => {
                          if (typeof item === 'object' && item !== null && 'region' in item) {
                            const r = item as { region: string; countries?: string[]; rationale?: string };
                            return (
                              <div key={i} className="p-2 bg-white rounded border border-[var(--ci-border)]">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="font-medium text-xs text-[var(--ci-text)]">{r.region}</span>
                                  {r.countries?.map((c, j) => (
                                    <span key={j} className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--ci-accent-soft)] text-[var(--ci-accent-strong)]">{c}</span>
                                  ))}
                                </div>
                                {r.rationale && <p className="text-[11px] text-slate-500 leading-relaxed">{r.rationale}</p>}
                              </div>
                            );
                          }
                          return <span key={i} className="px-2 py-1 bg-white text-xs text-[var(--ci-text)] rounded border border-[var(--ci-border)]">{String(item)}</span>;
                        })
                      ) : (
                        <span className="text-xs text-slate-400">暂无数据</span>
                      )}
                    </div>
                  </div>
                   {/* 已探索过的市场记录 */}
                   {profile.exploredRegions && profile.exploredRegions.length > 0 && (
                     <details className="p-3 bg-[var(--ci-surface-muted)] rounded-lg">
                       <summary className="text-xs text-slate-500 cursor-pointer flex items-center gap-1">
                         <Globe2 size={12} />已探索的市场记录（{profile.exploredRegions.length} 个区域）
                       </summary>
                       <div className="space-y-2 mt-2">
                         {profile.exploredRegions.map((r, i) => (
                            <div key={i} className="p-2 bg-white rounded border border-[var(--ci-border)] opacity-80">
                             <div className="flex items-center gap-1.5 mb-1">
                               <span className="font-medium text-xs text-[var(--ci-text)]">{r.region}</span>
                               {r.countries?.map((c, j) => (
                                  <span key={j} className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--ci-accent-soft)] text-[var(--ci-accent-strong)]">{c}</span>
                               ))}
                               {r.exploredAt && <span className="text-[10px] text-slate-400 ml-auto">{new Date(r.exploredAt).toLocaleDateString("zh-CN")}</span>}
                             </div>
                             {r.rationale && <p className="text-[11px] text-slate-400 leading-relaxed">{r.rationale}</p>}
                           </div>
                         ))}
                       </div>
                     </details>
                   )}
                </div>

                {profile.buyerPersonas?.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {profile.buyerPersonas.map((persona, i) => (
                      <div key={i} className="p-3 border border-[var(--ci-border)] rounded-lg bg-white">
                        <p className="font-medium text-[var(--ci-text)] text-sm">{persona.role}</p>
                        {persona.title && <p className="text-xs text-slate-500">{persona.title}</p>}
                        {persona.concerns?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {persona.concerns.map((concern, j) => (
                              <span key={j} className="px-2 py-0.5 text-[10px] rounded bg-[var(--ci-accent-soft)] text-[var(--ci-accent-strong)] border border-[rgba(79,141,246,0.18)]">{concern}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Collaboration Panel */}
            <div>
              {profile?.id && currentVersionId && (
                <CollaborativeShell
                  entityType="CompanyProfile"
                  entityId={profile.id}
                  versionId={currentVersionId}
                  anchorType="jsonPath"
                  activeAnchor={activeAnchor}
                  onAnchorClick={handleAnchorClick}
                  onStatusChange={handleStatusChange}
                  onVersionChange={(verId) => setCurrentVersionId(verId)}
                  variant="light"
                  className="sticky top-20"
                />
              )}
            </div>
          </div>
        )}

        {/* Next Step Banner */}
        {pipelineStatus && (
          <NextStepBanner steps={pipelineStatus.steps} currentStep={pipelineStatus.currentStep} />
        )}
      </div>
    </div>
  );
}
