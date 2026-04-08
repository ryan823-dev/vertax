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
  BookmarkPlus,
  Plus,
  Edit2,
  Trash2,
  Linkedin,
  Shield,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  PhoneCall,
  History,
  Download,
  Link2 as LinkIcon,
} from 'lucide-react';
import {
  getProspectCompaniesV2,
  getProspectContacts,
  createProspectContact,
  updateProspectContact,
  deleteProspectContact,
  generateProspectDossier,
  getLatestProspectDossier,
  enrichProspectCompanyAction,
  type ProspectCompanyData,
  type ProspectContactData,
  type CreateProspectContactInput,
} from '@/actions/radar-v2';
import { executeSkill } from '@/actions/skills';
import { SKILL_NAMES } from '@/lib/skills/registry';
import { saveContent } from '@/actions/marketing';
import {
  getOutreachRecords,
  generateOutreachDraft,
  sendOutreachDraft,
  recordManualOutreach,
  getCompanyOutreachHistory,
  saveOutreachArtifacts,
  getSavedOutreachArtifacts,
  type OutreachRecordItem,
  type OutreachStats,
  type OutreachDraft,
  type CompanyOutreachRecord,
} from '@/actions/outreach-draft';
import { suggestLinksForProspect } from '@/actions/radar-content-links';
import { exportProspectsToCSV } from '@/actions/prospect-export';

// ==================== 类型 ====================

interface OutreachPackContent {
  timestamp?: string;
  version?: number;
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
  const [activeTab, setActiveTab] = useState<'info' | 'contacts' | 'outreach' | 'dossier'>('info');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);

  // 联系人 state
  const [contacts, setContacts] = useState<ProspectContactData[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ProspectContactData | null>(null);
  const [contactForm, setContactForm] = useState<Partial<CreateProspectContactInput>>({});

  // 背调简报 state
  const [dossierData, setDossierData] = useState<{ id: string; version: number; content: Record<string, unknown>; createdAt: Date } | null>(null);
  const [isGeneratingDossier, setIsGeneratingDossier] = useState(false);
  const [dossierExpanded, setDossierExpanded] = useState<Record<string, boolean>>({});
  
  // 筛选条件
  const [filters, setFilters] = useState({
    status: '',
    tier: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 外联记录看板（P4）
  const [outreachRecords, setOutreachRecords] = useState<OutreachRecordItem[]>([]);
  const [outreachStats, setOutreachStats] = useState<OutreachStats | null>(null);
  const [outreachView, setOutreachView] = useState<'companies' | 'outreach'>('companies');
  const [outreachFilter, setOutreachFilter] = useState<'all' | 'noResponse' | 'replied' | 'pending'>('all');
  // 行内跟进草稿：key = recordId
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [isFollowingUp, setIsFollowingUp] = useState<string | null>(null);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, OutreachDraft>>({});

  // 手动外联追踪
  const [outreachHistory, setOutreachHistory] = useState<CompanyOutreachRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSendingManual, setIsSendingManual] = useState<string | null>(null);
  const [showCallResultForm, setShowCallResultForm] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<string>('');

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ count?: number; error?: string } | null>(null);

  // Task #30: 营销内容建议
  const [suggestedContents, setSuggestedContents] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportProspectsToCSV();
      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', res.filename || 'prospects.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || '导出失败');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出出错，请检查网络或联系管理员');
    } finally {
      setIsExporting(false);
    }
  };

  const handleManualEnrich = async () => {
    if (!selectedCompany) return;
    setIsEnriching(true);
    setEnrichResult(null);
    try {
      const res = await enrichProspectCompanyAction(selectedCompany.id);
      if (res.success) {
        setEnrichResult({ count: res.personCount });
        // 刷新列表和联系人
        loadData();
        if (selectedCompany.id) {
          const res = await getProspectContacts(selectedCompany.id);
          setContacts(res as any);
        }
      } else {
        setEnrichResult({ error: res.error });
      }
    } catch (err) {
      setEnrichResult({ error: String(err) });
    } finally {
      setIsEnriching(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [companyResult, outreachResult] = await Promise.all([
        getProspectCompaniesV2({
          status: filters.status || undefined,
          tier: filters.tier || undefined,
          search: filters.search || undefined,
          limit: 100,
        }),
        getOutreachRecords({ limit: 100, filter: outreachFilter }).catch(() => null),
      ]);
      setCompanies(companyResult.companies);
      setTotal(companyResult.total);
      if (outreachResult) {
        setOutreachRecords(outreachResult.records);
        setOutreachStats(outreachResult.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [filters, outreachFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 加载联系人（contacts / outreach tab 都需要）
  useEffect(() => {
    if (selectedCompany && (activeTab === 'contacts' || activeTab === 'outreach')) {
      if (contacts.length === 0) {
        setIsLoadingContacts(true);
        getProspectContacts(selectedCompany.id)
          .then(setContacts)
          .catch(() => setContacts([]))
          .finally(() => setIsLoadingContacts(false));
      }
    }
  }, [selectedCompany?.id, activeTab]);

  // 加载外联历史与营销内容建议 (Task #30 & P4)
  useEffect(() => {
    if (selectedCompany && activeTab === 'outreach') {
      const loadOutreachData = async () => {
        setIsLoadingHistory(true);
        setIsLoadingSuggestions(true);
        try {
          const [hist, suggestions] = await Promise.all([
            getCompanyOutreachHistory(selectedCompany.id),
            suggestLinksForProspect(selectedCompany.id)
          ]);
          setOutreachHistory(hist.records || []);
          setSuggestedContents(suggestions || []);
        } catch (err) {
          console.error('Failed to load outreach data:', err);
        } finally {
          setIsLoadingHistory(false);
          setIsLoadingSuggestions(false);
        }
      };
      loadOutreachData();
    }
  }, [selectedCompany?.id, activeTab]);

  // 加载背调简报（懒加载）
  useEffect(() => {
    if (selectedCompany && activeTab === 'dossier') {
      getLatestProspectDossier(selectedCompany.id)
        .then(setDossierData)
        .catch(() => setDossierData(null));
    }
  }, [selectedCompany?.id, activeTab]);

  // 加载已保存的外联包 (Task #130)
  useEffect(() => {
    if (selectedCompany && activeTab === 'outreach' && !outreachPack && !isGenerating) {
      getSavedOutreachArtifacts(selectedCompany.id)
        .then(res => {
          if (res.success && res.artifacts) {
            setOutreachPack(res.artifacts as unknown as OutreachPackContent);
          }
        });
    }
  }, [selectedCompany?.id, activeTab, outreachPack, isGenerating]);

  // 联系人 CRUD 操作
  const handleCreateContact = async () => {
    if (!selectedCompany || !contactForm.name) return;
    try {
      await createProspectContact({ ...contactForm, companyId: selectedCompany.id, name: contactForm.name! });
      setShowContactForm(false);
      setContactForm({});
      const updated = await getProspectContacts(selectedCompany.id);
      setContacts(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建联系人失败');
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact || !contactForm.name) return;
    try {
      await updateProspectContact(editingContact.id, contactForm);
      setEditingContact(null);
      setShowContactForm(false);
      setContactForm({});
      if (selectedCompany) {
        const updated = await getProspectContacts(selectedCompany.id);
        setContacts(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新联系人失败');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteProspectContact(contactId);
      if (selectedCompany) {
        const updated = await getProspectContacts(selectedCompany.id);
        setContacts(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除联系人失败');
    }
  };

  const openEditForm = (contact: ProspectContactData) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      role: contact.role || '',
      department: contact.department || '',
      seniority: contact.seniority || '',
      linkedInUrl: contact.linkedInUrl || '',
      notes: contact.notes || '',
    });
    setShowContactForm(true);
  };

  const openCreateForm = () => {
    setEditingContact(null);
    setContactForm({});
    setShowContactForm(true);
  };

  // 生成背调简报
  const handleGenerateDossier = async () => {
    if (!selectedCompany) return;
    setIsGeneratingDossier(true);
    setError(null);
    try {
      const result = await generateProspectDossier(selectedCompany.id);
      if (result.ok && result.content) {
        setDossierData({
          id: result.versionId || '',
          version: (dossierData?.version || 0) + 1,
          content: result.content,
          createdAt: new Date(),
        });
      } else {
        setError(result.error || '生成简报失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成简报失败');
    } finally {
      setIsGeneratingDossier(false);
    }
  };

  // 职级标签颜色
  const getSeniorityStyle = (seniority: string | null) => {
    const map: Record<string, string> = {
      'C-level': 'bg-emerald-100 text-emerald-700',
      'VP': 'bg-blue-100 text-blue-700',
      'Director': 'bg-amber-100 text-amber-700',
      'Manager': 'bg-slate-100 text-slate-700',
      'Staff': 'bg-gray-100 text-gray-600',
    };
    return map[seniority || ''] || 'bg-slate-100 text-slate-600';
  };

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
        const pack = result.output as unknown as OutreachPackContent;
        const newEntry = { ...pack, timestamp: new Date().toISOString() };
        setOutreachPack(newEntry);
        
        // Task #130: 持久化保存生成的工具包
        await saveOutreachArtifacts(company.id, pack);

        // Task #124: 更新本地状态以立即显示版本历史
        setSelectedCompany((prev: any) => {
          if (!prev || prev.id !== company.id) return prev;
          const current = prev.outreachArtifacts || [];
          const history = Array.isArray(current) ? current : [current];
          return {
            ...prev,
            outreachArtifacts: [newEntry, ...history].slice(0, 10)
          };
        });
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

  const handleSaveToLibrary = async () => {
    if (!outreachPack || !selectedCompany) return;
    setIsSaving(true);
    try {
      const pack = outreachPack.outreachPack;
      const emailBodies = pack.emails.map((e: { subject: string; body: string }, i: number) =>
        `### Email ${i + 1}: ${e.subject}\n\n${e.body}`
      ).join('\n\n---\n\n');
      const contentText = [
        `# Outreach Pack: ${selectedCompany.name}`,
        `**Tier:** ${pack.forTier}  |  **Persona:** ${pack.forPersona}`,
        '\n## Opening Lines',
        ...pack.openings.map((o: { text: string }, i: number) => `${i + 1}. ${o.text}`),
        '\n## Emails',
        emailBodies,
        pack.whatsapps.length ? '\n## WhatsApp Messages' : '',
        ...pack.whatsapps.map((w: { text: string }, i: number) => `${i + 1}. ${w.text}`),
        pack.warnings.length ? '\n## Notes\n' + pack.warnings.map((w: string) => `- ${w}`).join('\n') : '',
      ].filter(Boolean).join('\n');
      const saved = await saveContent({
        title: `Outreach: ${selectedCompany.name}`,
        content: contentText,
        keywords: [selectedCompany.name, pack.forTier, 'outreach'],
        status: 'draft',
      });
      setSavedContentId(saved.id);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 生成行内跟进草稿
  const handleFollowUp = async (record: OutreachRecordItem) => {
    if (!record.candidateId) return;
    setExpandedRecord(record.id);
    if (inlineDrafts[record.id]) return; // 已有草稿，只展开
    setIsFollowingUp(record.id);
    try {
      const result = await generateOutreachDraft(record.candidateId, record.toEmail);
      if (result.success && result.draft) {
        setInlineDrafts(prev => ({ ...prev, [record.id]: result.draft! }));
      } else {
        setError(result.error || '生成草稿失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成草稿失败');
    } finally {
      setIsFollowingUp(null);
    }
  };

  // 发送行内跟进草稿
  const handleSendFollowUp = async (recordId: string) => {
    const draft = inlineDrafts[recordId];
    if (!draft) return;
    try {
      const result = await sendOutreachDraft(draft);
      if (result.success) {
        setInlineDrafts(prev => { const n = { ...prev }; delete n[recordId]; return n; });
        setExpandedRecord(null);
        loadData();
      } else {
        setError(result.error || '发送失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    }
  };

  // 更新行内草稿内容
  const updateInlineDraft = (recordId: string, field: 'subject' | 'body', value: string) => {
    setInlineDrafts(prev => ({
      ...prev,
      [recordId]: { ...prev[recordId], [field]: value },
    }));
  };

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
              onClick={handleExport}
              disabled={isExporting}
              title="导出 CSV"
              className={`p-2 rounded-lg transition-colors ${isExporting ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'text-slate-400 hover:text-[#D4AF37]'}`}
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
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

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-[#F0EBD8] rounded-xl p-1 w-full">
        <button
          onClick={() => setOutreachView('companies')}
          className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all truncate ${
            outreachView === 'companies'
              ? 'bg-white text-[#0B1B2B] shadow-sm'
              : 'text-slate-500 hover:text-[#0B1B2B]'
          }`}
        >
          <Users size={14} />
          线索库 ({total})
        </button>
        <button
          onClick={() => setOutreachView('outreach')}
          className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all truncate ${
            outreachView === 'outreach'
              ? 'bg-white text-[#0B1B2B] shadow-sm'
              : 'text-slate-500 hover:text-[#0B1B2B]'
          }`}
        >
          <Send size={14} />
          外联跟踪
          {outreachStats && outreachStats.noResponse > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {outreachStats.noResponse}
            </span>
          )}
        </button>
      </div>

      {/* 外联跟踪看板（P4）*/}
      {outreachView === 'outreach' && (
        <div className="space-y-4">
          {/* 统计卡 */}
          {outreachStats && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '已发送', value: outreachStats.sent, color: 'text-[#0B1B2B]' },
                { label: '回复率', value: `${outreachStats.replyRate}%`, color: 'text-blue-600' },
                {
                  label: '平均回复',
                  value: outreachStats.avgReplyDays != null ? `${outreachStats.avgReplyDays}天` : '—',
                  color: 'text-emerald-600',
                },
                { label: '7天无响应', value: outreachStats.noResponse, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#F7F3E8] rounded-xl border border-[#E8E0D0] p-4 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* 子 Tab：过滤器 */}
          <div className="flex gap-1 bg-[#F0EBD8] rounded-xl p-1 w-full">
            {([
              { key: 'all', label: '全部' },
              { key: 'pending', label: '待跟进' },
              { key: 'replied', label: '已回复' },
              { key: 'noResponse', label: '无响应', badge: outreachStats?.noResponse },
            ] as const).map((item) => {
              const { key, label } = item;
              const badge = 'badge' in item ? item.badge : undefined;
              return (
                <button
                  key={key}
                  onClick={() => setOutreachFilter(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  outreachFilter === key
                    ? 'bg-white text-[#0B1B2B] shadow-sm'
                    : 'text-slate-500 hover:text-[#0B1B2B]'
                }`}
              >
                {label}
                {badge != null && badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            )})}
          </div>

          {/* 外联记录列表 */}
          {outreachRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              {outreachFilter === 'all' ? '暂无外联记录，去候选池发送开发信吧' : '该分类暂无记录'}
            </div>
          ) : (
            <div className="space-y-2">
              {outreachRecords.map(record => {
                const isNoResponse = record.sentAt && !record.openedAt &&
                  new Date(record.sentAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const isExpanded = expandedRecord === record.id;
                const draft = inlineDrafts[record.id];

                return (
                  <div
                    key={record.id}
                    className={`rounded-xl border transition-all ${
                      isNoResponse
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-[#F7F3E8] border-[#E8E0D0]'
                    }`}
                  >
                    {/* 记录行 */}
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#0B1B2B] truncate">
                            {record.candidateName || record.toName || record.toEmail}
                          </span>
                          {record.candidateCountry && (
                            <span className="text-[10px] text-slate-400 shrink-0">{record.candidateCountry}</span>
                          )}
                          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${
                            record.status === 'opened' ? 'bg-emerald-100 text-emerald-700' :
                            record.status === 'replied' ? 'bg-blue-100 text-blue-700' :
                            record.status === 'bounced' ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {record.status === 'opened' ? '已打开' :
                             record.status === 'replied' ? '已回复' :
                             record.status === 'bounced' ? '退信' :
                             record.status === 'sent' ? '已发送' : record.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{record.subject}</div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                          <span>{record.toEmail}</span>
                          {record.sentAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(record.sentAt).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                          {isNoResponse && (
                            <span className="text-red-500 font-semibold">· 7天无响应</span>
                          )}
                        </div>
                      </div>
                      {record.candidateId && record.status !== 'replied' && (
                        <button
                          onClick={() => handleFollowUp(record)}
                          disabled={isFollowingUp === record.id}
                          className={`shrink-0 px-3 py-1.5 text-[11px] rounded-lg transition-colors disabled:opacity-50 ${
                            isNoResponse
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                          }`}
                        >
                          {isFollowingUp === record.id ? (
                            <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" />生成中</span>
                          ) : '发跟进'}
                        </button>
                      )}
                    </div>

                    {/* 行内草稿展开区 */}
                    {isExpanded && (
                      <div className="border-t border-[#E8E0D0] px-4 pb-4 pt-3 space-y-2">
                        {draft ? (
                          <>
                            <div className="text-[10px] text-slate-400 mb-1">
                              收件人：<span className="text-slate-600">{draft.toEmail}</span>
                            </div>
                            <input
                              value={draft.subject}
                              onChange={e => updateInlineDraft(record.id, 'subject', e.target.value)}
                              className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                              placeholder="邮件主题"
                            />
                            <textarea
                              value={draft.body}
                              onChange={e => updateInlineDraft(record.id, 'body', e.target.value)}
                              rows={5}
                              className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs leading-relaxed resize-none focus:outline-none focus:border-[#D4AF37] bg-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSendFollowUp(record.id)}
                                className="flex-1 py-2 bg-[#D4AF37] text-[#0B1B2B] rounded-xl text-xs font-medium hover:bg-[#C5A030] transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Send size={11} />
                                发送跟进邮件
                              </button>
                              <button
                                onClick={() => setExpandedRecord(null)}
                                className="px-3 py-2 border border-[#E8E0D0] rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                收起
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                            <span className="text-xs text-slate-400 ml-2">AI 生成跟进草稿中...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 线索库（原内容，切换显示）*/}
      {outreachView === 'companies' && (
      <>
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
                  href="/customer/radar/candidates"
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
                      // Task #124: 加载已保存的外联工具包
                      const artifacts = company.outreachArtifacts;
                      if (Array.isArray(artifacts) && artifacts.length > 0) {
                        setOutreachPack(artifacts[0] as any); // Load latest
                      } else if (artifacts && !Array.isArray(artifacts)) {
                        setOutreachPack(artifacts as any); // Legacy support
                      } else {
                        setOutreachPack(null);
                      }
                      setActiveTab('info');
                      setContacts([]);
                      setDossierData(null);
                      setShowContactForm(false);
                      setOutreachHistory([]);
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
                      {(company._count?.contacts ?? 0) > 0 && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
                          <Users size={10} />
                          {company._count!.contacts}
                        </span>
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
              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-2 flex gap-1 w-full">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 min-w-0 py-2 rounded-xl text-sm font-medium transition-all truncate ${
                    activeTab === 'info'
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'text-[#4A5568] hover:text-[#0B1B2B]'
                  }`}
                >
                  基本信息
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`flex-1 min-w-0 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 truncate ${
                    activeTab === 'contacts'
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'text-[#4A5568] hover:text-[#0B1B2B]'
                  }`}
                >
                  <Users size={13} />
                  联系人
                  {contacts.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === 'contacts' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-slate-200 text-slate-500'
                    }`}>{contacts.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('outreach')}
                  className={`flex-1 min-w-0 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 truncate ${
                    activeTab === 'outreach'
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'text-[#4A5568] hover:text-[#0B1B2B]'
                  }`}
                >
                  <Sparkles size={13} />
                  外联方案
                </button>
                <button
                  onClick={() => setActiveTab('dossier')}
                  className={`flex-1 min-w-0 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 truncate ${
                    activeTab === 'dossier'
                      ? 'bg-[#0B1220] text-[#D4AF37]'
                      : 'text-[#4A5568] hover:text-[#0B1B2B]'
                  }`}
                >
                  <Shield size={13} />
                  背调简报
                  {dossierData && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === 'dossier' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-emerald-100 text-emerald-600'
                    }`}>v{dossierData.version}</span>
                  )}
                </button>
              </div>

              {activeTab === 'info' && (
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
                    {/* Task #137: Manual Enrichment Button */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={handleManualEnrich}
                        disabled={isEnriching}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isEnriching 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-[#0B1220] text-[#D4AF37] hover:bg-[#1A2634]'
                        }`}
                      >
                        {isEnriching ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {isEnriching ? '丰富化中...' : '深度丰富化'}
                      </button>
                      {enrichResult?.count !== undefined && (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          ✨ 已发现 {enrichResult.count} 个联系人
                        </span>
                      )}
                      {enrichResult?.error && (
                        <span className="text-[10px] text-red-500 font-medium">
                          ❌ {enrichResult.error}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task #140: AI Matching Insights */}
                  {(selectedCompany.matchReasons || (selectedCompany as any).approachAngle) && (
                    <div className="mb-6 p-4 bg-[#0B1220] rounded-xl border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-[#D4AF37]" />
                        <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">AI 匹配洞察</span>
                      </div>
                      
                      {selectedCompany.matchReasons && Array.isArray(selectedCompany.matchReasons) && (selectedCompany.matchReasons.length > 0) && (
                        <div className="space-y-2 mb-4">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">核心匹配理由:</p>
                          <div className="flex flex-wrap gap-2">
                            {(selectedCompany.matchReasons as string[]).map((reason, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-1 rounded-md">
                                <Check size={10} className="text-[#D4AF37]" />
                                <span className="text-xs text-slate-200">{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(selectedCompany as any).approachAngle && (
                        <div className="pt-3 border-t border-white/5">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mb-1.5">建议切入点:</p>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{(selectedCompany as any).approachAngle}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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
              )}

              {activeTab === 'contacts' && (
                /* Contacts Tab */
                <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-[#D4AF37]" />
                      <h4 className="font-bold text-[#0B1B2B]">联系人</h4>
                      <span className="text-xs text-slate-400">{contacts.length} 人</span>
                    </div>
                    <button
                      onClick={openCreateForm}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-[#0B1220] rounded-lg text-xs font-medium hover:bg-[#C5A030] transition-colors"
                    >
                      <Plus size={13} />
                      添加联系人
                    </button>
                  </div>

                  {/* Contact Form */}
                  {showContactForm && (
                    <div className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4 mb-4">
                      <h5 className="text-sm font-medium text-[#0B1B2B] mb-3">
                        {editingContact ? '编辑联系人' : '新增联系人'}
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 mb-1 block">姓名 *</label>
                          <input
                            value={contactForm.name || ''}
                            onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                            placeholder="联系人姓名"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-1 block">职位</label>
                          <input
                            value={contactForm.role || ''}
                            onChange={e => setContactForm({ ...contactForm, role: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                            placeholder="如 VP of Sales"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-1 block">邮箱</label>
                          <input
                            value={contactForm.email || ''}
                            onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-1 block">电话</label>
                          <input
                            value={contactForm.phone || ''}
                            onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                            placeholder="+1 xxx-xxx-xxxx"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-1 block">部门</label>
                          <input
                            value={contactForm.department || ''}
                            onChange={e => setContactForm({ ...contactForm, department: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                            placeholder="如 Engineering"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-1 block">职级</label>
                          <select
                            value={contactForm.seniority || ''}
                            onChange={e => setContactForm({ ...contactForm, seniority: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                          >
                            <option value="">选择职级</option>
                            <option value="C-level">C-level</option>
                            <option value="VP">VP</option>
                            <option value="Director">Director</option>
                            <option value="Manager">Manager</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 mb-1 block">LinkedIn</label>
                          <input
                            value={contactForm.linkedInUrl || ''}
                            onChange={e => setContactForm({ ...contactForm, linkedInUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E0D0] rounded-lg text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                            placeholder="https://linkedin.com/in/..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={editingContact ? handleUpdateContact : handleCreateContact}
                          disabled={!contactForm.name}
                          className="flex-1 py-2 bg-[#D4AF37] text-[#0B1220] rounded-xl text-xs font-medium hover:bg-[#C5A030] transition-colors disabled:opacity-50"
                        >
                          {editingContact ? '保存修改' : '添加'}
                        </button>
                        <button
                          onClick={() => { setShowContactForm(false); setEditingContact(null); setContactForm({}); }}
                          className="px-4 py-2 border border-[#E8E0D0] rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Contact List */}
                  {isLoadingContacts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
                      <span className="text-xs text-slate-400 ml-2">加载联系人...</span>
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="relative rounded-2xl overflow-hidden py-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)' }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-3">
                          <Users size={24} className="text-[#D4AF37]" />
                        </div>
                        <p className="text-slate-300 text-sm">暂无联系人</p>
                        <p className="text-xs text-slate-500 mt-1">添加决策者联系人，或从候选池导入时自动提取</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(contact => (
                        <div key={contact.id} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4 group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-[#0B1B2B]">{contact.name}</span>
                                {contact.seniority && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getSeniorityStyle(contact.seniority)}`}>
                                    {contact.seniority}
                                  </span>
                                )}
                              </div>
                              {(contact.role || contact.department) && (
                                <p className="text-xs text-slate-500">
                                  {[contact.role, contact.department].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                {contact.email && (
                                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#D4AF37] transition-colors">
                                    <Mail size={11} />
                                    {contact.email}
                                  </a>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <Phone size={11} />
                                    {contact.phone}
                                  </span>
                                )}
                                {contact.linkedInUrl && (
                                  <a href={contact.linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 transition-colors">
                                    <Linkedin size={11} />
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditForm(contact)}
                                className="p-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors"
                                title="编辑"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                title="删除"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'outreach' && (
                /* Outreach Tab */
                <div className="space-y-4">
                  {/* Task #124: Version Selector */}
                  {Array.isArray(selectedCompany.outreachArtifacts) && (selectedCompany.outreachArtifacts as any[]).length > 1 && (
                    <div className="flex items-center gap-2 mb-4 p-2 bg-[#D4AF37]/5 rounded-xl border border-[#D4AF37]/20">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider ml-2">历史方案:</span>
                      <div className="flex gap-1 overflow-x-auto no-scrollbar">
                        {(selectedCompany.outreachArtifacts as any[]).map((entry, idx) => (
                          <button
                            key={idx}
                            onClick={() => setOutreachPack(entry)}
                            className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-all ${
                              outreachPack?.timestamp === entry.timestamp
                                ? 'bg-[#D4AF37] text-[#0B1220] font-bold shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                          >
                            版本 {entry.version || (selectedCompany.outreachArtifacts as any[]).length - idx} ({new Date(entry.timestamp).toLocaleDateString()})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                          <MessageCircle size={18} className="text-[#25D366]" />
                          <h4 className="font-bold text-[#0B1B2B]">WhatsApp 消息</h4>
                          <span className="text-xs text-slate-400 ml-auto">
                            {outreachPack.outreachPack.whatsapps.length} 条
                          </span>
                        </div>

                        {/* 联系人电话选择提示 */}
                        {contacts.filter(c => c.phone).length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {contacts.filter(c => c.phone).map(c => (
                              <span key={c.id} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                <Phone size={10} className="inline mr-1" />
                                {c.name}: {c.phone}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="space-y-3">
                          {outreachPack.outreachPack.whatsapps.map((wa, idx) => (
                            <div key={idx} className="bg-[#DCF8C6] rounded-xl p-4 relative group">
                              <p className="text-sm text-slate-800 leading-relaxed pr-20">{wa.text}</p>

                              {/* Action buttons */}
                              <div className="absolute top-3 right-3 flex items-center gap-1">
                                {/* Copy */}
                                <button
                                  onClick={() => handleCopy(wa.text, `wa-${idx}`)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 transition-colors"
                                  title="复制消息"
                                >
                                  {copiedId === `wa-${idx}` ? (
                                    <Check size={14} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>

                                {/* Open WhatsApp — pick first contact with phone */}
                                {contacts.filter(c => c.phone).length > 0 && (
                                  <a
                                    href={`https://wa.me/${contacts.find(c => c.phone)!.phone!.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(wa.text)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-[#25D366] hover:text-[#128C7E] transition-colors"
                                    title="打开 WhatsApp"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}

                                {/* Mark as sent */}
                                <button
                                  onClick={async () => {
                                    const contact = contacts.find(c => c.phone);
                                    setIsSendingManual(`wa-${idx}`);
                                    await recordManualOutreach({
                                      companyId: selectedCompany.id,
                                      contactId: contact?.id,
                                      channel: 'whatsapp',
                                      toPhone: contact?.phone || '',
                                      toName: contact?.name || selectedCompany.name,
                                      messageText: wa.text,
                                    });
                                    setIsSendingManual(null);
                                    setCopiedId(`wa-sent-${idx}`);
                                    setTimeout(() => setCopiedId(null), 2000);
                                    // Reload history
                                    const hist = await getCompanyOutreachHistory(selectedCompany.id);
                                    setOutreachHistory(hist.records);
                                  }}
                                  disabled={isSendingManual === `wa-${idx}`}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                  title="标记为已发送"
                                >
                                  {copiedId === `wa-sent-${idx}` ? (
                                    <Check size={14} className="text-emerald-600" />
                                  ) : isSendingManual === `wa-${idx}` ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Send size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Phone Outreach */}
                      {contacts.filter(c => c.phone).length > 0 && (
                        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <PhoneCall size={18} className="text-[#D4AF37]" />
                            <h4 className="font-bold text-[#0B1B2B]">电话外联</h4>
                          </div>
                          <div className="space-y-3">
                            {contacts.filter(c => c.phone).map(contact => (
                              <div key={contact.id} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="text-sm font-medium text-[#0B1B2B]">{contact.name}</span>
                                    {contact.role && <span className="text-xs text-slate-500 ml-2">{contact.role}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="flex items-center gap-1 text-xs bg-[#D4AF37] text-white px-3 py-1.5 rounded-lg hover:bg-[#B8973B] transition-colors"
                                    >
                                      <Phone size={12} />
                                      {contact.phone}
                                    </a>
                                  </div>
                                </div>

                                {/* Call result form */}
                                {showCallResultForm === contact.id ? (
                                  <div className="mt-3 pt-3 border-t border-[#E8E0D0]">
                                    <p className="text-xs text-slate-500 mb-2">通话结果:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        { value: 'connected', label: '已接通', color: 'emerald' },
                                        { value: 'no_answer', label: '未接听', color: 'amber' },
                                        { value: 'voicemail', label: '留言', color: 'blue' },
                                        { value: 'meeting_booked', label: '已约会议', color: 'emerald' },
                                        { value: 'not_interested', label: '无意向', color: 'red' },
                                        { value: 'callback', label: '回拨', color: 'blue' },
                                      ].map(opt => (
                                        <button
                                          key={opt.value}
                                          onClick={async () => {
                                            setIsSendingManual(contact.id);
                                            await recordManualOutreach({
                                              companyId: selectedCompany.id,
                                              contactId: contact.id,
                                              channel: 'phone',
                                              toPhone: contact.phone || '',
                                              toName: contact.name,
                                              callResult: opt.value,
                                            });
                                            setIsSendingManual(null);
                                            setShowCallResultForm(null);
                                            const hist = await getCompanyOutreachHistory(selectedCompany.id);
                                            setOutreachHistory(hist.records);
                                          }}
                                          disabled={isSendingManual === contact.id}
                                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                            opt.color === 'emerald' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' :
                                            opt.color === 'amber' ? 'border-amber-200 text-amber-700 hover:bg-amber-50' :
                                            opt.color === 'blue' ? 'border-blue-200 text-blue-700 hover:bg-blue-50' :
                                            'border-red-200 text-red-700 hover:bg-red-50'
                                          }`}
                                        >
                                          {isSendingManual === contact.id ? '...' : opt.label}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setShowCallResultForm(null)}
                                      className="text-xs text-slate-400 hover:text-slate-600 mt-2"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowCallResultForm(contact.id)}
                                    className="text-xs text-slate-500 hover:text-[#D4AF37] transition-colors mt-1"
                                  >
                                    记录通话结果
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Task #30: Suggested Marketing Content */}
                      <div className="bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/20 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Target size={18} className="text-[#D4AF37]" />
                          <h4 className="font-bold text-[#0B1B2B]">匹配营销内容</h4>
                          <span className="text-[10px] text-[#D4AF37] font-medium border border-[#D4AF37]/30 px-1.5 py-0.5 rounded uppercase">
                            AI 智能匹配
                          </span>
                        </div>
                        
                        {isLoadingSuggestions ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 size={16} className="text-[#D4AF37] animate-spin" />
                          </div>
                        ) : suggestedContents.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4 italic">
                            暂无高匹配度的营销文章，建议先在营销中心发布相关内容。
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {suggestedContents.map((suggestion, idx) => (
                              <div key={idx} className="bg-white rounded-xl border border-[#E8E0D0] p-4 group hover:border-[#D4AF37]/50 transition-all">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <h5 className="text-sm font-bold text-[#0B1B2B] mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                                      {suggestion.title}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 line-clamp-1">
                                      {suggestion.reason}
                                    </p>
                                  </div>
                                  <Link 
                                    href={`/customer/marketing/contents/${suggestion.contentId}`}
                                    className="p-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors"
                                    title="查看内容"
                                  >
                                    <ExternalLink size={14} />
                                  </Link>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                  <div className="flex gap-1">
                                    {suggestion.matchedKeywords.slice(0, 2).map((kw: string, kidx: number) => (
                                      <span key={kidx} className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">
                                        #{kw}
                                      </span>
                                    ))}
                                  </div>
                                  <button 
                                    onClick={() => handleCopy(`${process.env.NEXT_PUBLIC_APP_URL}/blog/${suggestion.slug}`, `content-link-${idx}`)}
                                    className="text-[10px] font-bold text-[#D4AF37] flex items-center gap-1 hover:underline"
                                  >
                                    {copiedId === `content-link-${idx}` ? (
                                      <><Check size={10} /> 已复制链接</>
                                    ) : (
                                      <><LinkIcon size={10} /> 复制文章链接</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Outreach History */}
                      <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <History size={18} className="text-[#D4AF37]" />
                            <h4 className="font-bold text-[#0B1B2B]">外联记录</h4>
                          </div>
                          <button
                            onClick={async () => {
                              setIsLoadingHistory(true);
                              const hist = await getCompanyOutreachHistory(selectedCompany.id);
                              setOutreachHistory(hist.records);
                              setIsLoadingHistory(false);
                            }}
                            className="text-xs text-[#D4AF37] hover:text-[#B8973B] flex items-center gap-1"
                          >
                            {isLoadingHistory ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            刷新
                          </button>
                        </div>
                        {outreachHistory.length === 0 ? (
                          <button
                            onClick={async () => {
                              setIsLoadingHistory(true);
                              const hist = await getCompanyOutreachHistory(selectedCompany.id);
                              setOutreachHistory(hist.records);
                              setIsLoadingHistory(false);
                            }}
                            className="w-full py-6 text-center text-sm text-slate-400 hover:text-[#D4AF37] transition-colors"
                          >
                            {isLoadingHistory ? '加载中...' : '点击加载外联历史'}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {outreachHistory.map(record => (
                              <div key={record.id} className="flex items-start gap-3 py-2 border-b border-[#E8E0D0] last:border-0">
                                <div className={`mt-0.5 p-1.5 rounded-full ${
                                  record.channel === 'email' ? 'bg-blue-100' :
                                  record.channel === 'whatsapp' ? 'bg-emerald-100' :
                                  record.channel === 'phone' ? 'bg-amber-100' :
                                  record.channel === 'linkedin' ? 'bg-sky-100' :
                                  'bg-slate-100'
                                }`}>
                                  {record.channel === 'email' ? <Mail size={12} className="text-blue-600" /> :
                                   record.channel === 'whatsapp' ? <MessageCircle size={12} className="text-emerald-600" /> :
                                   record.channel === 'phone' ? <PhoneCall size={12} className="text-amber-600" /> :
                                   record.channel === 'linkedin' ? <Linkedin size={12} className="text-sky-600" /> :
                                   <Send size={12} className="text-slate-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[#0B1B2B] capitalize">{record.channel}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      record.status === 'manual_sent' || record.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                                      record.status === 'draft_copied' ? 'bg-amber-100 text-amber-700' :
                                      record.status === 'opened' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {record.status === 'manual_sent' ? '已发送' :
                                       record.status === 'draft_copied' ? '已复制' :
                                       record.status}
                                    </span>
                                    {record.callResult && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        record.callResult === 'meeting_booked' ? 'bg-emerald-100 text-emerald-700' :
                                        record.callResult === 'connected' ? 'bg-blue-100 text-blue-700' :
                                        record.callResult === 'not_interested' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {record.callResult === 'connected' ? '已接通' :
                                         record.callResult === 'no_answer' ? '未接听' :
                                         record.callResult === 'voicemail' ? '留言' :
                                         record.callResult === 'meeting_booked' ? '已约会议' :
                                         record.callResult === 'not_interested' ? '无意向' :
                                         record.callResult === 'callback' ? '回拨' :
                                         record.callResult}
                                      </span>
                                    )}
                                  </div>
                                  {record.toName && (
                                    <p className="text-xs text-slate-500 mt-0.5">{record.toName}{record.toPhone ? ` · ${record.toPhone}` : ''}</p>
                                  )}
                                  {record.messageText && (
                                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{record.messageText}</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {record.sentAt ? new Date(record.sentAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
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
                      {/* 保存到内容库 */}
                      <div className="mt-4 pt-4 border-t border-[#30405A] flex justify-end">
                        {savedContentId ? (
                          <Link
                            href={`/customer/marketing/contents/${savedContentId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-600/30 transition-colors"
                          >
                            <Check size={14} />
                            已保存—点击查看
                          </Link>
                        ) : (
                          <button
                            onClick={handleSaveToLibrary}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-[#30405A] text-slate-300 rounded-xl text-sm font-medium hover:bg-[#3A4F70] transition-colors disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
                            保存到内容库
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                          <Sparkles size={32} className="text-[#D4AF37]" />
                        </div>
                        <p className="text-slate-300">点击「生成个性化外联方案」开始</p>
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

              {activeTab === 'dossier' && (
                /* Dossier Tab - 背调简报 */
                <div className="space-y-4">
                  {isGeneratingDossier ? (
                    <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
                      <div className="relative">
                        <Loader2 size={40} className="text-[#D4AF37] mx-auto mb-4 animate-spin" />
                        <p className="text-slate-300">AI 正在为 {selectedCompany.name} 生成背调简报...</p>
                        <p className="text-xs text-slate-500 mt-2">基于已采集数据综合分析，不会编造信息</p>
                      </div>
                    </div>
                  ) : dossierData?.content ? (
                    <>
                      {/* Version indicator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Shield size={14} className="text-[#D4AF37]" />
                          <span>v{dossierData.version}</span>
                          <span>·</span>
                          <span>{new Date(dossierData.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                        <button
                          onClick={handleGenerateDossier}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4AF37] text-[#D4AF37] rounded-lg text-xs font-medium hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          <RefreshCw size={12} />
                          重新生成
                        </button>
                      </div>

                      {(() => {
                        const dossier = (dossierData.content as Record<string, unknown>).dossier as Record<string, unknown> | undefined
                          ?? dossierData.content as Record<string, unknown>;

                        const renderDataGaps = (gaps: string[] | undefined) => {
                          if (!gaps || gaps.length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#E8E0D0]">
                              {gaps.map((gap, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                                  {gap}
                                </span>
                              ))}
                            </div>
                          );
                        };

                        const companyOverview = dossier.companyOverview as { summary?: string; keyFacts?: Array<{ label: string; value: string; source: string }>; dataGaps?: string[] } | undefined;
                        const decisionMakers = dossier.decisionMakerAnalysis as { contacts?: Array<{ name: string; role: string; seniority: string; influence: string; approachAngle: string; source: string }>; orgStructureInsight?: string; dataGaps?: string[] } | undefined;
                        const bizOpps = dossier.businessOpportunities as { opportunities?: Array<{ title: string; stage: string; value: string; deadline: string; relevance: string }>; dataGaps?: string[] } | undefined;
                        const intel = dossier.intelligenceSummary as { funding?: string; news?: string; competitors?: string; dataGaps?: string[] } | undefined;
                        const matchAnalysis = dossier.matchAnalysis as { overallScore?: number | null; matchReasons?: string[]; relevanceInsights?: string[]; dataGaps?: string[] } | undefined;
                        const riskAlerts = dossier.riskAlerts as Array<{ risk: string; severity: string; basis: string }> | undefined;
                        const approach = dossier.recommendedApproach as { nextSteps?: Array<{ action: string; priority: string; rationale: string }>; talkingPoints?: string[]; avoidTopics?: string[] } | undefined;
                        const dataSources = dossier.dataSources as Array<{ field: string; source: string; status: string }> | undefined;

                        return (
                          <>
                            {/* 1. 公司概况 */}
                            {companyOverview && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <Building2 size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">公司概况</h4>
                                </div>
                                {companyOverview.summary && (
                                  <p className="text-sm text-slate-700 leading-relaxed mb-3">{companyOverview.summary}</p>
                                )}
                                {companyOverview.keyFacts && companyOverview.keyFacts.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {companyOverview.keyFacts.map((fact, i) => (
                                      <div key={i} className="bg-[#FFFCF7] rounded-lg border border-[#E8E0D0] px-3 py-2">
                                        <div className="text-[10px] text-slate-400">{fact.label}</div>
                                        <div className="text-sm font-medium text-[#0B1B2B]">{fact.value}</div>
                                        <div className="text-[9px] text-slate-400">[{fact.source}]</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {renderDataGaps(companyOverview.dataGaps)}
                              </div>
                            )}

                            {/* 2. 决策者分析 */}
                            {decisionMakers && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <Users size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">决策者分析</h4>
                                </div>
                                {decisionMakers.contacts && decisionMakers.contacts.length > 0 ? (
                                  <div className="space-y-2 mb-3">
                                    {decisionMakers.contacts.map((c, i) => (
                                      <div key={i} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-sm text-[#0B1B2B]">{c.name}</span>
                                          {c.seniority && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getSeniorityStyle(c.seniority)}`}>{c.seniority}</span>
                                          )}
                                          <span className="text-[10px] text-slate-400 ml-auto">[{c.source}]</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{c.role}</p>
                                        {c.influence && <p className="text-xs text-slate-600 mt-1">影响力: {c.influence}</p>}
                                        {c.approachAngle && <p className="text-xs text-[#D4AF37] mt-1">接触策略: {c.approachAngle}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {decisionMakers.orgStructureInsight && (
                                  <p className="text-sm text-slate-600 leading-relaxed">{decisionMakers.orgStructureInsight}</p>
                                )}
                                {renderDataGaps(decisionMakers.dataGaps)}
                              </div>
                            )}

                            {/* 3. 商业机会 */}
                            {bizOpps && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <Target size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">商业机会</h4>
                                </div>
                                {bizOpps.opportunities && bizOpps.opportunities.length > 0 ? (
                                  <div className="space-y-2">
                                    {bizOpps.opportunities.map((opp, i) => (
                                      <div key={i} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-medium text-[#0B1B2B]">{opp.title}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{opp.stage}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                          {opp.value && <span>价值: {opp.value}</span>}
                                          {opp.deadline && <span>截止: {opp.deadline}</span>}
                                        </div>
                                        {opp.relevance && <p className="text-xs text-slate-600 mt-1">{opp.relevance}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {renderDataGaps(bizOpps.dataGaps)}
                              </div>
                            )}

                            {/* 4. 情报摘要 */}
                            {intel && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <TrendingUp size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">情报摘要</h4>
                                </div>
                                <div className="space-y-3">
                                  {intel.funding && (
                                    <div>
                                      <h5 className="text-xs font-medium text-slate-500 mb-1">融资动态</h5>
                                      <p className="text-sm text-slate-700 leading-relaxed">{intel.funding}</p>
                                    </div>
                                  )}
                                  {intel.news && (
                                    <div>
                                      <h5 className="text-xs font-medium text-slate-500 mb-1">新闻舆情</h5>
                                      <p className="text-sm text-slate-700 leading-relaxed">{intel.news}</p>
                                    </div>
                                  )}
                                  {intel.competitors && (
                                    <div>
                                      <h5 className="text-xs font-medium text-slate-500 mb-1">竞品态势</h5>
                                      <p className="text-sm text-slate-700 leading-relaxed">{intel.competitors}</p>
                                    </div>
                                  )}
                                </div>
                                {renderDataGaps(intel.dataGaps)}
                              </div>
                            )}

                            {/* 5. 匹配度分析 */}
                            {matchAnalysis && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <Star size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">匹配度分析</h4>
                                  {matchAnalysis.overallScore != null && (
                                    <span className="ml-auto text-lg font-bold text-[#D4AF37]">{Math.round(matchAnalysis.overallScore * 100)}%</span>
                                  )}
                                </div>
                                {matchAnalysis.overallScore != null && (
                                  <div className="w-full bg-[#E8E0D0] rounded-full h-2 mb-3">
                                    <div className="bg-[#D4AF37] h-2 rounded-full transition-all" style={{ width: `${Math.round(matchAnalysis.overallScore * 100)}%` }} />
                                  </div>
                                )}
                                {matchAnalysis.matchReasons && matchAnalysis.matchReasons.length > 0 && (
                                  <div className="mb-2">
                                    <h5 className="text-xs font-medium text-slate-500 mb-1">匹配原因</h5>
                                    <ul className="space-y-1">
                                      {matchAnalysis.matchReasons.map((r, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                          <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                          {r}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {matchAnalysis.relevanceInsights && matchAnalysis.relevanceInsights.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-medium text-slate-500 mb-1">关联洞察</h5>
                                    <ul className="space-y-1">
                                      {matchAnalysis.relevanceInsights.map((r, i) => (
                                        <li key={i} className="text-sm text-slate-600">- {r}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {renderDataGaps(matchAnalysis.dataGaps)}
                              </div>
                            )}

                            {/* 6. 风险提示 */}
                            {riskAlerts && riskAlerts.length > 0 && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <AlertCircle size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">风险提示</h4>
                                </div>
                                <div className="space-y-2">
                                  {riskAlerts.map((alert, i) => (
                                    <div key={i} className={`rounded-xl border p-3 ${
                                      alert.severity === 'high' ? 'bg-red-50/60 border-red-200' :
                                      alert.severity === 'medium' ? 'bg-amber-50/60 border-amber-200' :
                                      'bg-emerald-50/60 border-emerald-200'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                          alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                                          alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                          'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {alert.severity === 'high' ? '高风险' : alert.severity === 'medium' ? '中风险' : '低风险'}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-700">{alert.risk}</p>
                                      <p className="text-[11px] text-slate-500 mt-1">依据: {alert.basis}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 7. 建议策略 */}
                            {approach && (
                              <div className="bg-[#F7F3E8] rounded-2xl border-2 border-[#D4AF37]/30 p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <Sparkles size={18} className="text-[#D4AF37]" />
                                  <h4 className="font-bold text-[#0B1B2B]">建议策略</h4>
                                </div>
                                {approach.nextSteps && approach.nextSteps.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-medium text-slate-500 mb-2">下一步行动</h5>
                                    <div className="space-y-2">
                                      {approach.nextSteps.map((step, i) => (
                                        <div key={i} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] p-3 flex items-start gap-3">
                                          <span className="w-6 h-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                          </span>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                              <span className="text-sm font-medium text-[#0B1B2B]">{step.action}</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                step.priority === 'high' ? 'bg-red-50 text-red-600' :
                                                step.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                                                'bg-slate-100 text-slate-500'
                                              }`}>{step.priority === 'high' ? '优先' : step.priority === 'medium' ? '建议' : '可选'}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{step.rationale}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {approach.talkingPoints && approach.talkingPoints.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-medium text-slate-500 mb-1">沟通要点</h5>
                                    <ul className="space-y-1">
                                      {approach.talkingPoints.map((t, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                          <Check size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                                          {t}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {approach.avoidTopics && approach.avoidTopics.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-medium text-slate-500 mb-1">避免话题</h5>
                                    <div className="flex flex-wrap gap-1.5">
                                      {approach.avoidTopics.map((t, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-500 border border-red-200">{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 数据来源溯源 */}
                            {dataSources && dataSources.length > 0 && (
                              <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                                <button
                                  onClick={() => setDossierExpanded(prev => ({ ...prev, sources: !prev.sources }))}
                                  className="flex items-center gap-2 w-full text-left"
                                >
                                  <Info size={14} className="text-slate-400" />
                                  <span className="text-xs font-medium text-slate-500">数据来源溯源</span>
                                  <span className="text-[10px] text-slate-400 ml-1">
                                    {dataSources.filter(s => s.status === 'available').length}/{dataSources.length} 项可用
                                  </span>
                                  {dossierExpanded.sources ? <ChevronUp size={14} className="text-slate-400 ml-auto" /> : <ChevronDown size={14} className="text-slate-400 ml-auto" />}
                                </button>
                                {dossierExpanded.sources && (
                                  <div className="mt-3 space-y-1">
                                    {dataSources.map((ds, i) => (
                                      <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${ds.status === 'available' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                        <span className="text-slate-500 w-24 shrink-0">{ds.field}</span>
                                        <span className="text-slate-400">{ds.source}</span>
                                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                                          ds.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        }`}>{ds.status === 'available' ? '已获取' : '待补充'}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    /* Dossier Empty State */
                    <div className="relative rounded-2xl overflow-hidden p-12 text-center" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)' }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)' }} />
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                          <Shield size={32} className="text-[#D4AF37]" />
                        </div>
                        <p className="text-slate-300">AI 背调评估简报</p>
                        <p className="text-xs text-slate-500 mt-2">基于已采集数据生成综合分析，不编造信息</p>
                        <button
                          onClick={handleGenerateDossier}
                          disabled={isGeneratingDossier}
                          className="mt-4 px-6 py-2.5 bg-[#D4AF37] text-[#0B1220] rounded-xl text-sm font-medium hover:bg-[#C5A030] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {isGeneratingDossier ? (
                            <><Loader2 size={14} className="animate-spin" />生成中...</>
                          ) : (
                            <><Shield size={14} />生成背调简报</>
                          )}
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
      </> )} {/* end outreachView === 'companies' */}
    </div>
  );
}
