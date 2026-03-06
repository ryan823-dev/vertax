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
  Upload, FileText, Loader2, Sparkles, CheckCircle2,
  Building2, Target, Award, Zap, TrendingUp, Globe2,
  RefreshCw, AlertCircle, Clock, Pencil, Check, X,
  Lock, MessageSquarePlus, BarChart3, Radar, ArrowRight,
  Users, FileStack,
} from 'lucide-react';
import { 
  getCompanyProfile, getAnalyzableAssets, analyzeAssets,
  updateCompanyProfile, type CompanyProfileData 
} from '@/actions/knowledge';
import { getKnowledgePipelineStatus } from '@/actions/pipeline';
// syncMarketingFromKnowledge and syncRadarFromKnowledge moved to Route Handlers (avoid Server Action 10s limit)
import { toast } from 'sonner';
import { getLatestVersion, createVersion } from '@/actions/versions';
import { CollaborativeShell } from '@/components/collaboration';
import { EngineHeader, EmptyStateGuide } from '@/components/knowledge/engine-header';
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
  const [activeAnchor, setActiveAnchor] = useState<AnchorSpec | null>(null);
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

  // AI Analysis - uses Route Handler to bypass 10s Server Action timeout
  const handleAnalyze = async () => {
    const idsToAnalyze = selectedAssetIds.length > 0 ? selectedAssetIds : assets.map(a => a.id);
    if (idsToAnalyze.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/knowledge/analyze-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds: idsToAnalyze }),
      });
      const data = await res.json() as { ok?: boolean; profile?: CompanyProfileData; error?: string };
      if (!res.ok) throw new Error(data.error || 'AI分析失败');
      if (data.profile) setProfile(data.profile as CompanyProfileData);
      setSelectedAssetIds([]);
      loadPipelineStatus();
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
        toast.success('已同步到营销系统');
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
      return {
        label: '一键生成企业档案',
        onClick: handleAnalyze,
        disabled: !canGenerate,
        loading: isAnalyzing,
        hint: counts.evidenceCount < 3 ? '建议先补齐证据(≥3)以获得更好效果' : undefined,
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
      return 'ring-2 ring-[#D4AF37] ring-offset-2 transition-all duration-300';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
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
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-8">
            {!hasPrerequisites ? (
              // Blocked - need to upload assets first
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1220] mb-2">尚未生成企业档案</h3>
                <p className="text-sm text-slate-500 mb-2">需要先完成以下步骤：</p>
                <div className="flex items-center justify-center gap-6 my-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pipelineStatus?.counts.assetsParsed && pipelineStatus.counts.assetsParsed >= 1 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <FileStack size={18} />
                    </div>
                    <span className="text-xs text-slate-500">
                      已解析素材: {pipelineStatus?.counts.assetsParsed || 0}
                    </span>
                  </div>
                  <span className="text-slate-300">或</span>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pipelineStatus?.counts.evidenceCount && pipelineStatus.counts.evidenceCount >= 1 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <CheckCircle2 size={18} />
                    </div>
                    <span className="text-xs text-slate-500">
                      已有证据: {pipelineStatus?.counts.evidenceCount || 0}
                    </span>
                  </div>
                </div>
                <Link
                  href="/c/knowledge/assets"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors shadow-[0_4px_16px_-2px_rgba(212,175,55,0.35)]"
                >
                  <Upload size={16} />
                  去资料库上传
                </Link>
              </div>
            ) : (
              // Can generate
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center mx-auto mb-4">
                  <Building2 size={28} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1220] mb-2">准备生成企业档案</h3>
                <p className="text-sm text-slate-500 mb-4">
                  已有 {pipelineStatus?.counts.assetsParsed || 0} 个已解析素材，
                  {pipelineStatus?.counts.evidenceCount || 0} 条证据
                </p>
                {pipelineStatus?.counts.evidenceCount && pipelineStatus.counts.evidenceCount < 3 && (
                  <p className="text-xs text-amber-600 mb-4">
                    建议先补齐证据(≥3条)以获得更好的分析效果
                  </p>
                )}
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-50 shadow-[0_4px_16px_-2px_rgba(212,175,55,0.35)]"
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
          <div className="grid grid-cols-[200px_1fr_280px] gap-5">
            {/* Left: Section Nav */}
            <div className="space-y-2">
              <div className="bg-[#F0EBD8] rounded-2xl border-b border-[#E8E0D0] p-3" style={{ background: '#F0EBD8', borderBottom: '1px solid #E8E0D0' }}>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">目录</p>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveNav(item.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeNav === item.key
                        ? 'bg-[#0B1220] text-[#D4AF37] font-medium'
                        : 'text-slate-500 hover:text-[#0B1220] hover:bg-[#F0EBD8]/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Completeness */}
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4">
                <p className="text-xs text-slate-400 mb-2">知识完整度</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#E7E0D3] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#D4AF37] rounded-full transition-all duration-500" 
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#D4AF37]">{completeness}%</span>
                </div>
              </div>

              {/* Sync Buttons */}
              {completeness >= 30 && (
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-3 space-y-2">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider px-1">同步到</p>
                  <button
                    onClick={handleSyncMarketing}
                    disabled={isSyncingMarketing}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[#0B1220] text-[#D4AF37] rounded-lg text-xs font-medium hover:bg-[#0B1220]/90 transition-colors disabled:opacity-50"
                  >
                    {isSyncingMarketing ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                    营销系统
                    <ArrowRight size={10} className="ml-auto" />
                  </button>
                  <button
                    onClick={handleSyncRadar}
                    disabled={isSyncingRadar}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[#0B1220] text-emerald-400 rounded-lg text-xs font-medium hover:bg-[#0B1220]/90 transition-colors disabled:opacity-50"
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
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-3 flex items-center gap-3">
                  <Lock className="text-[#D4AF37] shrink-0" size={16} />
                  <p className="text-xs text-[#0B1B2B]">此版本已批准，内容已锁定。如需修改请在协作面板中创建新版本。</p>
                </div>
              )}

              {/* Company Header */}
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/80 rounded-xl flex items-center justify-center">
                    <Building2 size={24} className="text-[#0B1B2B]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-[#0B1220]">{profile.companyName}</h2>
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
                      className="w-full p-4 bg-[#F0EBD8] border border-[#D4AF37] rounded-xl text-sm text-slate-700 leading-relaxed resize-none focus:outline-none"
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-slate-500 rounded-lg border border-slate-200">
                        取消
                      </button>
                      <button onClick={saveEdit} disabled={isSaving} className="px-3 py-1.5 text-xs text-[#0B1220] bg-[#D4AF37] rounded-lg disabled:opacity-50">
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isReadOnly && startEditing('companyIntro')}
                    className={`p-4 bg-[#F0EBD8] rounded-xl ${!isReadOnly ? 'cursor-pointer hover:ring-2 hover:ring-[#D4AF37]/20' : ''} transition-all group relative ${getSectionHighlightClass('companyIntro')}`}
                  >
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {profile.companyIntro || '点击编辑企业简介...'}
                    </p>
                    {!isReadOnly && <Pencil size={14} className="absolute top-3 right-3 text-slate-300 opacity-0 group-hover:opacity-100" />}
                  </div>
                )}
              </div>

              {/* Profile Sections Grid */}
              <div className="grid grid-cols-2 gap-4">
                {PROFILE_SECTIONS.filter(s => s.key !== 'companyIntro').map((section) => {
                  const SectionIcon = section.icon;
                  const isEditing = editingSection === section.key;
                  const value = profile[section.key as keyof CompanyProfileData];
                  const items = Array.isArray(value) ? value : [];

                  return (
                    <div 
                      key={section.key} 
                      className={`bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4 group relative ${getSectionHighlightClass(section.key)}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <SectionIcon size={16} className="text-[#D4AF37]" />
                        <h4 className="font-bold text-[#0B1220] text-sm flex-1">{section.label}</h4>
                        {!isEditing && !isReadOnly && (
                          <button
                            onClick={() => startEditing(section.key)}
                            className="p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-[#D4AF37] transition-all"
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
                            className="w-full p-3 bg-[#F0EBD8] border border-[#D4AF37] rounded-lg text-xs font-mono resize-none focus:outline-none"
                            rows={6}
                            placeholder="JSON 数组格式"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={cancelEdit} className="px-2.5 py-1 text-[11px] text-slate-500 rounded border border-slate-200">取消</button>
                            <button onClick={saveEdit} disabled={isSaving} className="px-2.5 py-1 text-[11px] text-[#0B1220] bg-[#D4AF37] rounded disabled:opacity-50">
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
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
                <h3 className="font-bold text-[#0B1220] mb-4 flex items-center gap-2">
                  <Users size={18} className="text-[#D4AF37]" />
                  目标客户画像 (ICP)
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-[#F0EBD8] rounded-xl">
                    <p className="text-xs text-slate-500 mb-2">目标行业</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.targetIndustries?.length > 0 ? (
                        profile.targetIndustries.map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-[#FFFCF7] text-xs text-[#0B1220] rounded border border-[#E8E0D0]">{item}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">暂无数据</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F0EBD8] rounded-xl">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Globe2 size={12} />目标区域
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.targetRegions?.length > 0 ? (
                        profile.targetRegions.map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-[#FFFCF7] text-xs text-[#0B1220] rounded border border-[#E8E0D0]">{item}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">暂无数据</span>
                      )}
                    </div>
                  </div>
                </div>

                {profile.buyerPersonas?.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {profile.buyerPersonas.map((persona, i) => (
                      <div key={i} className="p-3 border border-[#E8E0D0] rounded-xl bg-[#FFFCF7]">
                        <p className="font-medium text-[#0B1220] text-sm">{persona.role}</p>
                        {persona.title && <p className="text-xs text-slate-500">{persona.title}</p>}
                        {persona.concerns?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {persona.concerns.map((concern, j) => (
                              <span key={j} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded">{concern}</span>
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
      </div>
    </div>
  );
}
