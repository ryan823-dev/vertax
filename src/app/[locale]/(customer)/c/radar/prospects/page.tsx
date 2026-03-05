"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink,
  Globe,
  Phone,
  Mail,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  MessageSquare,
  FileText,
  Copy,
  Check,
  Send,
  Users,
  Target,
  Star,
  Clock,
} from 'lucide-react';
import {
  getProspectCompaniesV2,
  type ProspectCompanyData,
} from '@/actions/radar-v2';
import { executeSkill } from '@/actions/skills';
import { SKILL_NAMES } from '@/lib/skills/registry';

// ==================== 类型 ====================

interface OutreachPackContent {
  outreachPack: {
    forPersona: string;
    forTier: string;
    openings: Array<{ text: string; evidenceIds: string[] }>;
    emails: Array<{ subject: string; body: string; evidenceIds: string[] }>;
    whatsapps: Array<{ text: string; evidenceIds: string[] }>;
    playbook: Array<{
      replyType: string;
      goal: string;
      responseTemplate: string;
      nextStepTasks: string[];
      evidenceIds: string[];
    }>;
    evidenceMap: Array<{ label: string; evidenceId: string; why: string }>;
    warnings: string[];
  };
}

// ==================== 页面组件 ====================

export default function RadarProspectsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<ProspectCompanyData[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<ProspectCompanyData | null>(null);
  
  // Outreach Pack state
  const [isGenerating, setIsGenerating] = useState(false);
  const [outreachPack, setOutreachPack] = useState<OutreachPackContent | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'outreach'>('info');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    status: '',
    tier: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProspectCompaniesV2({
        status: filters.status || undefined,
        tier: filters.tier || undefined,
        search: filters.search || undefined,
        limit: 100,
      });
      setCompanies(result.companies);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 生成外联包
  const handleGenerateOutreach = async (company: ProspectCompanyData) => {
    setIsGenerating(true);
    setError(null);
    setActiveTab('outreach');
    
    try {
      const result = await executeSkill(
        SKILL_NAMES.RADAR_GENERATE_OUTREACH_PACK,
        {
          input: {
            persona: {
              companyName: company.name,
              industry: company.industry || 'General',
              country: company.country || 'Unknown',
              description: company.description || '',
              website: company.website || '',
            },
            tier: (company.tier as 'A' | 'B' | 'C') || 'B',
          },
          entityType: 'OutreachPack',
          entityId: company.id,
          mode: 'generate',
          useCompanyProfile: true,
        }
      );
      
      if (result.ok && result.output) {
        setOutreachPack(result.output as unknown as OutreachPackContent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成外联包失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制到剪贴板
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 获取状态标签
  const getStatusLabel = (status: string | null) => {
    const map: Record<string, { label: string; color: string }> = {
      new: { label: '新线索', color: 'bg-blue-50 text-blue-600' },
      contacted: { label: '已联系', color: 'bg-amber-50 text-amber-600' },
      qualified: { label: '已鉴定', color: 'bg-emerald-50 text-emerald-600' },
      converted: { label: '已转化', color: 'bg-purple-50 text-purple-600' },
      lost: { label: '已流失', color: 'bg-red-50 text-red-600' },
    };
    return map[status || 'new'] || { label: status || '未知', color: 'bg-slate-50 text-slate-600' };
  };

  // 获取层级颜色
  const getTierStyle = (tier: string | null) => {
    const map: Record<string, string> = {
      A: 'bg-emerald-100 text-emerald-700',
      B: 'bg-amber-100 text-amber-700',
      C: 'bg-slate-100 text-slate-700',
    };
    return map[tier || ''] || 'bg-slate-100 text-slate-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header - 深蓝舞台指令台 */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
        <div className="relative flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-white">线索库</h1>
            <p className="text-sm text-slate-400 mt-1">管理已导入的潜在客户，生成个性化外联方案</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-slate-400 hover:text-[#D4AF37]'}`}
            >
              <Filter size={18} />
            </button>
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

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-[#F0EBD8] rounded-xl">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#D4AF37]" />
          <span className="text-xs text-slate-500">线索总数</span>
          <span className="font-bold text-[#0B1B2B]">{total}</span>
        </div>
        <div className="w-px h-4 bg-[#E8E0D0]" />
        <div className="flex items-center gap-2">
          <Target size={14} className="text-emerald-500" />
          <span className="text-xs text-slate-500">A级</span>
          <span className="font-medium text-[#0B1B2B]">
            {companies.filter(c => c.tier === 'A').length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-500">B级</span>
          <span className="font-medium text-[#0B1B2B]">
            {companies.filter(c => c.tier === 'B').length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-500">C级</span>
          <span className="font-medium text-[#0B1B2B]">
            {companies.filter(c => c.tier === 'C').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#F7F3E8] rounded-xl border border-[#E8E0D0] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">全部</option>
                <option value="new">新线索</option>
                <option value="contacted">已联系</option>
                <option value="qualified">已鉴定</option>
                <option value="converted">已转化</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">层级</label>
              <select
                value={filters.tier}
                onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">全部</option>
                <option value="A">A 级</option>
                <option value="B">B 级</option>
                <option value="C">C 级</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="搜索公司名称..."
                  className="w-full pl-9 pr-3 py-2 border border-[#E8E0D0] rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Companies List */}
        <div className="col-span-1 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
          <h3 className="font-bold text-[#0B1B2B] mb-4">线索列表</h3>
          
          {companies.length === 0 ? (
            <div className="relative rounded-2xl overflow-hidden py-16 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 size={32} className="text-[#D4AF37]" />
                </div>
                <p className="text-slate-300">暂无线索数据</p>
                <p className="text-xs text-slate-500 mt-2">前往「候选池」导入线索</p>
                <Link 
                  href="/c/radar/candidates"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors"
                >
                  前往候选池
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {companies.map((company) => {
                const statusInfo = getStatusLabel(company.status);
                const isSelected = selectedCompany?.id === company.id;
                
                return (
                  <div 
                    key={company.id}
                    onClick={() => {
                      setSelectedCompany(isSelected ? null : company);
                      setOutreachPack(null);
                      setActiveTab('info');
                    }}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5' 
                        : 'border-[#E8E0D0] hover:border-[#D4AF37]/50 bg-[#FFFCF7]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={14} className="text-[#D4AF37]" />
                      <h4 className="font-medium text-[#0B1B2B] text-sm truncate flex-1">
                        {company.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {company.tier && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getTierStyle(company.tier)}`}>
                          {company.tier} 级
                        </span>
                      )}
                      {company.country && (
                        <span className="text-[10px] text-slate-400">{company.country}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="col-span-2 space-y-4">
          {selectedCompany ? (
            <>
              {/* Tabs */}
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-2 flex gap-2">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'info'
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'text-[#4A5568] hover:text-[#0B1B2B]'
                  }`}
                >
                  基本信息
                </button>
                <button
                  onClick={() => setActiveTab('outreach')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'outreach'
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'text-[#4A5568] hover:text-[#0B1B2B]'
                  }`}
                >
                  <Sparkles size={14} />
                  外联方案
                </button>
              </div>

              {activeTab === 'info' ? (
                /* Basic Info Tab */
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/80 rounded-xl flex items-center justify-center">
                      <Building2 size={24} className="text-[#0B1B2B]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#0B1B2B] text-lg">{selectedCompany.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedCompany.tier && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTierStyle(selectedCompany.tier)}`}>
                            {selectedCompany.tier} 级客户
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusLabel(selectedCompany.status).color}`}>
                          {getStatusLabel(selectedCompany.status).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedCompany.industry && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Target size={14} className="text-slate-400" />
                        <span>行业: {selectedCompany.industry}</span>
                      </div>
                    )}
                    {selectedCompany.country && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Globe size={14} className="text-slate-400" />
                        <span>国家: {selectedCompany.country}</span>
                      </div>
                    )}
                    {selectedCompany.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        <span>{selectedCompany.phone}</span>
                      </div>
                    )}
                    {selectedCompany.email && (
                      <a href={`mailto:${selectedCompany.email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#D4AF37]">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate">{selectedCompany.email}</span>
                      </a>
                    )}
                    {selectedCompany.website && (
                      <a 
                        href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-600 hover:text-[#D4AF37] col-span-2"
                      >
                        <ExternalLink size={14} className="text-slate-400" />
                        <span className="truncate">{selectedCompany.website}</span>
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  {selectedCompany.description && (
                    <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
                      <h4 className="text-xs text-slate-500 mb-2">公司简介</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {selectedCompany.description}
                      </p>
                    </div>
                  )}

                  {/* Generate OutreachPack Button */}
                  <div className="mt-6 pt-4 border-t border-[#E8E0D0]">
                    <button
                      onClick={() => handleGenerateOutreach(selectedCompany)}
                      disabled={isGenerating}
                      className="w-full py-3 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          AI 生成外联方案中...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          生成个性化外联方案
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Outreach Tab */
                <div className="space-y-4">
                  {isGenerating ? (
                    <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
                      <div className="relative">
                        <Loader2 size={40} className="text-[#D4AF37] mx-auto mb-4 animate-spin" />
                        <p className="text-slate-300">AI 正在为 {selectedCompany.name} 生成外联方案...</p>
                        <p className="text-xs text-slate-500 mt-2">基于企业画像和证据库定制化生成</p>
                      </div>
                    </div>
                  ) : outreachPack ? (
                    <>
                      {/* Opening Lines */}
                      <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <MessageSquare size={18} className="text-[#D4AF37]" />
                          <h4 className="font-bold text-[#0B1B2B]">开场白</h4>
                          <span className="text-xs text-slate-400 ml-auto">
                            {outreachPack.outreachPack.openings.length} 条
                          </span>
                        </div>
                        <div className="space-y-3">
                          {outreachPack.outreachPack.openings.map((opening, idx) => (
                            <div key={idx} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4 group">
                              <p className="text-sm text-slate-700 leading-relaxed">{opening.text}</p>
                              <div className="flex items-center justify-between mt-3">
                                {opening.evidenceIds.length > 0 && (
                                  <span className="text-[10px] text-[#D4AF37]">
                                    引用: {opening.evidenceIds.join(', ')}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleCopy(opening.text, `opening-${idx}`)}
                                  className="ml-auto p-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors"
                                >
                                  {copiedId === `opening-${idx}` ? (
                                    <Check size={14} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Email Templates */}
                      <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Mail size={18} className="text-[#D4AF37]" />
                          <h4 className="font-bold text-[#0B1B2B]">邮件模板</h4>
                          <span className="text-xs text-slate-400 ml-auto">
                            {outreachPack.outreachPack.emails.length} 封
                          </span>
                        </div>
                        <div className="space-y-4">
                          {outreachPack.outreachPack.emails.map((email, idx) => (
                            <div key={idx} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] overflow-hidden">
                              <div className="bg-[#F0EBD8] px-4 py-2 flex items-center justify-between">
                                <div>
                                  <span className="text-xs text-slate-500">主题:</span>
                                  <span className="text-sm font-medium text-[#0B1B2B] ml-2">{email.subject}</span>
                                </div>
                                <button
                                  onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`, `email-${idx}`)}
                                  className="p-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors"
                                >
                                  {copiedId === `email-${idx}` ? (
                                    <Check size={14} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                              <div className="p-4">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                  {email.body}
                                </p>
                                {email.evidenceIds.length > 0 && (
                                  <p className="text-[10px] text-[#D4AF37] mt-3 pt-3 border-t border-[#E8E0D0]">
                                    引用证据: {email.evidenceIds.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* WhatsApp Templates */}
                      <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Send size={18} className="text-[#D4AF37]" />
                          <h4 className="font-bold text-[#0B1B2B]">WhatsApp 消息</h4>
                          <span className="text-xs text-slate-400 ml-auto">
                            {outreachPack.outreachPack.whatsapps.length} 条
                          </span>
                        </div>
                        <div className="space-y-3">
                          {outreachPack.outreachPack.whatsapps.map((wa, idx) => (
                            <div key={idx} className="bg-[#DCF8C6] rounded-xl p-4 relative group">
                              <p className="text-sm text-slate-800 leading-relaxed pr-8">{wa.text}</p>
                              <button
                                onClick={() => handleCopy(wa.text, `wa-${idx}`)}
                                className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                {copiedId === `wa-${idx}` ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Follow-up Playbook */}
                      {outreachPack.outreachPack.playbook.length > 0 && (
                        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <FileText size={18} className="text-[#D4AF37]" />
                            <h4 className="font-bold text-[#0B1B2B]">跟进剧本</h4>
                          </div>
                          <div className="space-y-4">
                            {outreachPack.outreachPack.playbook.map((entry, idx) => (
                              <div key={idx} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                    entry.replyType === 'interested' ? 'bg-emerald-100 text-emerald-700' :
                                    entry.replyType === 'need_info' ? 'bg-blue-100 text-blue-700' :
                                    entry.replyType === 'price_sensitive' ? 'bg-amber-100 text-amber-700' :
                                    entry.replyType === 'not_relevant' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {entry.replyType}
                                  </span>
                                  <span className="text-xs text-slate-500">→ 目标: {entry.goal}</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                  {entry.responseTemplate}
                                </p>
                                {entry.nextStepTasks.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {entry.nextStepTasks.map((task, tIdx) => (
                                      <span key={tIdx} className="text-[10px] px-2 py-1 bg-[#F0EBD8] rounded text-slate-600">
                                        {task}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {outreachPack.outreachPack.warnings.length > 0 && (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-amber-600" />
                            <h4 className="font-medium text-amber-800 text-sm">合规提醒</h4>
                          </div>
                          <ul className="space-y-1">
                            {outreachPack.outreachPack.warnings.map((warning, idx) => (
                              <li key={idx} className="text-xs text-amber-700">• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                          <Sparkles size={32} className="text-[#D4AF37]" />
                        </div>
                        <p className="text-slate-300">点击"生成个性化外联方案"开始</p>
                        <p className="text-xs text-slate-500 mt-2">AI 将根据客户画像和你的企业证据库生成定制化外联内容</p>
                        <button
                          onClick={() => handleGenerateOutreach(selectedCompany)}
                          className="mt-4 px-6 py-2.5 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors inline-flex items-center gap-2"
                        >
                          <Sparkles size={14} />
                          生成外联方案
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-[#D4AF37]" />
                </div>
                <p className="text-slate-300">选择一个线索查看详情</p>
                <p className="text-xs text-slate-500 mt-2">生成个性化的外联方案</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
