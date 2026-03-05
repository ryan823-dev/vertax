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
import type { RadarTask, RadarSource } from '@/generated/prisma/client';
import type { RadarTaskStatus, ChannelType } from '@/generated/prisma/enums';
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
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - 深蓝舞台指令台 */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link 
              href="/c/radar" 
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

      {/* Filters */}
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

      {/* Data Sources Overview */}
      {sources.length > 0 && (
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
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">暂无发现任务</h3>
            <p className="text-sm text-slate-400 mb-6">
              点击「新建任务」开始探测潜在客户
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors"
            >
              <Plus size={16} />
              新建任务
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const statusConf = STATUS_CONFIG[task.status as RadarTaskStatus];
            const channelConf = CHANNEL_CONFIG[task.source.channelType as ChannelType];
            const StatusIcon = statusConf?.icon || Clock;
            const ChannelIcon = channelConf?.icon || Search;
            const isRunning = runningTaskIds.has(task.id) || task.status === 'RUNNING';
            const stats = task.stats as { fetched?: number; created?: number; duration?: number } | null;
            const queryConfig = task.queryConfig as { keywords?: string[]; countries?: string[] } | null;
            
            return (
              <div 
                key={task.id}
                className="bg-[#F7F3E8] rounded-xl border border-[#E8E0D0] p-4 hover:border-[#D4AF37]/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Channel Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-[#F0EBD8]`}>
                    <ChannelIcon size={18} className={channelConf?.color || 'text-slate-500'} />
                  </div>
                  
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-[#0B1B2B] text-sm">
                        {task.name || task.source.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded flex items-center gap-1 ${statusConf?.color}`}>
                        {isRunning ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <StatusIcon size={10} />
                        )}
                        {statusConf?.label}
                      </span>
                    </div>
                    
                    {/* Query Keywords */}
                    {queryConfig?.keywords?.length ? (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {queryConfig.keywords.slice(0, 5).map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#F0EBD8] text-slate-600 text-[10px] rounded">
                            {kw}
                          </span>
                        ))}
                        {queryConfig.countries?.length ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded flex items-center gap-1">
                            <Globe2 size={9} />
                            {queryConfig.countries.join(', ')}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span>
                        <Clock size={10} className="inline mr-1" />
                        {new Date(task.createdAt).toLocaleString('zh-CN')}
                      </span>
                      {stats?.created !== undefined && (
                        <span className="text-emerald-600">
                          <CheckCircle2 size={10} className="inline mr-1" />
                          新增 {stats.created}
                        </span>
                      )}
                      {stats?.duration !== undefined && (
                        <span>
                          耗时 {(stats.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                      {task.errorMessage && (
                        <span className="text-red-500">{task.errorMessage}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {task.status === 'PENDING' && (
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-[#0B1220] rounded-lg text-xs font-medium hover:bg-[#C5A030] transition-colors disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Play size={12} />
                        )}
                        执行
                      </button>
                    )}
                    {task.status === 'RUNNING' && (
                      <button
                        onClick={() => handleCancelTask(task.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                      >
                        <Square size={12} />
                        取消
                      </button>
                    )}
                    {task.status === 'COMPLETED' && (
                      <Link
                        href="/c/radar/candidates"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        查看结果
                        <ChevronRight size={12} />
                      </Link>
                    )}
                    {task.status === 'FAILED' && (
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-[#F0EBD8] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={12} />
                        重试
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
  const [useTargetingSpec, setUseTargetingSpec] = useState(false);
  const [targetingSpec, setTargetingSpec] = useState<{
    id: string;
    content: Record<string, unknown>;
  } | null>(null);

  // 加载 TargetingSpec
  useEffect(() => {
    getLatestTargetingSpec().then(spec => {
      if (spec) {
        setTargetingSpec({ id: spec.id, content: spec.content });
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
          
          {/* Use TargetingSpec Toggle */}
          {targetingSpec && (
            <div className="flex items-center gap-3 p-3 bg-[#D4AF37]/10 rounded-xl">
              <input
                type="checkbox"
                id="useTargetingSpec"
                checked={useTargetingSpec}
                onChange={(e) => setUseTargetingSpec(e.target.checked)}
                className="w-4 h-4 text-[#D4AF37] rounded"
              />
              <label htmlFor="useTargetingSpec" className="text-sm text-[#0B1B2B]">
                使用 TargetingSpec 自动填充查询参数
              </label>
            </div>
          )}
          
          {/* Manual Query Config */}
          {!useTargetingSpec && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                  关键词 <span className="text-xs text-slate-400">(逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="例如: industrial robot, automation, CNC"
                  className="w-full px-4 py-2 border border-[#E8E0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0B1B2B] mb-2">
                  目标国家 <span className="text-xs text-slate-400">(ISO代码，逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={countries}
                  onChange={(e) => setCountries(e.target.value)}
                  placeholder="例如: US, DE, JP"
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
                  placeholder="例如: 汽车制造, 电子, 机械"
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
