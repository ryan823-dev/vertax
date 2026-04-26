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
  Clock,
  Layers,
  CheckCircle2,
  History,
  Pencil,
  Save,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { 
  getLatestTopicCluster, 
  getArtifactVersionHistory,
  syncMarketingFromKnowledge,
} from '@/actions/sync';
import { updateVersionContent } from '@/actions/versions';
import { getGrowthPipelineStatus } from '@/actions/growth-pipeline';
import { CollaborativeShell } from '@/components/collaboration';
import { GrowthHeader, GrowthSecretaryPanel } from '@/components/marketing/growth-header';
import { TopicClusterStarter } from '@/components/marketing/topic-cluster-starter';
import { toast } from 'sonner';
import type { GrowthPipelineStatus } from '@/lib/marketing/growth-pipeline';
import type { TopicClusterContent } from '@/lib/marketing/topic-cluster';

// Content type badge colors
const CONTENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  BuyingGuide: { bg: 'bg-blue-50', text: 'text-blue-600' },
  Whitepaper: { bg: 'bg-purple-50', text: 'text-purple-600' },
  FAQ: { bg: 'bg-amber-50', text: 'text-amber-600' },
  QnA: { bg: 'bg-teal-50', text: 'text-teal-600' },
  KnowledgeBase: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Comparison: { bg: 'bg-rose-50', text: 'text-rose-600' },
  UseCasePage: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  CaseStudy: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  TechnicalDoc: { bg: 'bg-slate-100', text: 'text-slate-700' },
  Checklist: { bg: 'bg-lime-50', text: 'text-lime-700' },
};

// Funnel badge colors
const FUNNEL_COLORS: Record<string, { bg: string; text: string }> = {
  TOFU: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  MOFU: { bg: 'bg-amber-100', text: 'text-amber-700' },
  BOFU: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

const CONTENT_TYPES = ['BuyingGuide', 'Whitepaper', 'FAQ', 'QnA', 'KnowledgeBase', 'Comparison', 'UseCasePage', 'CaseStudy', 'TechnicalDoc', 'Checklist'];
const FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'];
const INTENT_TYPES = ['informational', 'commercial', 'transactional', 'navigational'];

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

export default function TopicClustersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<VersionData | null>(null);
  const [versions, setVersions] = useState<Array<{
    id: string;
    version: number;
    status: string;
    createdAt: Date;
    createdBy: string | null;
  }>>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(0);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<TopicClusterContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // CollaborativeShell
  const [showShell, setShowShell] = useState(false);

  // 流水线状态
  const [pipelineStatus, setPipelineStatus] = useState<GrowthPipelineStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // pipeline 是否加载完毕（不论成功失败）
  const [pipelineLoaded, setPipelineLoaded] = useState(false);

  // 加载流水线状态
  const loadPipelineStatus = useCallback(async () => {
    try {
      const status = await getGrowthPipelineStatus();
      setPipelineStatus(status);
    } catch (err) {
      console.error('Failed to load pipeline status:', err);
    } finally {
      setPipelineLoaded(true);
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [latest, history] = await Promise.all([
        getLatestTopicCluster(),
        getArtifactVersionHistory('TopicCluster', 10),
        loadPipelineStatus(),
      ]);
      setCurrentVersion(latest as VersionData | null);
      setVersions(history);
      setEditData(null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [loadPipelineStatus]);

  // 刷新流水线状态
  const handleRefreshPipeline = async () => {
    setIsRefreshing(true);
    await loadPipelineStatus();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 重新生成
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

  // 进入编辑模式
  const enterEditMode = () => {
    if (!currentVersion?.content) return;
    setEditData(JSON.parse(JSON.stringify(currentVersion.content)));
    setIsEditing(true);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditData(null);
    setIsEditing(false);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!currentVersion || !editData) return;
    
    setIsSaving(true);
    try {
      await updateVersionContent(currentVersion.id, editData as unknown as Record<string, unknown>, '手动编辑 TopicCluster');
      toast.success('保存成功');
      loadData();
    } catch (err) {
      toast.error('保存失败', { description: err instanceof Error ? err.message : '未知错误' });
    } finally {
      setIsSaving(false);
    }
  };

  // 更新 cluster name
  const updateClusterName = (value: string) => {
    if (!editData) return;
    setEditData({
      ...editData,
      topicCluster: {
        ...editData.topicCluster,
        name: value,
      },
    });
  };

  // 更新 pillar
  const updatePillar = (clusterIdx: number, field: 'pillar' | 'intent', value: string) => {
    if (!editData) return;
    const clusters = [...editData.topicCluster.clusters];
    clusters[clusterIdx] = {
      ...clusters[clusterIdx],
      [field]: value,
      ...(field === 'pillar' ? { clusterName: value } : {}),
    };
    setEditData({
      ...editData,
      topicCluster: { ...editData.topicCluster, clusters },
    });
  };

  // 更新 contentMap item
  const updateContentMapItem = (
    clusterIdx: number,
    itemIdx: number,
    field: 'type' | 'title' | 'briefGoal' | 'funnel' | 'intent',
    value: string
  ) => {
    if (!editData) return;
    const clusters = [...editData.topicCluster.clusters];
    const contentMap = [...clusters[clusterIdx].contentMap];
    contentMap[itemIdx] = { ...contentMap[itemIdx], [field]: value };
    clusters[clusterIdx] = { ...clusters[clusterIdx], contentMap };
    setEditData({
      ...editData,
      topicCluster: { ...editData.topicCluster, clusters },
    });
  };

  // 添加 content item
  const addContentItem = (clusterIdx: number) => {
    if (!editData) return;
    const clusters = [...editData.topicCluster.clusters];
    clusters[clusterIdx].contentMap.push({
      type: 'BuyingGuide',
      title: '新内容标题',
      briefGoal: '内容目标描述',
      funnel: 'TOFU',
      intent: 'informational',
      mustUseEvidenceIds: [],
      suggestedDistributionTargets: [],
    });
    setEditData({
      ...editData,
      topicCluster: { ...editData.topicCluster, clusters },
    });
  };

  // 删除 content item
  const removeContentItem = (clusterIdx: number, itemIdx: number) => {
    if (!editData) return;
    const clusters = [...editData.topicCluster.clusters];
    clusters[clusterIdx].contentMap.splice(itemIdx, 1);
    setEditData({
      ...editData,
      topicCluster: { ...editData.topicCluster, clusters },
    });
  };

  // 添加 cluster
  const addCluster = () => {
    if (!editData) return;
    const clusters = [...editData.topicCluster.clusters];
    clusters.push({
      pillar: '新支柱主题',
      clusterName: '新支柱主题',
      intent: 'informational',
      coreKeywords: [],
      longTailKeywords: [],
      aeoQuestions: [],
      commercialKeywords: [],
      negatives: [],
      targetRoles: [],
      questionMap: [],
      primaryPublishTarget: '客户官网（API直发）',
      suggestedDistributionTargets: [],
      contentMap: [],
      requiredEvidenceIds: [],
    });
    setEditData({
      ...editData,
      topicCluster: { ...editData.topicCluster, clusters },
    });
  };

  // 删除 cluster
  const removeCluster = (clusterIdx: number) => {
    if (!editData || editData.topicCluster.clusters.length <= 1) return;
    const clusters = [...editData.topicCluster.clusters];
    clusters.splice(clusterIdx, 1);
    setEditData({
      ...editData,
      topicCluster: { ...editData.topicCluster, clusters },
    });
  };

  const topicCluster = isEditing ? editData?.topicCluster : currentVersion?.content?.topicCluster;
  const displayContent = isEditing ? editData : currentVersion?.content;
  const hasTopicCluster = !!topicCluster;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
      </div>
    );
  }

  // 如果没有 TopicCluster，显示启动向导（即使 pipeline 加载失败也显示）
  if (!hasTopicCluster && pipelineLoaded) {
    return (
      <div className="min-h-screen bg-[var(--ci-bg)]">
        {/* Growth Header - 只在 pipeline 数据可用时显示 */}
        {pipelineStatus && (
          <GrowthHeader
            title="内容增长工作台"
            description="主题集群 · 构建 TOFU → MOFU → BOFU 全漏斗内容规划"
            steps={pipelineStatus.steps}
            counts={pipelineStatus.counts}
            currentStep={pipelineStatus.currentStep}
            primaryCTA={pipelineStatus.primaryCTA}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshPipeline}
          />
        )}
        
        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}
        
        {/* 启动向导 */}
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <TopicClusterStarter 
            counts={pipelineStatus?.counts} 
            onSuccess={() => {
              loadData();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ci-bg)]">
      {/* Growth Header - 有数据时显示 */}
      {pipelineStatus && (
        <GrowthHeader
          title="内容增长工作台"
          description="主题集群 · 构建 TOFU → MOFU → BOFU 全漏斗内容规划"
          steps={pipelineStatus.steps}
          counts={pipelineStatus.counts}
          currentStep={pipelineStatus.currentStep}
          primaryCTA={pipelineStatus.primaryCTA}
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshPipeline}
        />
      )}
      
      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row">
        {/* Main Content */}
        <div className={`flex-1 space-y-6 ${showShell ? 'lg:max-w-[calc(100%-600px)]' : ''}`}>
          {/* 操作工具栏 - 深蓝舞台风格 */}
          <div className="rounded-xl overflow-hidden" style={{
            background: 'var(--ci-sidebar-shell)',
            boxShadow: 'var(--ci-shadow-soft)',
          }}>
            <div className="absolute inset-x-0 top-0 h-0 pointer-events-none" style={{
              background: 'transparent',
            }} />
            <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              {currentVersion && !isEditing && (
                <>
                  <button
                    onClick={() => setShowShell(!showShell)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      showShell 
                        ? 'bg-[var(--ci-accent)] text-white'
                        : 'text-slate-400 hover:text-[var(--ci-accent)]'
                    }`}
                  >
                    协作
                  </button>
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-[var(--ci-accent)] transition-colors rounded-lg"
                  >
                    <History size={14} />
                    v{currentVersion.version}
                  </button>
                  <button
                    onClick={enterEditMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-[var(--ci-accent)] transition-colors rounded-lg"
                  >
                    <Pencil size={14} />
                    编辑
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    保存
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRegenerate}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
                  >
                    {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    重新生成
                  </button>
                  <button 
                    onClick={loadData}
                    className="p-1.5 text-slate-400 hover:text-[var(--ci-accent)] transition-colors"
                    title="刷新数据"
                  >
                    <RefreshCw size={14} />
                  </button>
                </>
              )}
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

          {/* Version History Panel */}
          {showVersionHistory && versions.length > 0 && !isEditing && (
            <div className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] p-4">
              <h3 className="text-sm font-bold text-[#0B1B2B] mb-3 flex items-center gap-2">
                <History size={14} className="text-[var(--ci-accent)]" />
                版本历史
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    className={`shrink-0 px-3 py-2 rounded-lg border text-xs transition-all ${
                      currentVersion?.id === v.id
                        ? 'border-[var(--ci-accent)] bg-[var(--ci-accent)]/10 text-[#0B1B2B]'
                        : 'border-[var(--ci-border)] hover:border-[var(--ci-accent)]/50 text-slate-500'
                    }`}
                  >
                    <div className="font-medium">v{v.version}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {topicCluster && (
            <>
              {/* Topic Cluster Header */}
              <div className="bg-[var(--ci-sidebar-shell)] rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={topicCluster.name}
                        onChange={(e) => updateClusterName(e.target.value)}
                        className="text-xl font-bold bg-white/10 border border-white/20 rounded-lg px-3 py-1 w-full max-w-md focus:outline-none focus:border-[var(--ci-accent)]"
                      />
                    ) : (
                      <h2 className="text-xl font-bold">{topicCluster.name}</h2>
                    )}
                    <p className="text-sm text-slate-400 mt-1">
                      {topicCluster.clusters?.length || 0} 个内容支柱 · 
                      {topicCluster.clusters?.reduce((acc, c) => acc + (c.contentMap?.length || 0), 0) || 0} 个内容规划
                    </p>
                  </div>
                  {displayContent?.confidence !== undefined && (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">置信度</div>
                      <div className="text-2xl font-bold text-[var(--ci-accent)]">
                        {Math.round((displayContent.confidence || 0) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Open Questions */}
              {displayContent?.openQuestions && displayContent.openQuestions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <HelpCircle size={14} />
                    待确认问题 ({displayContent.openQuestions.length})
                  </h4>
                  <ul className="space-y-1">
                    {displayContent.openQuestions.map((q, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(topicCluster.customerUnderstanding.length > 0 ||
                topicCluster.buyerUnderstanding.length > 0 ||
                topicCluster.questionDirections.length > 0 ||
                topicCluster.publishingDirections.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {topicCluster.customerUnderstanding.length > 0 && (
                    <div className="bg-white rounded-xl border border-[var(--ci-border)] p-4">
                      <h4 className="text-sm font-semibold text-[#0B1B2B] mb-2">客户认知</h4>
                      <ul className="space-y-1">
                        {topicCluster.customerUnderstanding.map((item, index) => (
                          <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="text-[var(--ci-accent)]">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {topicCluster.buyerUnderstanding.length > 0 && (
                    <div className="bg-white rounded-xl border border-[var(--ci-border)] p-4">
                      <h4 className="text-sm font-semibold text-[#0B1B2B] mb-2">目标买家认知</h4>
                      <ul className="space-y-1">
                        {topicCluster.buyerUnderstanding.map((item, index) => (
                          <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="text-[var(--ci-accent)]">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {topicCluster.questionDirections.length > 0 && (
                    <div className="bg-white rounded-xl border border-[var(--ci-border)] p-4 md:col-span-2">
                      <h4 className="text-sm font-semibold text-[#0B1B2B] mb-3">全局问题地图</h4>
                      <div className="grid gap-2">
                        {topicCluster.questionDirections.slice(0, 6).map((item, index) => (
                          <div key={index} className="rounded-lg border border-[var(--ci-surface-muted)] bg-[#FFFFFF] px-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {item.stage && (
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${FUNNEL_COLORS[item.stage].bg} ${FUNNEL_COLORS[item.stage].text}`}>
                                  {item.stage}
                                </span>
                              )}
                              {(item.role || item.persona) && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                  {item.role || item.persona}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#0B1B2B] font-medium">{item.question}</p>
                            {item.whyThisQuestion && (
                              <p className="text-xs text-slate-500 mt-1">{item.whyThisQuestion}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {topicCluster.publishingDirections.length > 0 && (
                    <div className="bg-white rounded-xl border border-[var(--ci-border)] p-4 md:col-span-2">
                      <h4 className="text-sm font-semibold text-[#0B1B2B] mb-3">建议发布方向</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {topicCluster.publishingDirections.map((item, index) => (
                          <div key={index} className="rounded-lg border border-[var(--ci-surface-muted)] bg-[#FFFFFF] p-3">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-medium text-[#0B1B2B]">{item.channel}</p>
                              <span className={`px-2 py-0.5 text-[10px] rounded-full ${item.mode === 'integrated' ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--ci-accent)]/10 text-[var(--ci-accent-strong)]'}`}>
                                {item.mode === 'integrated' ? '可执行主发布' : '建议分发'}
                              </span>
                            </div>
                            {item.purpose && (
                              <p className="text-xs text-slate-500 mt-1">{item.purpose}</p>
                            )}
                            {item.reason && (
                              <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                            )}
                            {item.contentTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.contentTypes.map((type) => (
                                  <span key={type} className="px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add Cluster Button (Edit Mode) */}
              {isEditing && (
                <button
                  onClick={addCluster}
                  className="w-full p-3 border-2 border-dashed border-[var(--ci-border)] rounded-xl text-slate-400 hover:border-[var(--ci-accent)] hover:text-[var(--ci-accent)] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  添加内容支柱
                </button>
              )}

              {/* Clusters */}
              <div className="space-y-4">
                {topicCluster.clusters?.map((cluster, idx) => (
                  <div 
                    key={idx}
                    className="bg-[var(--ci-surface-strong)] rounded-xl border border-[var(--ci-border)] overflow-hidden"
                  >
                    {/* Cluster Header */}
                    <div className="flex items-center p-5 hover:bg-[var(--ci-surface-muted)] transition-colors">
                      {isEditing && (
                        <div className="mr-3 text-slate-300 cursor-move">
                          <GripVertical size={16} />
                        </div>
                      )}
                      <button
                        onClick={() => setExpandedCluster(expandedCluster === idx ? null : idx)}
                        className="flex-1 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[var(--ci-accent-soft)] rounded-xl flex items-center justify-center">
                            <Layers size={18} className="text-[#0B1B2B]" />
                          </div>
                          <div className="text-left">
                            {isEditing ? (
                              <input
                                type="text"
                                value={cluster.pillar}
                                onChange={(e) => updatePillar(idx, 'pillar', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-[#0B1B2B] bg-transparent border-b border-transparent hover:border-[var(--ci-accent)] focus:border-[var(--ci-accent)] focus:outline-none"
                              />
                            ) : (
                              <h3 className="font-bold text-[#0B1B2B]">{cluster.pillar}</h3>
                            )}
                            <p className="text-xs text-slate-500 mt-0.5">
                              {cluster.intent} · {cluster.contentMap?.length || 0} 个内容
                            </p>
                          </div>
                        </div>
                        <ChevronRight 
                          size={20} 
                          className={`text-slate-400 transition-transform ${expandedCluster === idx ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {isEditing && topicCluster.clusters.length > 1 && (
                        <button
                          onClick={() => removeCluster(idx)}
                          className="ml-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Cluster Content Map */}
                    {expandedCluster === idx && cluster.contentMap && (
                      <div className="border-t border-[var(--ci-border)] p-5">
                        {(cluster.questionMap.length > 0 ||
                          Boolean(cluster.primaryPublishTarget) ||
                          cluster.suggestedDistributionTargets.length > 0 ||
                          cluster.targetRoles.length > 0) && (
                          <div className="grid gap-3 md:grid-cols-2 mb-4">
                            {cluster.questionMap.length > 0 && (
                              <div className="rounded-xl border border-[var(--ci-border)] bg-white p-4 md:col-span-2">
                                <h4 className="text-sm font-semibold text-[#0B1B2B] mb-2">此支柱重点回答的问题</h4>
                                <div className="grid gap-2">
                                  {cluster.questionMap.slice(0, 5).map((question, questionIdx) => (
                                    <div key={questionIdx} className="rounded-lg bg-[#FFFFFF] border border-[var(--ci-surface-muted)] px-3 py-2">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        {question.stage && (
                                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${FUNNEL_COLORS[question.stage].bg} ${FUNNEL_COLORS[question.stage].text}`}>
                                            {question.stage}
                                          </span>
                                        )}
                                        {(question.role || question.persona) && (
                                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                            {question.role || question.persona}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-[#0B1B2B] font-medium">{question.question}</p>
                                      {question.whyThisQuestion && (
                                        <p className="text-xs text-slate-500 mt-1">{question.whyThisQuestion}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {cluster.targetRoles.length > 0 && (
                              <div className="rounded-xl border border-[var(--ci-border)] bg-white p-4">
                                <h4 className="text-sm font-semibold text-[#0B1B2B] mb-2">优先服务角色</h4>
                                <div className="flex flex-wrap gap-2">
                                  {cluster.targetRoles.map((role) => (
                                    <span key={role} className="px-2 py-1 text-[11px] rounded-full bg-slate-100 text-slate-600">
                                      {role}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(cluster.primaryPublishTarget ||
                              cluster.suggestedDistributionTargets.length > 0) && (
                              <div className="rounded-xl border border-[var(--ci-border)] bg-white p-4">
                                <h4 className="text-sm font-semibold text-[#0B1B2B] mb-2">发布方式</h4>
                                {cluster.primaryPublishTarget && (
                                  <div className="mb-2">
                                    <p className="text-[11px] text-slate-500 mb-1">主发布渠道</p>
                                    <span className="px-2 py-1 text-[11px] rounded-full bg-emerald-50 text-emerald-700">
                                      {cluster.primaryPublishTarget}
                                    </span>
                                  </div>
                                )}
                                {cluster.suggestedDistributionTargets.length > 0 && (
                                  <div>
                                    <p className="text-[11px] text-slate-500 mb-1">建议分发方向</p>
                                    <div className="flex flex-wrap gap-2">
                                      {cluster.suggestedDistributionTargets.map((target) => (
                                        <span key={target} className="px-2 py-1 text-[11px] rounded-full bg-[var(--ci-accent)]/10 text-[var(--ci-accent-strong)]">
                                          {target}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid gap-3">
                          {cluster.contentMap.map((item, itemIdx) => {
                            const typeColor = CONTENT_TYPE_COLORS[item.type] || { bg: 'bg-[var(--ci-surface-strong)]', text: 'text-slate-600' };
                            const funnelColor = FUNNEL_COLORS[item.funnel] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                            
                            return (
                              <div 
                                key={itemIdx}
                                className={`flex items-start gap-4 p-4 bg-[#FFFFFF] rounded-xl border border-[var(--ci-border)] ${isEditing ? '' : 'hover:border-[var(--ci-accent)]/30'} transition-colors`}
                              >
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
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <select
                                          value={item.type}
                                          onChange={(e) => updateContentMapItem(idx, itemIdx, 'type', e.target.value)}
                                          className="px-2 py-0.5 text-[10px] font-medium rounded border border-[var(--ci-border)] bg-[#FFFFFF]"
                                        >
                                          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <select
                                          value={item.funnel}
                                          onChange={(e) => updateContentMapItem(idx, itemIdx, 'funnel', e.target.value)}
                                          className="px-2 py-0.5 text-[10px] font-medium rounded border border-[var(--ci-border)] bg-[#FFFFFF]"
                                        >
                                          {FUNNEL_STAGES.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        <select
                                          value={item.intent}
                                          onChange={(e) => updateContentMapItem(idx, itemIdx, 'intent', e.target.value)}
                                          className="px-2 py-0.5 text-[10px] font-medium rounded border border-[var(--ci-border)] bg-[#FFFFFF]"
                                        >
                                          {INTENT_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                      </div>
                                      <input
                                        type="text"
                                        value={item.title}
                                        onChange={(e) => updateContentMapItem(idx, itemIdx, 'title', e.target.value)}
                                        className="w-full font-medium text-[#0B1B2B] text-sm bg-transparent border-b border-slate-200 focus:border-[var(--ci-accent)] focus:outline-none"
                                        placeholder="内容标题"
                                      />
                                      <textarea
                                        value={item.briefGoal}
                                        onChange={(e) => updateContentMapItem(idx, itemIdx, 'briefGoal', e.target.value)}
                                        className="w-full text-xs text-slate-500 bg-transparent border border-slate-200 rounded p-2 focus:border-[var(--ci-accent)] focus:outline-none resize-none"
                                        rows={2}
                                        placeholder="内容目标描述"
                                      />
                                    </div>
                                  ) : (
                                    <>
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
                                      <p className="text-xs text-slate-500 mt-1">{item.briefGoal}</p>
                                      {(item.targetRole || item.targetQuestion) && (
                                        <div className="mt-2 space-y-1">
                                          {item.targetRole && (
                                            <p className="text-[10px] text-slate-500">面向角色：{item.targetRole}</p>
                                          )}
                                          {item.targetQuestion && (
                                            <p className="text-[10px] text-slate-500">优先回答：{item.targetQuestion}</p>
                                          )}
                                        </div>
                                      )}
                                      {item.mustUseEvidenceIds?.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2">
                                          <CheckCircle2 size={10} className="text-emerald-500" />
                                          <span className="text-[10px] text-slate-400">
                                            引用 {item.mustUseEvidenceIds.length} 条证据
                                          </span>
                                        </div>
                                      )}
                                      {item.primaryPublishTarget && (
                                        <p className="text-[10px] text-emerald-700 mt-2">
                                          主发布：{item.primaryPublishTarget}
                                        </p>
                                      )}
                                      {item.suggestedDistributionTargets.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {item.suggestedDistributionTargets.map((target) => (
                                            <span key={target} className="px-2 py-0.5 text-[10px] rounded bg-[var(--ci-accent)]/10 text-[var(--ci-accent-strong)]">
                                              {target}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {isEditing ? (
                                  <button
                                    onClick={() => removeContentItem(idx, itemIdx)}
                                    className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <Link
                                    href="/customer/marketing/strategy"
                                    className="shrink-0 px-3 py-1.5 text-xs text-[var(--ci-accent)] hover:bg-[var(--ci-accent)]/10 rounded-lg transition-colors"
                                  >
                                    生成内容
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Add Content Item Button */}
                          {isEditing && (
                            <button
                              onClick={() => addContentItem(idx)}
                              className="p-3 border-2 border-dashed border-[var(--ci-border)] rounded-xl text-slate-400 hover:border-[var(--ci-accent)] hover:text-[var(--ci-accent)] transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              添加内容项
                            </button>
                          )}
                        </div>

                        {/* Required Evidence */}
                        {cluster.requiredEvidenceIds?.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[var(--ci-border)]">
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              此支柱需要 {cluster.requiredEvidenceIds.length} 条证据支撑
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Meta Info */}
              {currentVersion && !isEditing && (
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-4">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(currentVersion.createdAt).toLocaleString('zh-CN')}
                  </span>
                  {currentVersion.createdBy && (
                    <span>由 {currentVersion.createdBy} 生成</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar: Secretary Panel + CollaborativeShell */}
        <div className="w-80 shrink-0 space-y-4">
          {/* 秘书催办栏 */}
          {pipelineStatus && !isEditing && (
            <GrowthSecretaryPanel counts={pipelineStatus.counts} />
          )}
          
          {/* CollaborativeShell */}
          {showShell && currentVersion && (
            <CollaborativeShell
              entityType="TopicCluster"
              entityId={currentVersion.entityId}
              versionId={currentVersion.id}
              anchorType="jsonPath"
              variant="light"
              className="sticky top-4"
              onVersionChange={(verId) => {
                console.log('Version changed:', verId);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
