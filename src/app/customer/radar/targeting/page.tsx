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
  Users,
  Building2,
  Globe2,
  Briefcase,
  Cpu,
  Zap,
  MapPin,
  Search,
  Clock,
  History,
  ArrowLeft,
  CheckCircle2,
  Radar,
  Map,
  Newspaper,
  HelpCircle,
  Pencil,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import { 
  getLatestTargetingSpec, 
  getLatestChannelMap,
  getArtifactVersionHistory,
} from '@/actions/sync';
import { updateVersionContent } from '@/actions/versions';
import { CollaborativeShell } from '@/components/collaboration';
import { toast } from 'sonner';

// Channel type icons and colors
const CHANNEL_CONFIG: Record<string, { icon: typeof Search; bg: string; text: string }> = {
  maps: { icon: MapPin, bg: 'bg-blue-50', text: 'text-blue-600' },
  tender: { icon: Newspaper, bg: 'bg-amber-50', text: 'text-amber-600' },
  search: { icon: Search, bg: 'bg-purple-50', text: 'text-purple-600' },
  directory: { icon: Building2, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  tradeshow: { icon: Users, bg: 'bg-rose-50', text: 'text-rose-600' },
  hiring: { icon: Briefcase, bg: 'bg-indigo-50', text: 'text-indigo-600' },
  ecosystem: { icon: Globe2, bg: 'bg-teal-50', text: 'text-teal-600' },
  linkedin: { icon: Users, bg: 'bg-sky-50', text: 'text-sky-600' },
  association: { icon: Building2, bg: 'bg-orange-50', text: 'text-orange-600' },
};

const CHANNEL_TYPES = ['maps', 'tender', 'search', 'directory', 'tradeshow', 'hiring', 'ecosystem', 'linkedin', 'association'];
const INFLUENCE_TYPES = ['decision_maker', 'champion', 'influencer', 'blocker', 'user'];

interface FirmographicData {
  industries: string[];
  countries: string[];
  companySize: { min?: number; max?: number; label?: string };
  exclude: string[];
}

interface TechnographicData {
  keywords: string[];
  standards: string[];
  systems: string[];
  exclude: string[];
}

interface TriggerData {
  name: string;
  signals: string[];
  whereToObserve: string[];
  confidence: number;
}

interface DecisionUnitData {
  role: string;
  influence: string;
}

interface ExclusionRuleData {
  rule: string;
  why: string;
}

interface SegmentationData {
  firmographic: FirmographicData;
  technographic: TechnographicData;
  useCases: Array<{ name: string; signals: string[]; excludeSignals: string[] }>;
  triggers: TriggerData[];
  decisionUnit: DecisionUnitData[];
  exclusionRules: ExclusionRuleData[];
}

interface TargetingSpecContent {
  targetingSpec: {
    icpName: string;
    segmentation: SegmentationData;
    evidenceUsed: string[];
  };
  openQuestions?: string[];
  confidence?: number;
}

interface ChannelData {
  channelType: string;
  name: string;
  priority: number;
  discoveryMethod: {
    searchQueries: string[];
    filters?: Record<string, unknown>;
    signalsToLookFor: string[];
    captureSchema?: string[];
    apiEndpoint?: string;
    rateLimit?: string;
  };
  evidenceIds: string[];
}

interface ChannelMapContent {
  channelMap: {
    personaName: string;
    channels: ChannelData[];
  };
  openQuestions?: string[];
  confidence?: number;
}

interface VersionData<T> {
  id: string;
  entityId: string;
  version: number;
  status: string;
  content: T;
  meta: Record<string, unknown>;
  createdAt: Date;
  createdBy: string | null;
}

export default function TargetingSpecPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetingSpec, setTargetingSpec] = useState<VersionData<TargetingSpecContent> | null>(null);
  const [channelMap, setChannelMap] = useState<VersionData<ChannelMapContent> | null>(null);
  const [versions, setVersions] = useState<Array<{
    id: string;
    version: number;
    status: string;
    createdAt: Date;
    createdBy: string | null;
  }>>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'targeting' | 'channels'>('targeting');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetingData, setEditTargetingData] = useState<TargetingSpecContent | null>(null);
  const [editChannelData, setEditChannelData] = useState<ChannelMapContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // CollaborativeShell
  const [showShell, setShowShell] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [spec, channels, history] = await Promise.all([
        getLatestTargetingSpec(),
        getLatestChannelMap(),
        getArtifactVersionHistory('TargetingSpec', 10),
      ]);
      setTargetingSpec(spec as VersionData<TargetingSpecContent> | null);
      setChannelMap(channels as VersionData<ChannelMapContent> | null);
      setVersions(history);
      setEditTargetingData(null);
      setEditChannelData(null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 重新生成 - 通过 Route Handler 绕过 Server Action 10s 限制和 Skill 系统
  const handleRegenerate = async () => {
    setIsSyncing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      
      const res = await fetch('/api/radar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const result = await res.json() as { success?: boolean; error?: string; targetingSpecVersionId?: string; channelMapVersionId?: string };
      if (result.success) {
        toast.success('同步成功', { 
          description: '已从知识引擎生成 TargetingSpec 和 ChannelMap',
          duration: 4000,
        });
        // 自动刷新数据
        await loadData();
      } else {
        toast.error('同步失败', { description: result.error });
      }
    } catch (err) {
      const errMsg = err instanceof Error && err.name === 'AbortError'
        ? '请求超时，AI分析时间过长'
        : (err instanceof Error ? err.message : '未知错误');
      toast.error('同步失败', { description: errMsg });
    } finally {
      setIsSyncing(false);
    }
  };

  // 进入编辑模式
  const enterEditMode = () => {
    if (activeTab === 'targeting' && targetingSpec?.content) {
      setEditTargetingData(JSON.parse(JSON.stringify(targetingSpec.content)));
    } else if (activeTab === 'channels' && channelMap?.content) {
      setEditChannelData(JSON.parse(JSON.stringify(channelMap.content)));
    }
    setIsEditing(true);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditTargetingData(null);
    setEditChannelData(null);
    setIsEditing(false);
  };

  // 保存编辑
  const saveEdit = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'targeting' && targetingSpec && editTargetingData) {
        await updateVersionContent(targetingSpec.id, editTargetingData as unknown as Record<string, unknown>, '手动编辑 TargetingSpec');
      } else if (activeTab === 'channels' && channelMap && editChannelData) {
        await updateVersionContent(channelMap.id, editChannelData as unknown as Record<string, unknown>, '手动编辑 ChannelMap');
      }
      toast.success('保存成功');
      loadData();
    } catch (err) {
      toast.error('保存失败', { description: err instanceof Error ? err.message : '未知错误' });
    } finally {
      setIsSaving(false);
    }
  };

  // Targeting Spec 编辑函数
  const updateIcpName = (value: string) => {
    if (!editTargetingData) return;
    setEditTargetingData({
      ...editTargetingData,
      targetingSpec: { ...editTargetingData.targetingSpec, icpName: value },
    });
  };

  const updateFirmographic = (field: keyof FirmographicData, value: string) => {
    if (!editTargetingData) return;
    const items = value.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean);
    setEditTargetingData({
      ...editTargetingData,
      targetingSpec: {
        ...editTargetingData.targetingSpec,
        segmentation: {
          ...editTargetingData.targetingSpec.segmentation,
          firmographic: {
            ...editTargetingData.targetingSpec.segmentation.firmographic,
            [field]: items,
          },
        },
      },
    });
  };

  const updateTechnographic = (field: keyof TechnographicData, value: string) => {
    if (!editTargetingData) return;
    const items = value.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean);
    setEditTargetingData({
      ...editTargetingData,
      targetingSpec: {
        ...editTargetingData.targetingSpec,
        segmentation: {
          ...editTargetingData.targetingSpec.segmentation,
          technographic: {
            ...editTargetingData.targetingSpec.segmentation.technographic,
            [field]: items,
          },
        },
      },
    });
  };

  const addDecisionUnit = () => {
    if (!editTargetingData) return;
    const decisionUnit = [...editTargetingData.targetingSpec.segmentation.decisionUnit];
    decisionUnit.push({ role: '新角色', influence: 'influencer' });
    setEditTargetingData({
      ...editTargetingData,
      targetingSpec: {
        ...editTargetingData.targetingSpec,
        segmentation: { ...editTargetingData.targetingSpec.segmentation, decisionUnit },
      },
    });
  };

  const updateDecisionUnit = (idx: number, field: keyof DecisionUnitData, value: string) => {
    if (!editTargetingData) return;
    const decisionUnit = [...editTargetingData.targetingSpec.segmentation.decisionUnit];
    decisionUnit[idx] = { ...decisionUnit[idx], [field]: value };
    setEditTargetingData({
      ...editTargetingData,
      targetingSpec: {
        ...editTargetingData.targetingSpec,
        segmentation: { ...editTargetingData.targetingSpec.segmentation, decisionUnit },
      },
    });
  };

  const removeDecisionUnit = (idx: number) => {
    if (!editTargetingData) return;
    const decisionUnit = [...editTargetingData.targetingSpec.segmentation.decisionUnit];
    decisionUnit.splice(idx, 1);
    setEditTargetingData({
      ...editTargetingData,
      targetingSpec: {
        ...editTargetingData.targetingSpec,
        segmentation: { ...editTargetingData.targetingSpec.segmentation, decisionUnit },
      },
    });
  };

  // Channel Map 编辑函数
  const updateChannelMapPersona = (value: string) => {
    if (!editChannelData) return;
    setEditChannelData({
      ...editChannelData,
      channelMap: { ...editChannelData.channelMap, personaName: value },
    });
  };

  const updateChannel = (idx: number, field: keyof ChannelData, value: string | number) => {
    if (!editChannelData) return;
    const channels = [...editChannelData.channelMap.channels];
    channels[idx] = { ...channels[idx], [field]: value };
    setEditChannelData({
      ...editChannelData,
      channelMap: { ...editChannelData.channelMap, channels },
    });
  };

  const updateChannelQueries = (idx: number, value: string) => {
    if (!editChannelData) return;
    const channels = [...editChannelData.channelMap.channels];
    const queries = value.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean);
    channels[idx] = {
      ...channels[idx],
      discoveryMethod: { ...channels[idx].discoveryMethod, searchQueries: queries },
    };
    setEditChannelData({
      ...editChannelData,
      channelMap: { ...editChannelData.channelMap, channels },
    });
  };

  const addChannel = () => {
    if (!editChannelData) return;
    const channels = [...editChannelData.channelMap.channels];
    channels.push({
      channelType: 'search',
      name: '新渠道',
      priority: channels.length + 1,
      discoveryMethod: { searchQueries: [], signalsToLookFor: [] },
      evidenceIds: [],
    });
    setEditChannelData({
      ...editChannelData,
      channelMap: { ...editChannelData.channelMap, channels },
    });
  };

  const removeChannel = (idx: number) => {
    if (!editChannelData) return;
    const channels = [...editChannelData.channelMap.channels];
    channels.splice(idx, 1);
    setEditChannelData({
      ...editChannelData,
      channelMap: { ...editChannelData.channelMap, channels },
    });
  };

  const spec = isEditing && activeTab === 'targeting' 
    ? editTargetingData?.targetingSpec 
    : targetingSpec?.content?.targetingSpec;
  const channels = isEditing && activeTab === 'channels'
    ? editChannelData?.channelMap
    : channelMap?.content?.channelMap;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className={`flex-1 space-y-6 ${showShell ? 'max-w-[calc(100%-320px)]' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/customer/radar" 
              className="p-2 text-slate-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#0B1B2B]">目标客户画像</h1>
              <p className="text-sm text-slate-500 mt-1">
                确认系统按什么画像找客户，并从知识引擎同步最新结果
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 从知识引擎同步按钮 - 始终可见 */}
            <button
              onClick={handleRegenerate}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors disabled:opacity-50 ${
                isSyncing
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-[#0B1B2B] text-emerald-400 hover:bg-[#10263B]'
              }`}
              title="从知识引擎同步最新目标客户画像"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  同步最新画像
                </>
              )}
            </button>
            
            {(targetingSpec || channelMap) && !isEditing && (
              <>
                <button
                  onClick={() => setShowShell(!showShell)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    showShell 
                      ? 'bg-emerald-500 text-white' 
                      : 'text-slate-500 hover:bg-emerald-50'
                  }`}
                >
                  协作
                </button>
                {targetingSpec && (
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50"
                  >
                    <History size={16} />
                    <span className="text-xs">v{targetingSpec.version}</span>
                  </button>
                )}
                <button
                  onClick={enterEditMode}
                  className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50"
                >
                  <Pencil size={16} />
                  编辑
                </button>
              </>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-emerald-400 rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  保存
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleRegenerate}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-emerald-400 rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  重新生成
                </button>
                <button 
                  onClick={loadData}
                  className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                  title="刷新数据"
                >
                  <RefreshCw size={18} />
                </button>
              </>
            )}
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
          <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4">
            <h3 className="text-sm font-bold text-[#0B1B2B] mb-3 flex items-center gap-2">
              <History size={14} className="text-emerald-500" />
              版本历史
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  className={`shrink-0 px-3 py-2 rounded-lg border text-xs transition-all ${
                    targetingSpec?.id === v.id
                      ? 'border-emerald-400 bg-emerald-100 text-[#0B1B2B]'
                      : 'border-emerald-100 hover:border-emerald-300 text-slate-500'
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

        {/* No Data State */}
        {!spec && !channels ? (
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-12 text-center">
            <Target size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">尚未生成目标客户画像</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              从知识引擎同步目标客户画像，系统会自动生成可执行的客户特征摘要
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRegenerate}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1B2B] text-emerald-400 rounded-xl text-sm font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    同步最新画像
                  </>
                )}
              </button>
              <Link
                href="/customer/knowledge/profiles"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E7E0D3] text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                  前往知识引擎
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#E7E0D3]">
              <button
                onClick={() => { setActiveTab('targeting'); cancelEdit(); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'targeting'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Target size={16} />
                  画像概览
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('channels'); cancelEdit(); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'channels'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Map size={16} />
                  系统推导
                </span>
              </button>
            </div>

            {/* Targeting Spec Tab */}
            {activeTab === 'targeting' && spec && (
              <div className="space-y-6">
                {/* ICP Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={spec.icpName}
                          onChange={(e) => updateIcpName(e.target.value)}
                          className="text-xl font-bold bg-white/10 border border-white/20 rounded-lg px-3 py-1 w-full max-w-md focus:outline-none focus:border-white"
                        />
                      ) : (
                        <h2 className="text-xl font-bold">{spec.icpName}</h2>
                      )}
                      <p className="text-sm text-emerald-100 mt-1">
                        {spec.segmentation?.firmographic?.industries?.length || 0} 个行业 · 
                        {spec.segmentation?.firmographic?.countries?.length || 0} 个地区 · 
                        {spec.segmentation?.triggers?.length || 0} 个触发器
                      </p>
                    </div>
                    {targetingSpec?.content?.confidence !== undefined && (
                      <div className="text-right">
                        <div className="text-[10px] text-emerald-200 uppercase tracking-wider">置信度</div>
                        <div className="text-2xl font-bold">
                          {Math.round((targetingSpec.content.confidence || 0) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Open Questions */}
                {targetingSpec?.content?.openQuestions && targetingSpec.content.openQuestions.length > 0 && !isEditing && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <HelpCircle size={14} />
                      待确认问题 ({targetingSpec.content.openQuestions.length})
                    </h4>
                    <ul className="space-y-1">
                      {targetingSpec.content.openQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Firmographic & Technographic */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-5">
                    <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
                      <Building2 size={16} className="text-emerald-500" />
                      企业画像
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-2">目标行业</p>
                        {isEditing ? (
                          <textarea
                            value={spec.segmentation?.firmographic?.industries?.join(', ') || ''}
                            onChange={(e) => updateFirmographic('industries', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            rows={2}
                            placeholder="用逗号分隔多个行业"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {spec.segmentation?.firmographic?.industries?.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2">目标地区</p>
                        {isEditing ? (
                          <textarea
                            value={spec.segmentation?.firmographic?.countries?.join(', ') || ''}
                            onChange={(e) => updateFirmographic('countries', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            rows={2}
                            placeholder="用逗号分隔多个地区"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {spec.segmentation?.firmographic?.countries?.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded flex items-center gap-1">
                                <Globe2 size={10} />
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-5">
                    <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
                      <Cpu size={16} className="text-purple-500" />
                      技术画像
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-2">技术关键词</p>
                        {isEditing ? (
                          <textarea
                            value={spec.segmentation?.technographic?.keywords?.join(', ') || ''}
                            onChange={(e) => updateTechnographic('keywords', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            rows={2}
                            placeholder="用逗号分隔多个关键词"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {spec.segmentation?.technographic?.keywords?.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {(spec.segmentation?.technographic?.standards?.length > 0 || isEditing) && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2">相关标准</p>
                          {isEditing ? (
                            <textarea
                              value={spec.segmentation?.technographic?.standards?.join(', ') || ''}
                              onChange={(e) => updateTechnographic('standards', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                              rows={2}
                              placeholder="用逗号分隔多个标准"
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {spec.segmentation?.technographic?.standards?.map((item, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded">
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Decision Unit */}
                <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0B1B2B] flex items-center gap-2">
                      <Users size={16} className="text-blue-500" />
                      决策单元
                    </h3>
                    {isEditing && (
                      <button
                        onClick={addDecisionUnit}
                        className="px-3 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} />
                        添加角色
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {spec.segmentation?.decisionUnit?.map((person, i) => (
                      <div key={i} className="px-4 py-3 bg-white rounded-xl border border-[#E7E0D3] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users size={14} className="text-blue-600" />
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={person.role}
                              onChange={(e) => updateDecisionUnit(i, 'role', e.target.value)}
                              className="w-24 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                            />
                            <select
                              value={person.influence}
                              onChange={(e) => updateDecisionUnit(i, 'influence', e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-emerald-500"
                            >
                              {INFLUENCE_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeDecisionUnit(i)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-[#0B1B2B] text-sm">{person.role}</p>
                            <p className={`text-[10px] ${
                              person.influence === 'decision_maker' ? 'text-emerald-600' :
                              person.influence === 'champion' ? 'text-blue-600' :
                              person.influence === 'influencer' ? 'text-amber-600' :
                              'text-slate-500'
                            }`}>
                              {person.influence === 'decision_maker' ? '决策者' :
                               person.influence === 'champion' ? '推动者' :
                               person.influence === 'influencer' ? '影响者' :
                               person.influence === 'blocker' ? '阻碍者' : person.influence}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Triggers (Read-only for now) */}
                {spec.segmentation?.triggers?.length > 0 && !isEditing && (
                  <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-5">
                    <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      购买触发器
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {spec.segmentation.triggers.map((trigger, i) => (
                        <div key={i} className="p-4 bg-white rounded-xl border border-[#E7E0D3]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-[#0B1B2B] text-sm">{trigger.name}</h4>
                            <span className={`px-2 py-0.5 text-[10px] rounded ${
                              trigger.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                              trigger.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {Math.round(trigger.confidence * 100)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] text-slate-400 mb-1">信号</p>
                              <div className="flex flex-wrap gap-1">
                                {trigger.signals?.slice(0, 3).map((s, j) => (
                                  <span key={j} className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Channel Map Tab */}
            {activeTab === 'channels' && channels && (
              <div className="space-y-6">
                {/* Channel Map Header */}
                <div className="bg-gradient-to-r from-[#0B1B2B] to-[#10263B] rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={channels.personaName}
                          onChange={(e) => updateChannelMapPersona(e.target.value)}
                          className="text-xl font-bold bg-white/10 border border-white/20 rounded-lg px-3 py-1 w-full max-w-md focus:outline-none focus:border-emerald-400"
                        />
                      ) : (
                        <>
                          <h2 className="text-xl font-bold">系统推导参考</h2>
                          <p className="text-sm text-slate-400 mt-1">
                            基于 {channels.personaName} 推导出的执行能力线索 · {channels.channels?.length || 0} 项
                          </p>
                        </>
                      )}
                    </div>
                    {channelMap?.content?.confidence !== undefined && (
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">置信度</div>
                        <div className="text-2xl font-bold text-emerald-400">
                          {Math.round((channelMap.content.confidence || 0) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Channel Button */}
                {isEditing && (
                  <button
                    onClick={addChannel}
                    className="w-full p-3 border-2 border-dashed border-[#E7E0D3] rounded-xl text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    添加渠道
                  </button>
                )}

                {/* Channels Grid */}
                <div className="grid gap-4">
                  {channels.channels?.sort((a, b) => a.priority - b.priority).map((channel, i) => {
                    const config = CHANNEL_CONFIG[channel.channelType] || { 
                      icon: Search, 
                      bg: 'bg-slate-50', 
                      text: 'text-slate-600' 
                    };
                    const ChannelIcon = config.icon;
                    
                    return (
                      <div 
                        key={i}
                        className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-5 hover:border-emerald-200 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg}`}>
                            <ChannelIcon size={20} className={config.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={channel.name}
                                    onChange={(e) => updateChannel(i, 'name', e.target.value)}
                                    className="flex-1 font-bold text-[#0B1B2B] bg-transparent border-b border-slate-200 focus:border-emerald-500 focus:outline-none"
                                  />
                                  <select
                                    value={channel.channelType}
                                    onChange={(e) => updateChannel(i, 'channelType', e.target.value)}
                                    className="px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-emerald-500"
                                  >
                                    {CHANNEL_TYPES.map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    value={channel.priority}
                                    onChange={(e) => updateChannel(i, 'priority', parseInt(e.target.value) || 1)}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-emerald-500"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 mb-1">搜索查询（逗号分隔）</p>
                                  <textarea
                                    value={channel.discoveryMethod?.searchQueries?.join(', ') || ''}
                                    onChange={(e) => updateChannelQueries(i, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-[#0B1B2B]">{channel.name}</h4>
                                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${config.bg} ${config.text}`}>
                                    {channel.channelType}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                    优先级 #{channel.priority}
                                  </span>
                                </div>
                                
                                {channel.discoveryMethod && (
                                  <div className="mt-3 space-y-3">
                                    {channel.discoveryMethod.searchQueries?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                          <Search size={10} />
                                          搜索查询
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {channel.discoveryMethod.searchQueries.slice(0, 5).map((q, j) => (
                                            <code key={j} className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] rounded font-mono">
                                              {q}
                                            </code>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {channel.discoveryMethod.signalsToLookFor?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                          <Radar size={10} />
                                          寻找信号
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {channel.discoveryMethod.signalsToLookFor.map((s, j) => (
                                            <span key={j} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded">
                                              {s}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {channel.evidenceIds?.length > 0 && (
                                  <div className="flex items-center gap-1 mt-3">
                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                    <span className="text-[10px] text-slate-400">
                                      引用 {channel.evidenceIds.length} 条证据
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          {isEditing ? (
                            <button
                              onClick={() => removeChannel(i)}
                              className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button className="shrink-0 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              启动探测
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meta Info */}
            {targetingSpec && !isEditing && (
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-4">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(targetingSpec.createdAt).toLocaleString('zh-CN')}
                </span>
                {targetingSpec.createdBy && (
                  <span>由 {targetingSpec.createdBy} 生成</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* CollaborativeShell Sidebar */}
      {showShell && targetingSpec && (
        <div className="w-80 shrink-0">
          <CollaborativeShell
            entityType={activeTab === 'targeting' ? 'TargetingSpec' : 'ChannelMap'}
            entityId={activeTab === 'targeting' ? targetingSpec.entityId : (channelMap?.entityId || '')}
            versionId={activeTab === 'targeting' ? targetingSpec.id : (channelMap?.id || '')}
            anchorType="jsonPath"
            variant="light"
            className="sticky top-4"
            onVersionChange={(verId) => {
              console.log('Version changed:', verId);
            }}
          />
        </div>
      )}
    </div>
  );
}
