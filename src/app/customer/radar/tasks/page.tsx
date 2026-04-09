"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ChevronRight,
  Search,
  MapPin,
  FileText,
  Building2,
  Filter,
  ArrowLeft,
  Zap,
  Globe2,
} from 'lucide-react';
import {
  getDiscoveryTasksV2,
  getRadarSourcesV2,
  createDiscoveryTaskV2,
  runDiscoveryTaskV2,
  cancelDiscoveryTaskV2,
  initializeSystemSourcesV2,
} from '@/actions/radar-v2';
import { getLatestTargetingSpec } from '@/actions/sync';
import type { RadarTask, RadarSource } from '@prisma/client';
import type { RadarTaskStatus, ChannelType } from '@prisma/client';
import { toast } from 'sonner';

// ==================== 类型 ====================

type TaskWithSource = RadarTask & { source: RadarSource };

// ==================== 常量 ====================

const STATUS_CONFIG: Record<RadarTaskStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: '待执行', color: 'text-slate-500 bg-slate-100', icon: Clock },
  RUNNING: { label: '执行中', color: 'text-blue-600 bg-blue-100', icon: Loader2 },
  COMPLETED: { label: '已完成', color: 'text-emerald-600 bg-emerald-100', icon: CheckCircle2 },
  FAILED: { label: '失败', color: 'text-red-600 bg-red-100', icon: XCircle },
  CANCELLED: { label: '已取消', color: 'text-amber-600 bg-amber-100', icon: Square },
};

const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: typeof Search; color: string }> = {
  TENDER: { label: '招标', icon: FileText, color: 'text-amber-600' },
  MAPS: { label: '地图', icon: MapPin, color: 'text-blue-600' },
  DIRECTORY: { label: '目录', icon: Building2, color: 'text-emerald-600' },
  TRADESHOW: { label: '展会', icon: Globe2, color: 'text-purple-600' },
  HIRING: { label: '招聘', icon: Search, color: 'text-rose-600' },
  ECOSYSTEM: { label: '生态', icon: Globe2, color: 'text-teal-600' },
  CUSTOM: { label: '自定义', icon: Zap, color: 'text-slate-600' },
};

// ==================== 页面组件 ====================

export default function RadarTasksPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithSource[]>([]);
  const [sources, setSources] = useState<RadarSource[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RadarTaskStatus | ''>('');
  const [channelFilter, setChannelFilter] = useState<ChannelType | ''>('');
  const [_runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tasksData, sourcesData] = await Promise.all([
        getDiscoveryTasksV2({
          status: statusFilter || undefined,
        }),
        getRadarSourcesV2(channelFilter || undefined),
      ]);
      setTasks(tasksData);
      setSources(sourcesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 初始化系统数据源
  const handleInitSources = async () => {
    try {
      const created = await initializeSystemSourcesV2();
      if (created.length > 0) {
        toast.success(`已创建 ${created.length} 个数据源`);
        loadData();
      } else {
        toast.info('数据源已是最新');
      }
    } catch (err) {
      toast.error('初始化失败', { description: err instanceof Error ? err.message : '未知错误' });
    }
  };

  // 运行任务
  const handleRunTask = async (taskId: string) => {
    setRunningTaskIds(prev => new Set(prev).add(taskId));
    try {
      const result = await runDiscoveryTaskV2(taskId);
      if (result.success) {
        toast.success('任务完成', {
          description: `发现 ${result.stats.created} 个新候选，${result.stats.duplicates} 个重复`,
        });
      }
      loadData();
    } catch (err) {
      toast.error('执行失败', { description: err instanceof Error ? err.message : '未知错误' });
    } finally {
      setRunningTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  // 取消任务
  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelDiscoveryTaskV2(taskId);
      toast.info('任务已取消');
      loadData();
    } catch (err) {
      toast.error('取消失败', { description: err instanceof Error ? err.message : '未知错误' });
    }
  };

  // 过滤后的任务
  const filteredTasks = tasks.filter(t => {
    if (channelFilter && t.source.channelType !== channelFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1B2B] to-[#10263B]">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/customer/radar"
                className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors rounded-lg hover:bg-white/5"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">发现任务</h1>
                <p className="text-sm text-slate-400 mt-1">
                  管理和执行获客雷达的数据发现任务
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleInitSources}
                className="px-3 py-2 text-slate-400 hover:text-[#D4AF37] transition-colors rounded-lg hover:bg-white/5 text-sm"
              >
                初始化数据源
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors"
              >
                <Plus size={16} />
                新建任务
              </button>
              <button 
                onClick={loadData}
                className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
                title="刷新"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500">筛选:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RadarTaskStatus | '')}
            className="px-3 py-1.5 text-xs border border-[#E8E0D0] rounded-lg bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as ChannelType | '')}
            className="px-3 py-1.5 text-xs border border-[#E8E0D0] rounded-lg bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          >
            <option value="">全部渠道</option>
            {Object.entries(CHANNEL_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-auto">
            共 {filteredTasks.length} 个任务
          </span>
        </div>
      </div>

      {/* Data Sources Overview */}
      {sources.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-5">
            <h3 className="text-sm font-bold text-[#0B1B2B] mb-3">可用数据源</h3>
            <div className="flex flex-wrap gap-2">
              {sources.map(source => {
                const channelConf = CHANNEL_CONFIG[source.channelType as ChannelType];
                const ChannelIcon = channelConf?.icon || Search;
                return (
                  <div 
                    key={source.id}
                    className="flex items-center gap-2 px-3 py-2 bg-[#FFFCF7] rounded-lg border border-[#E8E0D0]"
                  >
                    <ChannelIcon size={14} className={channelConf?.color || 'text-slate-500'} />
                    <span className="text-xs font-medium text-[#0B1B2B]">{source.name}</span>
                    {source.isOfficial && (
                      <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-600 rounded">官方</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-[#D4AF37] animate-spin" />
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid gap-4">
            {filteredTasks.map(task => {
              const statusConf = STATUS_CONFIG[task.status];
              const channelConf = CHANNEL_CONFIG[task.source.channelType as ChannelType];
              const ChannelIcon = channelConf?.icon || Search;
              
              return (
                <div 
                  key={task.id}
                  className="bg-[#FFFCF7] rounded-2xl border border-[#E8E0D0] p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-[#F0EBD8] flex items-center justify-center">
                        <ChannelIcon size={20} className={channelConf?.color || 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#0B1B2B] truncate">{task.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                            {statusConf.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          数据源：{task.source.name} · 
                          最后运行：{task.completedAt ? new Date(task.completedAt).toLocaleString('zh-CN') : task.startedAt ? new Date(task.startedAt).toLocaleString('zh-CN') : '未运行'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {task.status === 'PENDING' || task.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRunTask(task.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="运行"
                        >
                          <Play size={18} />
                        </button>
                      ) : task.status === 'RUNNING' ? (
                        <button
                          onClick={() => handleCancelTask(task.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="取消"
                        >
                          <Square size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRunTask(task.id)}
                          className="p-2 text-slate-400 hover:text-[#D4AF37] hover:bg-[#F7F3E8] rounded-lg transition-colors"
                          title="重新运行"
                        >
                          <RefreshCw size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {}}
                        className="p-2 text-slate-400 hover:text-[#D4AF37] hover:bg-[#F7F3E8] rounded-lg transition-colors"
                        title="详情"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-12 text-center">
            <Search size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#0B1B2B] mb-2">暂无发现任务</h3>
            <p className="text-sm text-slate-500 mb-6">
              创建第一个发现任务，开始从全球渠道获取潜在客户
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#0B1220] rounded-xl font-medium hover:bg-[#C5A030] transition-colors mx-auto"
            >
              <Plus size={18} />
              创建任务
            </button>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          sources={sources}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ==================== 创建任务弹窗 ====================

function CreateTaskModal({
  sources,
  onClose,
  onCreated,
}: {
  sources: RadarSource[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [keywords, setKeywords] = useState('');
  const [countries, setCountries] = useState('');
  const [industries, setIndustries] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [useTargetingSpec, setUseTargetingSpec] = useState(true); // 默认使用 TargetingSpec
  const [targetingSpec, setTargetingSpec] = useState<{
    id: string;
    content: Record<string, unknown>;
  } | null>(null);

  // 加载 TargetingSpec
  useEffect(() => {
    getLatestTargetingSpec().then(spec => {
      if (spec) {
        setTargetingSpec({ id: spec.id, content: spec.content });
        // 自动从 TargetingSpec 填充表单
        const specContent = spec.content.targetingSpec as {
          segmentation?: {
            firmographic?: { industries?: string[]; countries?: string[] };
            technographic?: { keywords?: string[] };
          };
        };
        if (specContent?.segmentation?.technographic?.keywords) {
          setKeywords(specContent.segmentation.technographic.keywords.join(', '));
        }
        if (specContent?.segmentation?.firmographic?.countries) {
          setCountries(specContent.segmentation.firmographic.countries.join(', '));
        }
        if (specContent?.segmentation?.firmographic?.industries) {
          setIndustries(specContent.segmentation.firmographic.industries.join(', '));
        }
      }
    });
  }, []);

  const handleCreate = async () => {
    if (!selectedSourceId) {
      toast.error('请选择数据源');
      return;
    }
    
    setIsCreating(true);
    try {
      const queryConfig: Record<string, unknown> = {};
      
      if (useTargetingSpec && targetingSpec) {
        // 从 TargetingSpec 提取查询参数
        const spec = targetingSpec.content.targetingSpec as {
          segmentation?: {
            firmographic?: { industries?: string[]; countries?: string[] };
            technographic?: { keywords?: string[] };
          };
        };
        queryConfig.keywords = spec?.segmentation?.technographic?.keywords || [];
        queryConfig.countries = spec?.segmentation?.firmographic?.countries || [];
        queryConfig.targetIndustries = spec?.segmentation?.firmographic?.industries || [];
      } else {
        // 使用手动输入
        if (keywords.trim()) {
          queryConfig.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
        }
        if (countries.trim()) {
          queryConfig.countries = countries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        }
        if (industries.trim()) {
          queryConfig.targetIndustries = industries.split(',').map(i => i.trim()).filter(Boolean);
        }
      }
      
      await createDiscoveryTaskV2({
        sourceId: selectedSourceId,
        queryConfig,
        targetingRef: useTargetingSpec && targetingSpec ? {
          specVersionId: targetingSpec.id,
        } : undefined,
      });
      
      toast.success('任务已创建');
      onCreated();
    } catch (err) {
      toast.error('创建失败', { description: err instanceof Error ? err.message : '未知错误' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#FFFCF7] rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-[#F0EBD8] border-b border-[#E8E0D0]">
          <h3 className="text-lg font-bold text-[#0B1B2B]">新建发现任务</h3>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
              数据源 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-4 py-2 border border-[#E8E0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              <option value="">选择数据源...</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name} ({CHANNEL_CONFIG[source.channelType as ChannelType]?.label || source.channelType})
                </option>
              ))}
            </select>
          </div>
          
          {/* TargetingSpec Info */}
          {targetingSpec ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#D4AF37]/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useTargetingSpec"
                    checked={useTargetingSpec}
                    onChange={(e) => setUseTargetingSpec(e.target.checked)}
                    className="w-4 h-4 text-[#D4AF37] rounded"
                  />
                  <label htmlFor="useTargetingSpec" className="text-sm font-medium text-[#0B1B2B]">
                    使用知识引擎画像
                  </label>
                </div>
                <span className="text-xs text-slate-500">
                  {useTargetingSpec ? '✅ 已启用' : '⚠️ 使用手动输入'}
                </span>
              </div>
              
              {useTargetingSpec && (
                <div className="p-3 bg-[#F7F3E8] rounded-xl border border-[#E8E0D0]">
                  <div className="text-xs font-medium text-[#0B1B2B] mb-2">画像参数预览：</div>
                  <div className="space-y-2 text-xs">
                    {keywords && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 shrink-0">关键词：</span>
                        <span className="text-[#0B1B2B]">{keywords}</span>
                      </div>
                    )}
                    {countries && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 shrink-0">目标国家：</span>
                        <span className="text-[#0B1B2B]">{countries}</span>
                      </div>
                    )}
                    {industries && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 shrink-0">目标行业：</span>
                        <span className="text-[#0B1B2B]">{industries}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">未找到知识引擎画像</p>
                  <p>请先在知识引擎中完成目标客户画像分析，然后返回此处创建任务。</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Manual Override */}
          {(!useTargetingSpec || !targetingSpec) && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                  搜索关键词 <span className="text-xs text-slate-400">(逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="例如：industrial robot, automation, CNC"
                  className="w-full px-4 py-2 border border-[#E8E0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                  目标国家 <span className="text-xs text-slate-400">(ISO 代码，逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={countries}
                  onChange={(e) => setCountries(e.target.value)}
                  placeholder="例如：US, DE, JP"
                  className="w-full px-4 py-2 border border-[#E8E0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                  目标行业 <span className="text-xs text-slate-400">(逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={industries}
                  onChange={(e) => setIndustries(e.target.value)}
                  placeholder="例如：汽车制造，电子，机械"
                  className="w-full px-4 py-2 border border-[#E8E0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
              </div>
            </>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-[#E8E0D0] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !selectedSourceId}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1220] text-[#D4AF37] rounded-xl text-sm font-medium hover:bg-[#152030] transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
}
