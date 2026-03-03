"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  Search, 
  FileText, 
  Calendar, 
  Briefcase,
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Play,
  CheckCircle2,
  ExternalLink,
  Settings,
  Zap,
  Star,
} from 'lucide-react';
import {
  getRadarSourcesV2,
  initializeSystemSourcesV2,
  checkSourceHealthV2,
  createDiscoveryTaskV2,
  runDiscoveryTaskV2,
  getRadarStatsV2,
  type RadarSourceData,
  type RadarStatsData,
} from '@/actions/radar-v2';

// ==================== 渠道类型配置 ====================

const CHANNEL_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  description: string;
  signalStrength: number;
  color: string;
}> = {
  TENDER: {
    icon: FileText,
    label: '招标采购',
    description: '政府/企业采购公告，最强购买信号',
    signalStrength: 5,
    color: 'text-emerald-500',
  },
  MAPS: {
    icon: Globe,
    label: '地图 POI',
    description: '基于地理位置发现有实体门店的公司',
    signalStrength: 3,
    color: 'text-blue-500',
  },
  DIRECTORY: {
    icon: Users,
    label: '行业名录',
    description: '行业协会、商会会员名录',
    signalStrength: 4,
    color: 'text-purple-500',
  },
  TRADESHOW: {
    icon: Calendar,
    label: '展会参展',
    description: '展会参展商名单',
    signalStrength: 4,
    color: 'text-orange-500',
  },
  HIRING: {
    icon: Briefcase,
    label: '招聘信号',
    description: '招聘特定岗位表明有相关需求',
    signalStrength: 3,
    color: 'text-amber-500',
  },
  ECOSYSTEM: {
    icon: Users,
    label: '生态伙伴',
    description: '经销商、合作伙伴目录',
    signalStrength: 2,
    color: 'text-slate-500',
  },
  CUSTOM: {
    icon: Settings,
    label: '自定义',
    description: '自定义数据源',
    signalStrength: 0,
    color: 'text-slate-400',
  },
};

// ==================== 页面组件 ====================

export default function RadarChannelsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<RadarSourceData[]>([]);
  const [stats, setStats] = useState<RadarStatsData | null>(null);
  const [selectedSource, setSelectedSource] = useState<RadarSourceData | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [searchKeywords, setSearchKeywords] = useState('');
  const [targetCountries, setTargetCountries] = useState('');

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 先初始化系统数据源
      await initializeSystemSourcesV2();
      
      const [sourcesData, statsData] = await Promise.all([
        getRadarSourcesV2(),
        getRadarStatsV2(),
      ]);
      setSources(sourcesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 检查数据源健康状态
  const handleCheckHealth = async (sourceId: string) => {
    try {
      const health = await checkSourceHealthV2(sourceId);
      // 更新本地状态
      setSources(prev => prev.map(s => 
        s.id === sourceId 
          ? { ...s, syncStats: { ...(s.syncStats as object || {}), healthy: health.healthy } }
          : s
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : '健康检查失败');
    }
  };

  // 运行发现任务
  const handleRunTask = async (source: RadarSourceData) => {
    if (!searchKeywords.trim()) {
      setError('请输入搜索关键词');
      return;
    }
    
    setIsRunning(source.id);
    setError(null);
    
    try {
      // 创建任务
      const task = await createDiscoveryTaskV2({
        sourceId: source.id,
        name: `${source.name} - ${searchKeywords}`,
        queryConfig: {
          keywords: searchKeywords.split(/[,，\s]+/).filter(Boolean),
          countries: targetCountries ? targetCountries.split(/[,，\s]+/).filter(Boolean) : undefined,
        },
      });
      
      // 运行任务
      const result = await runDiscoveryTaskV2(task.id);
      
      if (result.success) {
        setError(null);
        // 刷新统计
        const newStats = await getRadarStatsV2();
        setStats(newStats);
        // 提示成功
        alert(`任务完成！发现 ${result.stats.created} 个新候选，${result.stats.duplicates} 个重复`);
      } else {
        setError(`任务失败: ${result.stats.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '运行任务失败');
    } finally {
      setIsRunning(null);
    }
  };

  // 按渠道类型分组
  const groupedSources = sources.reduce((acc, source) => {
    const type = source.channelType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(source);
    return acc;
  }, {} as Record<string, RadarSourceData[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#C7A56A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">渠道地图</h1>
          <p className="text-sm text-slate-500 mt-1">多渠道发现潜在客户，基于 ICP 评估各渠道可行性</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-[#C7A56A] transition-colors"
          title="刷新"
        >
          <RefreshCw size={18} />
        </button>
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '候选总数', value: stats.totalCandidates, icon: Search, color: 'text-[#C7A56A]' },
            { label: '待处理', value: stats.newCandidates, icon: Zap, color: 'text-blue-500' },
            { label: '已合格化', value: stats.qualifiedCandidates, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: '运行中任务', value: stats.runningTasks, icon: Play, color: 'text-amber-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#FFFCF6] rounded-xl border border-[#E7E0D3] p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} className={stat.color} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search Config Panel */}
      <div className="bg-gradient-to-r from-[#0B1B2B] to-[#152942] rounded-2xl p-6">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Search size={18} className="text-[#C7A56A]" />
          配置搜索条件
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">关键词（用逗号分隔）</label>
            <input
              type="text"
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              placeholder="例如：industrial robot, automation"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C7A56A]/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">目标国家（ISO code，可选）</label>
            <input
              type="text"
              value={targetCountries}
              onChange={(e) => setTargetCountries(e.target.value)}
              placeholder="例如：US, DE, FR"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C7A56A]/50"
            />
          </div>
        </div>
      </div>

      {/* Channel Groups */}
      <div className="space-y-6">
        {Object.entries(CHANNEL_CONFIG).map(([channelType, config]) => {
          const channelSources = groupedSources[channelType] || [];
          if (channelSources.length === 0) return null;
          
          const Icon = config.icon;
          
          return (
            <div key={channelType} className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
              {/* Channel Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${config.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#0B1B2B]">{config.label}</h3>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < config.signalStrength ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{config.description}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{channelSources.length} 个数据源</span>
              </div>

              {/* Sources List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {channelSources.map((source) => {
                  const syncStats = source.syncStats as Record<string, unknown> | null;
                  const isHealthy = syncStats?.healthy === true;
                  const isSelected = selectedSource?.id === source.id;
                  
                  return (
                    <div
                      key={source.id}
                      onClick={() => setSelectedSource(isSelected ? null : source)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[#C7A56A] bg-[#C7A56A]/5' 
                          : 'border-[#E7E0D3] hover:border-[#C7A56A]/50 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[#0B1B2B] truncate">{source.name}</h4>
                            {source.isOfficial && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded">
                                官方
                              </span>
                            )}
                            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {source.description || source.websiteUrl}
                          </p>
                          {source.countries?.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {source.countries.slice(0, 5).map(c => (
                                <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">
                                  {c}
                                </span>
                              ))}
                              {source.countries.length > 5 && (
                                <span className="text-[10px] text-slate-400">+{source.countries.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {source.websiteUrl && (
                            <a 
                              href={source.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-slate-400 hover:text-[#C7A56A] transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckHealth(source.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#C7A56A] transition-colors"
                            title="检查状态"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Actions */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-[#E7E0D3]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunTask(source);
                            }}
                            disabled={isRunning === source.id || !source.isEnabled}
                            className="w-full py-2.5 bg-[#0B1B2B] text-[#C7A56A] rounded-lg text-sm font-medium hover:bg-[#10263B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isRunning === source.id ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                正在搜索...
                              </>
                            ) : (
                              <>
                                <Play size={14} />
                                启动发现任务
                              </>
                            )}
                          </button>
                          {!source.isEnabled && (
                            <p className="text-xs text-red-500 mt-2 text-center">此数据源已禁用</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sources.length === 0 && (
        <div className="text-center py-16">
          <Globe size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无可用数据源</p>
          <p className="text-xs text-slate-400 mt-2">系统正在初始化数据源...</p>
        </div>
      )}
    </div>
  );
}
