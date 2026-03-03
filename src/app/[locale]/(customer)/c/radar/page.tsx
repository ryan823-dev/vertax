"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Radar, 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Target,
  Users,
  ExternalLink,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react';
import {
  getLeads,
  getRadarStats,
  getICP,
  runAIResearch,
  updateLeadStatus,
  type LeadData,
  type RadarStats,
  type ICPData,
} from '@/actions/radar';
import { SkillPanel } from '@/components/skills';

export default function RadarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [stats, setStats] = useState<RadarStats>({ totalLeads: 0, highIntent: 0, pendingFollowUp: 0, thisWeek: 0 });
  const [icp, setIcp] = useState<ICPData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [leadsData, statsData, icpData] = await Promise.all([
        getLeads(),
        getRadarStats(),
        getICP(),
      ]);
      setLeads(leadsData);
      setStats(statsData);
      setIcp(icpData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // AI调研
  const handleResearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsResearching(true);
    setError(null);
    try {
      const newLeads = await runAIResearch(searchQuery);
      setLeads(prev => [...newLeads, ...prev]);
      setStats(prev => ({
        ...prev,
        totalLeads: prev.totalLeads + newLeads.length,
        highIntent: prev.highIntent + newLeads.filter(l => l.priority === 'high').length,
        thisWeek: prev.thisWeek + newLeads.length,
      }));
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI调研失败');
    } finally {
      setIsResearching(false);
    }
  };

  // 更新线索状态
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const updated = await updateLeadStatus(leadId, newStatus);
      if (updated) {
        setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
        if (selectedLead?.id === leadId) {
          setSelectedLead(updated);
        }
      }
    } catch (err) {
      setError('更新状态失败');
    }
  };

  // 获取分数颜色
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-slate-500';
  };

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      new: { label: '新线索', color: 'bg-blue-50 text-blue-600' },
      contacted: { label: '已联系', color: 'bg-amber-50 text-amber-600' },
      qualified: { label: '已验证', color: 'bg-emerald-50 text-emerald-600' },
      converted: { label: '已转化', color: 'bg-purple-50 text-purple-600' },
      pending: { label: '待跟进', color: 'bg-orange-50 text-orange-600' },
      lost: { label: '已流失', color: 'bg-red-50 text-red-600' },
    };
    return map[status] || { label: status, color: 'bg-slate-50 text-slate-600' };
  };

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
          <h1 className="text-2xl font-bold text-[#0B1B2B]">获客雷达</h1>
          <p className="text-sm text-slate-500 mt-1">AI智能挖掘全球潜在客户</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-[#C7A56A] transition-colors"
          title="刷新数据"
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

      {/* AI Research Bar */}
      <div className="bg-gradient-to-r from-[#0B1B2B] to-[#152942] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                placeholder="输入调研条件，如：汽车零部件行业、北美市场、年营收1000万以上..."
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C7A56A]/50"
              />
            </div>
          </div>
          <button 
            onClick={handleResearch}
            disabled={!searchQuery.trim() || isResearching}
            className="px-6 py-3 bg-[#C7A56A] text-[#0B1B2B] rounded-xl text-sm font-medium hover:bg-[#D4B57A] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isResearching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                调研中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                启动AI调研
              </>
            )}
          </button>
        </div>
        
        {/* ICP Info */}
        {icp && (icp.targetIndustries.length > 0 || icp.targetRegions.length > 0) && (
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="text-slate-400">已配置ICP：</span>
            {icp.targetIndustries.slice(0, 3).map((ind, i) => (
              <span key={i} className="px-2 py-1 bg-white/10 text-white/80 rounded">
                {ind}
              </span>
            ))}
            {icp.targetRegions.slice(0, 2).map((reg, i) => (
              <span key={i} className="px-2 py-1 bg-[#C7A56A]/20 text-[#C7A56A] rounded">
                {reg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '已发现线索', value: stats.totalLeads, icon: Radar, color: 'text-[#C7A56A]' },
          { label: '高意向客户', value: stats.highIntent, icon: TrendingUp, color: 'text-emerald-500' },
          { label: '待跟进', value: stats.pendingFollowUp, icon: Target, color: 'text-amber-500' },
          { label: '本周新增', value: stats.thisWeek, icon: Zap, color: 'text-blue-500' },
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

      <div className="grid grid-cols-3 gap-6">
        {/* Lead List */}
        <div className="col-span-2 bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#0B1B2B]">潜在客户列表</h3>
            <span className="text-xs text-slate-400">{leads.length} 条线索</span>
          </div>
          
          {leads.length === 0 ? (
            <div className="text-center py-16">
              <Radar size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无发现的潜在客户</p>
              <p className="text-xs text-slate-400 mt-2">输入调研条件，点击&quot;启动AI调研&quot;开始智能获客</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {leads.map((lead) => {
                const statusInfo = getStatusLabel(lead.status);
                const score = lead.researchData?.score;
                return (
                  <div 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedLead?.id === lead.id 
                        ? 'border-[#C7A56A] bg-[#C7A56A]/5' 
                        : 'border-[#E7E0D3] hover:border-[#C7A56A]/50 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 bg-[#F7F3EA] rounded-xl flex items-center justify-center">
                      <Building2 size={20} className="text-[#C7A56A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-[#0B1B2B] truncate">{lead.companyName}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {lead.industry && <span>{lead.industry}</span>}
                        {lead.country && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {lead.city ? `${lead.city}, ${lead.country}` : lead.country}
                          </span>
                        )}
                        {lead.contactName && (
                          <span className="flex items-center gap-1">
                            <Users size={10} />
                            {lead.contactName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {score !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                          <span className="text-xs text-slate-400">分</span>
                        </div>
                      )}
                      <ChevronRight size={16} className="text-slate-300 ml-auto" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lead Detail Panel */}
        <div className="col-span-1 space-y-4">
          {selectedLead ? (
            <>
              {/* Basic Info */}
              <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/80 rounded-xl flex items-center justify-center">
                    <Building2 size={20} className="text-[#0B1B2B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#0B1B2B] truncate">{selectedLead.companyName}</h3>
                    <p className="text-xs text-slate-500">{selectedLead.industry}</p>
                  </div>
                </div>

                {/* Score */}
                {selectedLead.researchData?.score !== undefined && (
                  <div className="mb-4 p-3 bg-[#F7F3EA] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">匹配分数</span>
                      <span className={`text-xl font-bold ${getScoreColor(selectedLead.researchData.score)}`}>
                        {selectedLead.researchData.score}
                      </span>
                    </div>
                    {selectedLead.researchData.scoreBreakdown && (
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">行业匹配</span>
                          <span className="text-slate-600">{selectedLead.researchData.scoreBreakdown.industryMatch}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">区域匹配</span>
                          <span className="text-slate-600">{selectedLead.researchData.scoreBreakdown.regionMatch}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">规模匹配</span>
                          <span className="text-slate-600">{selectedLead.researchData.scoreBreakdown.sizeMatch}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">信号强度</span>
                          <span className="text-slate-600">{selectedLead.researchData.scoreBreakdown.signalStrength}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  {selectedLead.contactName && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users size={14} className="text-slate-400" />
                      <span>{selectedLead.contactName}</span>
                    </div>
                  )}
                  {selectedLead.email && (
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#C7A56A]">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{selectedLead.email}</span>
                    </a>
                  )}
                  {selectedLead.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      <span>{selectedLead.phone}</span>
                    </div>
                  )}
                  {selectedLead.website && (
                    <a 
                      href={selectedLead.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-600 hover:text-[#C7A56A]"
                    >
                      <Globe size={14} className="text-slate-400" />
                      <span className="truncate">{selectedLead.website}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {selectedLead.country && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{selectedLead.city ? `${selectedLead.city}, ${selectedLead.country}` : selectedLead.country}</span>
                    </div>
                  )}
                </div>

                {/* Status Actions */}
                <div className="mt-4 pt-4 border-t border-[#E7E0D3]">
                  <p className="text-xs text-slate-500 mb-2">更新状态</p>
                  <div className="flex flex-wrap gap-2">
                    {['new', 'contacted', 'qualified', 'pending', 'converted', 'lost'].map((status) => {
                      const info = getStatusLabel(status);
                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selectedLead.id, status)}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            selectedLead.status === status
                              ? `${info.color} ring-1 ring-current`
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {info.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {selectedLead.researchData?.aiSummary && (
                <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                  <h4 className="font-bold text-[#0B1B2B] text-sm mb-3 flex items-center gap-2">
                    <Sparkles size={14} className="text-[#C7A56A]" />
                    AI分析
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedLead.researchData.aiSummary}
                  </p>
                </div>
              )}

              {/* Signals */}
              {selectedLead.researchData?.signals && selectedLead.researchData.signals.length > 0 && (
                <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                  <h4 className="font-bold text-[#0B1B2B] text-sm mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    购买信号
                  </h4>
                  <div className="space-y-2">
                    {selectedLead.researchData.signals.map((signal, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span className="text-slate-600">{signal.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Skills Panel */}
              <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
                <SkillPanel
                  engine="radar"
                  entityType="Company"
                  entityId={selectedLead.id}
                  input={{ companyName: selectedLead.companyName, industry: selectedLead.industry }}
                  onSkillComplete={(skillName, versionId) => {
                    console.log(`Skill ${skillName} completed with version ${versionId}`);
                    loadData();
                  }}
                />
              </div>
            </>
          ) : (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-8 text-center">
              <Target size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">选择一条线索查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
