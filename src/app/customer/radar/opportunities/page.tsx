"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Building2, 
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink,
  Calendar,
  DollarSign,
  ChevronRight,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  getOpportunitiesV2,
  updateOpportunityStageV2,
} from '@/actions/radar-v2';
import type { Opportunity, ProspectCompany } from '@prisma/client';
import type { OpportunityStage } from '@prisma/client';

// ==================== 类型 ====================

type OpportunityWithCompany = Opportunity & { company: ProspectCompany | null };

// ==================== 阶段配置 ====================

const STAGE_CONFIG: Record<OpportunityStage, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  IDENTIFIED: {
    label: '已识别',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Target,
  },
  QUALIFYING: {
    label: '资格评估',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: Clock,
  },
  PURSUING: {
    label: '跟进中',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: TrendingUp,
  },
  PROPOSAL: {
    label: '已提案',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    icon: FileText,
  },
  NEGOTIATION: {
    label: '谈判中',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: ArrowRight,
  },
  WON: {
    label: '赢单',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: CheckCircle2,
  },
  LOST: {
    label: '丢单',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
};

const STAGE_ORDER: OpportunityStage[] = [
  'IDENTIFIED',
  'QUALIFYING', 
  'PURSUING',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

// ==================== 页面组件 ====================

export default function RadarOpportunitiesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithCompany | null>(null);
  
  // 筛选
  const [filterStage, setFilterStage] = useState<OpportunityStage | ''>('');

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOpportunitiesV2({
        stage: filterStage || undefined,
        limit: 100,
      });
      setOpportunities(result.opportunities);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [filterStage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 更新阶段
  const handleUpdateStage = async (opportunityId: string, stage: OpportunityStage) => {
    try {
      await updateOpportunityStageV2(opportunityId, stage);
      loadData();
      if (selectedOpportunity?.id === opportunityId) {
        setSelectedOpportunity(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  // 计算截止时间状态
  const getDeadlineStatus = (deadline: Date | null) => {
    if (!deadline) return null;
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { label: '已过期', color: 'text-red-600 bg-red-50' };
    if (days <= 3) return { label: `${days}天后截止`, color: 'text-red-600 bg-red-50' };
    if (days <= 7) return { label: `${days}天后截止`, color: 'text-amber-600 bg-amber-50' };
    return { label: `${days}天后截止`, color: 'text-slate-600 bg-[#F0EBD8]' };
  };

  // 按阶段分组（看板视图）
  const groupedByStage = opportunities.reduce((acc, opp) => {
    if (!acc[opp.stage]) acc[opp.stage] = [];
    acc[opp.stage].push(opp);
    return acc;
  }, {} as Record<OpportunityStage, OpportunityWithCompany[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)'}} className="rounded-2xl p-6 relative overflow-hidden">
        <div style={{background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)'}} className="absolute inset-0 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">采购机会</h1>
            <p className="text-sm text-slate-400 mt-1">单独跟踪和管理采购 / 招投标类商机</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as OpportunityStage | '')}
              className="px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="" className="bg-[#0B1220] text-white">全部阶段</option>
              {STAGE_ORDER.map(stage => (
                <option key={stage} value={stage} className="bg-[#0B1220] text-white">{STAGE_CONFIG[stage].label}</option>
              ))}
            </select>
            <button 
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
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

      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        {STAGE_ORDER.filter(s => s !== 'WON' && s !== 'LOST').map(stage => {
          const config = STAGE_CONFIG[stage];
          const count = groupedByStage[stage]?.length || 0;
          return (
            <button
              key={stage}
              onClick={() => setFilterStage(filterStage === stage ? '' : stage)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStage === stage
                  ? `${config.bgColor} ${config.color} ring-2 ring-current`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Opportunities List */}
        <div className="col-span-2 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#0B1B2B]">机会列表</h3>
            <span className="text-xs text-slate-400">{opportunities.length} / {total} 条</span>
          </div>
          
          {opportunities.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)'}}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                <FileText size={28} className="text-[#D4AF37]" />
              </div>
              <p className="text-slate-400">暂无采购机会</p>
              <p className="text-xs text-slate-500 mt-2">从候选池中单独沉淀采购 / 招投标对象</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {opportunities.map((opp) => {
                const stageConfig = STAGE_CONFIG[opp.stage];
                const deadlineStatus = getDeadlineStatus(opp.deadline);
                const isSelected = selectedOpportunity?.id === opp.id;
                const StageIcon = stageConfig.icon;
                
                return (
                  <div 
                    key={opp.id}
                    onClick={() => setSelectedOpportunity(isSelected ? null : opp)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5' 
                        : 'border-[#E8E0D0] hover:border-[#D4AF37]/50 bg-[#FFFCF7]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stageConfig.bgColor}`}>
                        <StageIcon size={18} className={stageConfig.color} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[#0B1B2B] truncate">{opp.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded ${stageConfig.bgColor} ${stageConfig.color}`}>
                            {stageConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {opp.company && (
                            <span className="flex items-center gap-1">
                              <Building2 size={10} />
                              {opp.company.name}
                            </span>
                          )}
                          {deadlineStatus && (
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${deadlineStatus.color}`}>
                              <Calendar size={10} />
                              {deadlineStatus.label}
                            </span>
                          )}
                          {opp.estimatedValue && (
                            <span className="flex items-center gap-1">
                              <DollarSign size={10} />
                              {opp.estimatedValue.toLocaleString()} {opp.currency}
                            </span>
                          )}
                        </div>
                        
                        {opp.categoryName && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {opp.categoryCode} - {opp.categoryName}
                          </p>
                        )}
                      </div>
                      
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="col-span-1 space-y-4">
          {selectedOpportunity ? (
            <>
              {/* Basic Info */}
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                <h3 className="font-bold text-[#0B1B2B] mb-3 line-clamp-2">
                  {selectedOpportunity.title}
                </h3>
                
                {selectedOpportunity.company && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-[#F0EBD8] rounded-lg">
                    <Building2 size={14} className="text-[#D4AF37]" />
                    <span className="text-sm text-[#0B1B2B] font-medium">
                      {selectedOpportunity.company.name}
                    </span>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {selectedOpportunity.deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Calendar size={14} />
                        截止日期
                      </span>
                      <span className="font-medium text-[#0B1B2B]">
                        {new Date(selectedOpportunity.deadline).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  )}
                  {selectedOpportunity.estimatedValue && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-2">
                        <DollarSign size={14} />
                        预估金额
                      </span>
                      <span className="font-medium text-emerald-600">
                        {selectedOpportunity.estimatedValue.toLocaleString()} {selectedOpportunity.currency}
                      </span>
                    </div>
                  )}
                  {selectedOpportunity.probability && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-2">
                        <TrendingUp size={14} />
                        赢单概率
                      </span>
                      <span className="font-medium text-[#0B1B2B]">
                        {selectedOpportunity.probability}%
                      </span>
                    </div>
                  )}
                </div>

                {selectedOpportunity.sourceUrl && (
                  <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
                    <a 
                      href={selectedOpportunity.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#D4AF37] hover:underline"
                    >
                      <ExternalLink size={12} />
                      查看原文
                    </a>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedOpportunity.description && (
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <h4 className="font-bold text-[#0B1B2B] text-sm mb-2">描述</h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-8">
                    {selectedOpportunity.description}
                  </p>
                </div>
              )}

              {/* Stage Management */}
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                <h4 className="font-bold text-[#0B1B2B] text-sm mb-3">阶段管理</h4>
                
                <div className="space-y-2">
                  {STAGE_ORDER.map((stage) => {
                    const config = STAGE_CONFIG[stage];
                    const isCurrent = selectedOpportunity.stage === stage;
                    const Icon = config.icon;
                    
                    return (
                      <button
                        key={stage}
                        onClick={() => handleUpdateStage(selectedOpportunity.id, stage)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all ${
                          isCurrent
                            ? `${config.bgColor} ${config.color} ring-2 ring-current`
                            : 'bg-[#F0EBD8] text-slate-600 hover:bg-[#E8E0D0]'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="flex-1 text-left">{config.label}</span>
                        {isCurrent && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedOpportunity.notes && (
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <h4 className="font-bold text-[#0B1B2B] text-sm mb-2">备注</h4>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">
                    {selectedOpportunity.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-8 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)'}}>
                <Target size={24} className="text-[#D4AF37]" />
              </div>
              <p className="text-sm text-slate-500">选择机会查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
