"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  enrichProspectCompaniesBatchAction,
  type ProspectCompanyData,
  type ProspectContactData,
  type CreateProspectContactInput,
  type ProspectEnrichmentItemResult,
} from '@/actions/radar-v2';
import { executeSkill } from '@/actions/skills';
import { SKILL_NAMES } from '@/lib/skills/names';
import { saveContent } from '@/actions/marketing';
import {
  getOutreachRecords,
  generateOutreachDraft,
  sendOutreachDraft,
  recordManualOutreach,
  getCompanyOutreachHistory,
  saveOutreachArtifacts,
  getSavedOutreachArtifacts,
  listOutreachPackVersions,
  listOutreachPackTemplates,
  saveOutreachPackDraft,
  saveOutreachPackTemplate,
  generateLinkedInDraft,
  recordLinkedInCopy,
  type OutreachRecordItem,
  type OutreachStats,
  type OutreachDraft,
  type CompanyOutreachRecord,
  type LinkedInDraft,
  type OutreachPackVersionSummary,
} from '@/actions/outreach-draft';
import { suggestLinksForProspect } from '@/actions/radar-content-links';
import { exportProspectsToCSV } from '@/actions/prospect-export';
import {
  getProspectCompanyContactSnapshot,
  getProspectCompanyOutreachContactProfile,
  getProspectOutreachVersions,
  mergeProspectContactsWithSnapshot,
  type ProspectOutreachContact,
} from '@/lib/radar/prospect-outreach-state';
import { toast } from 'sonner';

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

interface SuggestedContent {
  contentId: string;
  title: string;
  slug: string;
  score: number;
  matchedKeywords: string[];
  reason: string;
}

type ProspectCompanyView = Omit<ProspectCompanyData, 'matchReasons' | 'outreachArtifacts'> & {
  matchReasons: string[] | null;
  outreachArtifacts: OutreachPackContent[] | null;
  outreachState: ProspectCompanyData['outreachArtifacts'];
};

interface BatchEnrichmentState {
  isRunning: boolean;
  processed: number;
  total: number;
  currentLabel: string | null;
  results: ProspectEnrichmentItemResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    contactsFound: number;
  } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function extractEvidenceIdsFromText(value: string): string[] {
  return Array.from(value.matchAll(/\[(E\d+)\]/g), (match) => match[1]);
}

function normalizeReplyType(value: string): string {
  const replyTypeMap: Record<string, string> = {
    positiveResponse: 'interested',
    neutralResponse: 'need_info',
    negativeResponse: 'not_relevant',
    noResponse: 'unsubscribe',
  };

  return replyTypeMap[value] ?? value;
}

function normalizeTierValue(...values: unknown[]): 'A' | 'B' | 'C' {
  for (const value of values) {
    if (value === 'A' || value === 'B' || value === 'C') {
      return value;
    }
  }

  return 'B';
}

function toIsoTimestamp(value: unknown, fallback = new Date()): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return fallback.toISOString();
}

function normalizeOutreachPackContent(
  value: unknown,
  options?: { timestamp?: string; version?: number }
): OutreachPackContent | null {
  if (!isRecord(value)) {
    return null;
  }

  const outer = value;
  const outreachPackSource = isRecord(outer.outreachPack)
    ? outer.outreachPack
    : isRecord(outer.outreachPackage)
      ? outer.outreachPackage
      : outer;

  const openings = Array.isArray(outreachPackSource.openings)
    ? outreachPackSource.openings.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.text !== 'string') {
          return [];
        }
        return [{ text: entry.text, evidenceIds: toStringArray(entry.evidenceIds) }];
      })
    : Array.isArray(outreachPackSource.openingLines)
      ? outreachPackSource.openingLines.flatMap((entry) => {
          if (typeof entry !== 'string') {
            return [];
          }
          return [{ text: entry, evidenceIds: extractEvidenceIdsFromText(entry) }];
        })
    : [];

  const emails = Array.isArray(outreachPackSource.emails)
    ? outreachPackSource.emails.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.subject !== 'string' || typeof entry.body !== 'string') {
          return [];
        }
        const evidenceIds = toStringArray(entry.evidenceIds);
        return [{
          subject: entry.subject,
          body: entry.body,
          evidenceIds: evidenceIds.length > 0 ? evidenceIds : extractEvidenceIdsFromText(`${entry.subject}\n${entry.body}`),
        }];
      })
    : [];

  const whatsapps = Array.isArray(outreachPackSource.whatsapps)
    ? outreachPackSource.whatsapps.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.text !== 'string') {
          return [];
        }
        return [{ text: entry.text, evidenceIds: toStringArray(entry.evidenceIds) }];
      })
    : Array.isArray(outreachPackSource.whatsAppMessages)
      ? outreachPackSource.whatsAppMessages.flatMap((entry) => {
          if (typeof entry !== 'string') {
            return [];
          }
          return [{ text: entry, evidenceIds: extractEvidenceIdsFromText(entry) }];
        })
    : [];

  const playbook = Array.isArray(outreachPackSource.playbook)
    ? outreachPackSource.playbook.flatMap((entry) => {
        if (
          !isRecord(entry) ||
          typeof entry.replyType !== 'string' ||
          typeof entry.goal !== 'string' ||
          typeof entry.responseTemplate !== 'string'
        ) {
          return [];
        }
        return [{
          replyType: entry.replyType,
          goal: entry.goal,
          responseTemplate: entry.responseTemplate,
          nextStepTasks: toStringArray(entry.nextStepTasks),
          evidenceIds: toStringArray(entry.evidenceIds),
        }];
      })
    : isRecord(outreachPackSource.followUpPlaybook)
      ? Object.entries(outreachPackSource.followUpPlaybook).flatMap(([replyType, template]) => {
          if (!isRecord(template)) {
            return [];
          }
          const emailTemplate = typeof template.email === 'string' ? template.email : '';
          const whatsappTemplate = typeof template.whatsApp === 'string' ? template.whatsApp : '';
          const responseTemplate = [emailTemplate, whatsappTemplate].filter(Boolean).join('\n\nWhatsApp:\n');
          if (!responseTemplate) {
            return [];
          }
          return [{
            replyType: normalizeReplyType(replyType),
            goal: `Handle ${replyType} replies`,
            responseTemplate,
            nextStepTasks: [],
            evidenceIds: extractEvidenceIdsFromText(responseTemplate),
          }];
        })
    : [];

  const evidenceMap = Array.isArray(outreachPackSource.evidenceMap)
    ? outreachPackSource.evidenceMap.flatMap((entry) => {
        if (
          !isRecord(entry) ||
          typeof entry.label !== 'string' ||
          typeof entry.evidenceId !== 'string' ||
          typeof entry.why !== 'string'
        ) {
          return [];
        }
        return [{ label: entry.label, evidenceId: entry.evidenceId, why: entry.why }];
      })
    : [];

  const warnings = toStringArray(outreachPackSource.warnings);
  const forPersona =
    typeof outreachPackSource.forPersona === 'string'
      ? outreachPackSource.forPersona
      : typeof outer.forPersona === 'string'
        ? outer.forPersona
        : '';
  const forTier = normalizeTierValue(outreachPackSource.forTier, outer.forTier, outer.tier);

  const hasRenderableContent =
    Boolean(forPersona) ||
    openings.length > 0 ||
    emails.length > 0 ||
    whatsapps.length > 0 ||
    playbook.length > 0 ||
    evidenceMap.length > 0 ||
    warnings.length > 0;

  if (!hasRenderableContent) {
    return null;
  }

  return {
    timestamp:
      typeof outer.timestamp === 'string'
        ? outer.timestamp
        : options?.timestamp,
    version:
      typeof outer.version === 'number'
        ? outer.version
        : options?.version,
    outreachPack: {
      forPersona,
      forTier,
      openings,
      emails,
      whatsapps,
      playbook,
      evidenceMap,
      warnings,
    },
  };
}

function normalizeMatchReasons(value: ProspectCompanyData['matchReasons']): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const reasons = value.filter((entry): entry is string => typeof entry === 'string');
  return reasons.length > 0 ? reasons : null;
}

function normalizeOutreachArtifacts(
  value: ProspectCompanyData['outreachArtifacts']
): OutreachPackContent[] | null {
  const artifacts = getProspectOutreachVersions(value)
    .map((entry) => normalizeOutreachPackContent(entry))
    .filter((entry): entry is OutreachPackContent => entry !== null);

  return artifacts.length > 0 ? artifacts : null;
}

function normalizeProspectCompany(company: ProspectCompanyData): ProspectCompanyView {
  return {
    ...company,
    matchReasons: normalizeMatchReasons(company.matchReasons),
    outreachArtifacts: normalizeOutreachArtifacts(company.outreachArtifacts),
    outreachState: company.outreachArtifacts,
  };
}

function decorateOutreachPack(
  value: unknown,
  options?: { timestamp?: string; version?: number }
): OutreachPackContent | null {
  return normalizeOutreachPackContent(value, options);
}

function summarizeBatchResults(results: ProspectEnrichmentItemResult[]) {
  return {
    total: results.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    contactsFound: results.reduce((sum, item) => sum + item.personCount, 0),
  };
}

export default function RadarProspectsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<ProspectCompanyView[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<ProspectCompanyView | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [batchEnrichment, setBatchEnrichment] = useState<BatchEnrichmentState>({
    isRunning: false,
    processed: 0,
    total: 0,
    currentLabel: null,
    results: [],
    summary: null,
  });
  
  // Outreach Pack state
  const [isGenerating, setIsGenerating] = useState(false);
  const [outreachPack, setOutreachPack] = useState<OutreachPackContent | null>(null);
  const outreachPackRef = useRef<OutreachPackContent | null>(null);
  const [selectedOutreachVersionId, setSelectedOutreachVersionId] = useState<string | null>(null);
  const [outreachVersions, setOutreachVersions] = useState<OutreachPackVersionSummary[]>([]);
  const [outreachTemplates, setOutreachTemplates] = useState<OutreachPackVersionSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'contacts' | 'outreach' | 'dossier'>('info');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPackDraft, setIsSavingPackDraft] = useState(false);
  const [isSavingPackTemplate, setIsSavingPackTemplate] = useState(false);
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
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ count?: number; error?: string } | null>(null);

  // v2.0: LinkedIn DM 草稿（从候选池迁移）
  const [linkedInDraft, setLinkedInDraft] = useState<LinkedInDraft | null>(null);
  const [isGeneratingLinkedIn, setIsGeneratingLinkedIn] = useState(false);
  const [linkedInCopied, setLinkedInCopied] = useState(false);
  const [selectedLinkedInContact, setSelectedLinkedInContact] = useState<ProspectOutreachContact | null>(null);

  // v2.0: 邮件发送状态
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [emailSentId, setEmailSentId] = useState<string | null>(null);
  const [selectedEmailContact, setSelectedEmailContact] = useState<ProspectOutreachContact | null>(null);

  // Task #30: 营销内容建议
  const [suggestedContents, setSuggestedContents] = useState<SuggestedContent[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const selectedCompanyId = selectedCompany?.id ?? null;
  const selectedMatchReasons = selectedCompany?.matchReasons ?? [];
  const selectedCompanyOutreachContext = selectedCompany
    ? {
        id: selectedCompany.id,
        name: selectedCompany.name,
        email: selectedCompany.email,
        phone: selectedCompany.phone,
        outreachArtifacts: selectedCompany.outreachState,
      }
    : null;
  const selectedCompanyContactSnapshot = selectedCompanyOutreachContext
    ? getProspectCompanyContactSnapshot(selectedCompanyOutreachContext)
    : null;
  const selectedCompanyContactProfile = selectedCompanyOutreachContext
    ? getProspectCompanyOutreachContactProfile(selectedCompanyOutreachContext)
    : null;
  const outreachContacts = selectedCompany
    ? mergeProspectContactsWithSnapshot(
        {
          id: selectedCompany.id,
          name: selectedCompany.name,
          outreachArtifacts: selectedCompany.outreachState,
        },
        contacts
      )
    : [];
  const emailOutreachContacts = outreachContacts.filter((contact) => Boolean(contact.email));
  const phoneOutreachContacts = outreachContacts.filter((contact) => Boolean(contact.phone));
  const linkedInOutreachContacts = outreachContacts.filter((contact) => Boolean(contact.linkedInUrl));
  const whatsappContact = phoneOutreachContacts[0] ?? null;

  useEffect(() => {
    outreachPackRef.current = outreachPack;
  }, [outreachPack]);

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
        await loadData();
        if (selectedCompany.id) {
          const res = await getProspectContacts(selectedCompany.id);
          setContacts(res);
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

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const toggleSelectAllCompanies = () => {
    setSelectedCompanyIds((prev) => {
      if (prev.size === companies.length) {
        return new Set();
      }
      return new Set(companies.map((company) => company.id));
    });
  };

  const runBatchEnrichment = async (companyIds: string[]) => {
    const ids = Array.from(new Set(companyIds.filter(Boolean)));
    if (ids.length === 0) {
      return;
    }

    setBatchEnrichment({
      isRunning: true,
      processed: 0,
      total: ids.length,
      currentLabel: null,
      results: [],
      summary: null,
    });

    const companyMap = new Map(companies.map((company) => [company.id, company.name]));
    const aggregatedResults: ProspectEnrichmentItemResult[] = [];

    try {
      for (let index = 0; index < ids.length; index += 3) {
        const chunk = ids.slice(index, index + 3);
        const label = chunk.map((id) => companyMap.get(id)).filter(Boolean).join(' / ');

        setBatchEnrichment((prev) => ({
          ...prev,
          currentLabel: label || null,
        }));

        const response = await enrichProspectCompaniesBatchAction(chunk);
        aggregatedResults.push(...response.results);

        setBatchEnrichment({
          isRunning: true,
          processed: Math.min(ids.length, index + chunk.length),
          total: ids.length,
          currentLabel: label || null,
          results: [...aggregatedResults],
          summary: summarizeBatchResults(aggregatedResults),
        });
      }

      await loadData();

      if (selectedCompanyId && ids.includes(selectedCompanyId)) {
        const refreshedContacts = await getProspectContacts(selectedCompanyId).catch(() => []);
        setContacts(refreshedContacts);
      }

      const summary = summarizeBatchResults(aggregatedResults);
      toast.success('批量富化完成', {
        description: `成功 ${summary.succeeded}/${summary.total} 条，新增 ${summary.contactsFound} 位联系人。`,
      });

      setSelectedCompanyIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量富化失败';
      setError(message);
      toast.error(message);
    } finally {
      setBatchEnrichment((prev) => ({
        ...prev,
        isRunning: false,
        currentLabel: null,
        summary: prev.summary ?? summarizeBatchResults(prev.results),
      }));
    }
  };

  const handleBatchEnrichSelected = async () => {
    await runBatchEnrichment(Array.from(selectedCompanyIds));
  };

  const handleRetryFailedEnrichment = async () => {
    const failedIds = batchEnrichment.results.filter((item) => !item.success).map((item) => item.companyId);
    await runBatchEnrichment(failedIds);
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
      const normalizedCompanies = companyResult.companies.map(normalizeProspectCompany);
      setCompanies(normalizedCompanies);
      setTotal(companyResult.total);
      setSelectedCompany((current) => {
        if (!current) {
          return current;
        }

        return normalizedCompanies.find((company) => company.id === current.id) ?? current;
      });
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

  useEffect(() => {
    setSelectedCompanyIds((prev) => {
      const nextIds = companies.filter((company) => prev.has(company.id)).map((company) => company.id);
      const next = new Set(nextIds);
      const unchanged = next.size === prev.size && nextIds.every((id) => prev.has(id));
      return unchanged ? prev : next;
    });

    if (selectedCompany && !companies.some((company) => company.id === selectedCompany.id)) {
      setSelectedCompany(null);
    }
  }, [companies, selectedCompany]);

  // 加载联系人（contacts / outreach tab 都需要）
  useEffect(() => {
    if (!selectedCompanyId || (activeTab !== 'contacts' && activeTab !== 'outreach') || contacts.length > 0) {
      return;
    }

    setIsLoadingContacts(true);
    getProspectContacts(selectedCompanyId)
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setIsLoadingContacts(false));
  }, [selectedCompanyId, activeTab, contacts.length]);

  // 加载外联历史与营销内容建议 (Task #30 & P4)
  useEffect(() => {
    if (!selectedCompanyId || activeTab !== 'outreach') {
      return;
    }

    const loadOutreachData = async () => {
      setIsLoadingHistory(true);
      setIsLoadingSuggestions(true);
      try {
        const [hist, suggestions] = await Promise.all([
          getCompanyOutreachHistory(selectedCompanyId),
          suggestLinksForProspect(selectedCompanyId)
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

    void loadOutreachData();
  }, [selectedCompanyId, activeTab]);

  // 加载背调简报（懒加载）
  useEffect(() => {
    if (!selectedCompanyId || activeTab !== 'dossier') {
      return;
    }

    getLatestProspectDossier(selectedCompanyId)
      .then(setDossierData)
      .catch(() => setDossierData(null));
  }, [selectedCompanyId, activeTab]);

  // 加载已保存的外联包 (Task #130)
  useEffect(() => {
    if (!selectedCompanyId || activeTab !== 'outreach') {
      return;
    }

    let cancelled = false;

    const loadOutreachWorkspace = async () => {
      try {
        const [savedRes, versionsRes, templatesRes] = await Promise.all([
          getSavedOutreachArtifacts(selectedCompanyId),
          listOutreachPackVersions(selectedCompanyId),
          listOutreachPackTemplates(),
        ]);

        const versions = versionsRes.success ? versionsRes.versions || [] : [];
        const templates = templatesRes.success ? templatesRes.templates || [] : [];
        const latestVersion = versions[0];
        const latestVersionPack = latestVersion
          ? decorateOutreachPack(latestVersion.content, {
              timestamp: toIsoTimestamp(latestVersion.createdAt),
              version: latestVersion.version,
            })
          : null;

        if (cancelled) {
          return;
        }

        setOutreachVersions(versions);
        setOutreachTemplates(templates);

        if (!outreachPackRef.current) {
          if (latestVersionPack) {
            setOutreachPack(latestVersionPack);
            setSelectedOutreachVersionId(latestVersion.id);
            return;
          }

          const cachedArtifact = decorateOutreachPack(
            (savedRes.success ? savedRes.artifacts : null) as ProspectCompanyData['outreachArtifacts']
          );

          if (cachedArtifact) {
            setOutreachPack(cachedArtifact);
            setSelectedOutreachVersionId(null);
          }
        }
      } catch (err) {
        console.error('Failed to load outreach workspace:', err);
      }
    };

    void loadOutreachWorkspace();
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId, activeTab]);

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
  const handleGenerateOutreach = async (company: ProspectCompanyView) => {
    setIsGenerating(true);
    setError(null);
    setActiveTab('outreach');
    
    try {
      const latestDossier =
        selectedCompanyId === company.id && dossierData?.content
          ? dossierData
          : await getLatestProspectDossier(company.id).catch(() => null);
      if (latestDossier && selectedCompanyId === company.id && !dossierData) {
        setDossierData(latestDossier);
      }

      const persistedContacts =
        selectedCompanyId === company.id && contacts.length > 0
          ? contacts
          : await getProspectContacts(company.id).catch(() => []);
      if (selectedCompanyId === company.id && contacts.length === 0 && persistedContacts.length > 0) {
        setContacts(persistedContacts);
      }

      const companyContactContext = {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        outreachArtifacts: company.outreachState,
      };
      const mergedContacts = mergeProspectContactsWithSnapshot(
        companyContactContext,
        persistedContacts
      );
      const contactProfile = getProspectCompanyOutreachContactProfile(companyContactContext);

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
            prospectDossier: latestDossier?.content ?? null,
            contacts: mergedContacts.map((contact) => ({
              name: contact.name,
              role: contact.role,
              seniority: contact.seniority,
              email: contact.email,
              phone: contact.phone,
              linkedInUrl: contact.linkedInUrl,
              source: contact.source,
              note: contact.note,
            })),
            contactProfile: {
              email: contactProfile.email,
              phone: contactProfile.phone,
              recommendedContact: contactProfile.recommendedContact,
              complianceNote: contactProfile.complianceNote,
              primaryEmail: contactProfile.primaryEmail ?? null,
              primaryPhone: contactProfile.primaryPhone ?? null,
              completenessScore: contactProfile.snapshot?.completenessScore ?? null,
              leadQualityScore: contactProfile.snapshot?.leadQualityScore ?? null,
              informationGaps: contactProfile.snapshot?.informationGaps ?? [],
              dataSources: contactProfile.snapshot?.dataSources ?? [],
            },
            matchReasons: company.matchReasons || [],
            approachAngle: company.approachAngle || null,
          },
          entityType: 'OutreachPack',
          entityId: company.id,
          mode: 'generate',
          useCompanyProfile: true,
        }
      );
      
      if (result.ok && result.output) {
        const newEntry = decorateOutreachPack(result.output, {
          timestamp: new Date().toISOString(),
        });
        if (!newEntry) {
          throw new Error('Generated outreach pack returned an unexpected shape');
        }
        setOutreachPack(newEntry);
        setSelectedOutreachVersionId(result.versionId || null);
        
        // Task #130: 持久化保存生成的工具包
        await saveOutreachArtifacts(company.id, newEntry);

        // Task #124: 更新本地状态以立即显示版本历史
        setSelectedCompany((prev) => {
          if (!prev || prev.id !== company.id) return prev;
          return {
            ...prev,
            outreachArtifacts: [newEntry, ...(prev.outreachArtifacts || [])].slice(0, 10)
          };
        });

        const [versionsRes, templatesRes] = await Promise.all([
          listOutreachPackVersions(company.id),
          listOutreachPackTemplates(),
        ]);
        if (versionsRes.success) {
          setOutreachVersions(versionsRes.versions || []);
        }
        if (templatesRes.success) {
          setOutreachTemplates(templatesRes.templates || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成外联包失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制到剪贴板
  const handleSelectOutreachVersion = (version: OutreachPackVersionSummary) => {
    const pack = decorateOutreachPack(version.content, {
      timestamp: toIsoTimestamp(version.createdAt),
      version: version.version,
    });
    if (!pack) return;

    setOutreachPack(pack);
    setSelectedOutreachVersionId(version.id);
  };

  const handleApplyTemplate = (template: OutreachPackVersionSummary) => {
    const pack = decorateOutreachPack(template.content, {
      timestamp: toIsoTimestamp(template.createdAt),
      version: template.version,
    });
    if (!pack) return;

    setOutreachPack(pack);
    setSelectedOutreachVersionId(template.id);
    toast.success('模板已载入当前工作台', {
      description: template.templateName || template.sourceCompanyName || '可复用模板',
    });
  };

  const handleSavePackDraft = async () => {
    if (!selectedCompany || !outreachPack) return;

    setIsSavingPackDraft(true);
    try {
      const response = await saveOutreachPackDraft(
        selectedCompany.id,
        outreachPack,
        `外联推进草稿（${selectedCompany.name}）`
      );

      if (!response.success || !response.version) {
        throw new Error(response.error || '保存草稿失败');
      }

      setSelectedOutreachVersionId(response.version.id);
      setOutreachVersions((prev) => [response.version!, ...prev.filter((item) => item.id !== response.version!.id)]);
      toast.success('外联草稿已保存', {
        description: `版本 v${response.version.version} 已写入历史记录。`,
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存草稿失败';
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingPackDraft(false);
    }
  };

  const handleSavePackTemplate = async () => {
    if (!selectedCompany || !outreachPack) return;

    setIsSavingPackTemplate(true);
    try {
      const response = await saveOutreachPackTemplate(
        selectedCompany.id,
        outreachPack,
        `${selectedCompany.name} reusable template`
      );

      if (!response.success || !response.template) {
        throw new Error(response.error || '保存模板失败');
      }

      setOutreachTemplates((prev) => [response.template!, ...prev.filter((item) => item.id !== response.template!.id)].slice(0, 12));
      toast.success('复用模板已保存', {
        description: response.template.templateName || selectedCompany.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存模板失败';
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingPackTemplate(false);
    }
  };

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

  const contactSnapshotPanel = selectedCompanyContactSnapshot ? (
    <div className="rounded-2xl border border-[#E8E0D0] bg-[#FFFCF7] p-4">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-[#D4AF37]" />
        <div className="text-sm font-bold text-[#0B1B2B]">导入联系人快照</div>
        <div className="ml-auto text-[10px] text-slate-400">
          {new Date(selectedCompanyContactSnapshot.enrichedAt).toLocaleDateString('zh-CN')}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FCFAF4] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">主邮箱</div>
          <div className="mt-2 text-sm font-medium text-[#0B1B2B]">
            {selectedCompanyContactProfile?.email || '邮箱待补全'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FCFAF4] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">主电话</div>
          <div className="mt-2 text-sm font-medium text-[#0B1B2B]">
            {selectedCompanyContactProfile?.phone || '电话待补全'}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FCFAF4] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">推荐联系渠道</div>
          <div className="mt-2 text-sm font-medium text-[#0B1B2B]">
            {selectedCompanyContactProfile?.recommendedContact?.label || '待评估'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FCFAF4] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">合规说明</div>
          <div className="mt-2 text-xs leading-5 text-slate-600">
            {selectedCompanyContactProfile?.complianceNote || '仅使用公开商务联系方式'}
          </div>
        </div>
      </div>
    </div>
  ) : null;

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
    <div className="ci-work-surface space-y-5">
      {/* Header - compact workbench command bar */}
      <div className="ci-section-band">
        <div className="flex flex-col gap-4 px-1 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--ci-muted)]">Radar Workbench</p>
            <h1 className="text-xl font-semibold text-[var(--ci-ink)] sm:text-2xl">线索库</h1>
            <p className="mt-1 text-sm text-[var(--ci-muted)]">管理已导入的潜在客户，生成个性化外联方案</p>
          </div>
          <div className="ci-toolbar w-full justify-end sm:w-auto">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              title="导出 CSV"
              className={`rounded-md p-2 transition-colors ${isExporting ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'text-slate-500 hover:bg-white hover:text-[var(--ci-signal)]'}`}
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-md p-2 transition-colors ${showFilters ? 'bg-white text-[var(--ci-signal)] shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[var(--ci-signal)]'}`}
            >
              <Filter size={18} />
            </button>
            <button 
              onClick={loadData}
              className="rounded-md p-2 text-slate-500 transition-colors hover:bg-white hover:text-[var(--ci-signal)]"
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
      <div className="ci-toolbar w-full p-1">
        <button
          onClick={() => setOutreachView('companies')}
          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all truncate ${
            outreachView === 'companies'
              ? 'bg-white text-[var(--ci-ink)] shadow-sm'
              : 'text-slate-500 hover:text-[var(--ci-ink)]'
          }`}
        >
          <Users size={14} />
          线索库 ({total})
        </button>
        <button
          onClick={() => setOutreachView('outreach')}
          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all truncate ${
            outreachView === 'outreach'
              ? 'bg-white text-[var(--ci-ink)] shadow-sm'
              : 'text-slate-500 hover:text-[var(--ci-ink)]'
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <div key={label} className="ci-object-card p-4 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* 子 Tab：过滤器 */}
          <div className="ci-toolbar w-full p-1">
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
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                  outreachFilter === key
                    ? 'bg-white text-[var(--ci-ink)] shadow-sm'
                    : 'text-slate-500 hover:text-[var(--ci-ink)]'
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
      <div className="ci-toolbar flex-wrap px-4 py-3">
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
        <div className="ci-data-panel p-4">
          <div className="grid gap-4 md:grid-cols-3">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.35fr)_minmax(280px,0.8fr)]">
          {/* Companies List */}
        <div className="ci-data-panel min-w-0 p-4 xl:sticky xl:top-6">
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#0B1B2B]">线索列表</h3>
                <p className="text-xs text-slate-500 mt-1">当前共 {total} 条线索</p>
              </div>
              {companies.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={companies.length > 0 && selectedCompanyIds.size === companies.length}
                    onChange={toggleSelectAllCompanies}
                    className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  全选
                </label>
              )}
            </div>

            {companies.length > 0 && (
              <div className="ci-object-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#0B1B2B]">
                    已选 {selectedCompanyIds.size} 条
                  </span>
                  <button
                    onClick={handleBatchEnrichSelected}
                    disabled={selectedCompanyIds.size === 0 || batchEnrichment.isRunning}
                    className="px-3 py-1.5 rounded-lg bg-[#0B1220] text-[#D4AF37] text-xs font-medium disabled:opacity-50"
                  >
                    {batchEnrichment.isRunning ? '富化中...' : '批量富化联系人'}
                  </button>
                  <button
                    onClick={handleRetryFailedEnrichment}
                    disabled={batchEnrichment.isRunning || !batchEnrichment.results.some((item) => !item.success)}
                    className="px-3 py-1.5 rounded-lg border border-[#E8E0D0] bg-white text-xs font-medium text-slate-600 disabled:opacity-50"
                  >
                    重试失败项
                  </button>
                </div>

                {(batchEnrichment.isRunning || batchEnrichment.summary) && (
                  <div className="mt-3 rounded-lg border border-[var(--ci-border)] bg-white/70 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-medium text-[#0B1B2B]">
                          {batchEnrichment.isRunning
                            ? `进行中 ${batchEnrichment.processed}/${batchEnrichment.total}`
                            : `已完成 ${batchEnrichment.summary?.succeeded || 0}/${batchEnrichment.summary?.total || 0}`}
                        </p>
                        {batchEnrichment.currentLabel && (
                          <p className="text-slate-500 mt-1 truncate">{batchEnrichment.currentLabel}</p>
                        )}
                      </div>
                      {batchEnrichment.summary && (
                        <div className="text-right text-slate-500">
                          <p>新增 {batchEnrichment.summary.contactsFound} 位联系人</p>
                          <p>失败 {batchEnrichment.summary.failed} 条</p>
                        </div>
                      )}
                    </div>
                    {batchEnrichment.results.some((item) => !item.success) && !batchEnrichment.isRunning && (
                      <div className="mt-2 space-y-1">
                        {batchEnrichment.results.filter((item) => !item.success).slice(0, 3).map((item) => (
                          <p key={item.companyId} className="text-[11px] text-red-500">
                            {item.companyName}: {item.error || '富化失败'}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
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
            <div className="max-h-[calc(100vh-310px)] space-y-2 overflow-y-auto pr-1">
              {companies.map((company) => {
                const statusInfo = getStatusLabel(company.status);
                const isSelected = selectedCompany?.id === company.id;
                const isChecked = selectedCompanyIds.has(company.id);
                const matchReasons = company.matchReasons || [];
                
                return (
                  <div 
                    key={company.id}
                    onClick={() => {
                      setSelectedCompany(isSelected ? null : company);
                      // Task #124: 加载已保存的外联工具包
                      const latestArtifact = company.outreachArtifacts?.[0] ?? null;
                      setOutreachPack(isSelected ? null : latestArtifact);
                      setSelectedOutreachVersionId(null);
                        setOutreachVersions([]);
                        setOutreachTemplates([]);
                        setActiveTab('info');
                        setContacts([]);
                        setSelectedEmailContact(null);
                        setSelectedLinkedInContact(null);
                        setDossierData(null);
                        setShowContactForm(false);
                        setOutreachHistory([]);
                      }}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      isSelected 
                        ? 'border-[var(--ci-signal)] bg-[var(--ci-signal-soft)]' 
                        : 'border-[var(--ci-border)] bg-white hover:border-[var(--ci-signal)]'
                    }`}
                  >
                    {/* 第一行: 公司名 + 状态 */}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleCompanySelection(company.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <Building2 size={14} className="text-[#D4AF37] shrink-0" />
                      <h4 className="font-medium text-[#0B1B2B] text-sm truncate flex-1">
                        {company.name}
                      </h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* 第二行: 网站 + 国家 + 行业 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[11px]">
                      {company.website && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Globe size={11} className="text-slate-400" />
                          <span className="truncate max-w-[120px]">{company.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}</span>
                        </div>
                      )}
                      {company.country && (
                        <span className="text-slate-500">{company.country}</span>
                      )}
                      {company.industry && (
                        <span className="px-1.5 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded text-[10px] font-medium">
                          {company.industry}
                        </span>
                      )}
                    </div>

                    {/* 第三行: 匹配理由 + 联系人 */}
                    <div className="flex items-center justify-between gap-2">
                      {matchReasons.length > 0 ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Sparkles size={10} className="text-[#D4AF37] shrink-0" />
                          <span className="text-[10px] text-slate-500 truncate">{matchReasons[0]}</span>
                        </div>
                      ) : (
                        <div className="flex-1" />
                      )}
                      <div className="flex items-center gap-2 shrink-0">
                        {company.enrichmentStatus && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {company.enrichmentStatus}
                          </span>
                        )}
                        {(company._count?.contacts ?? 0) > 0 && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                            <Users size={10} />
                            {company._count!.contacts} 联系人
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="min-w-0 space-y-4">
          {selectedCompany ? (
            <>
              {/* Tabs */}
              <div className="ci-toolbar w-full p-1">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`min-w-0 flex-1 rounded-md py-2 text-sm font-medium transition-all truncate ${
                    activeTab === 'info'
                      ? 'bg-white text-[var(--ci-signal)] shadow-sm'
                      : 'text-slate-500 hover:text-[var(--ci-ink)]'
                  }`}
                >
                  基本信息
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all truncate ${
                    activeTab === 'contacts'
                      ? 'bg-white text-[var(--ci-signal)] shadow-sm'
                      : 'text-slate-500 hover:text-[var(--ci-ink)]'
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
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all truncate ${
                    activeTab === 'outreach'
                      ? 'bg-white text-[var(--ci-signal)] shadow-sm'
                      : 'text-slate-500 hover:text-[var(--ci-ink)]'
                  }`}
                >
                  <Sparkles size={13} />
                  外联方案
                </button>
                <button
                  onClick={() => setActiveTab('dossier')}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all truncate ${
                    activeTab === 'dossier'
                      ? 'bg-white text-[var(--ci-signal)] shadow-sm'
                      : 'text-slate-500 hover:text-[var(--ci-ink)]'
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
                  {(selectedMatchReasons.length > 0 || selectedCompany.approachAngle) && (
                    <div className="mb-6 p-4 bg-[#0B1220] rounded-xl border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-[#D4AF37]" />
                        <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">AI 匹配洞察</span>
                      </div>
                      
                      {selectedMatchReasons.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">核心匹配理由:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedMatchReasons.map((reason, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-1 rounded-md">
                                <Check size={10} className="text-[#D4AF37]" />
                                <span className="text-xs text-slate-200">{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedCompany.approachAngle && (
                        <div className="pt-3 border-t border-white/5">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mb-1.5">建议切入点:</p>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            &ldquo;{selectedCompany.approachAngle}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info Grid - 核心字段卡片 */}
                  <div className="space-y-3 mb-4">
                    {/* 网站 */}
                    {selectedCompany.website && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#E8E0D0]">
                        <Globe size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 mb-0.5">公司网站</p>
                          <a 
                            href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#0B1B2B] hover:text-[#D4AF37] break-all"
                          >
                            {selectedCompany.website}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* 国家 + 行业 */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCompany.country && (
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#E8E0D0]">
                          <Globe size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 mb-0.5">所在国家</p>
                            <p className="text-sm text-[#0B1B2B] font-medium">{selectedCompany.country}</p>
                          </div>
                        </div>
                      )}
                      {selectedCompany.industry && (
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#E8E0D0]">
                          <Target size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 mb-0.5">所属行业</p>
                            <p className="text-sm text-[#0B1B2B] font-medium">{selectedCompany.industry}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 联系人数量 */}
                    {(selectedCompany._count?.contacts ?? 0) > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#E8E0D0]">
                        <Users size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 mb-0.5">联系人</p>
                          <p className="text-sm text-[#0B1B2B] font-medium">{selectedCompany._count!.contacts} 人</p>
                        </div>
                      </div>
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

                  {contactSnapshotPanel && (
                    <div className="mb-4">
                      {contactSnapshotPanel}
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
                        <p className="text-slate-300 text-sm">
                          {contactSnapshotPanel ? '暂无已落库联系人' : '暂无联系人'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {contactSnapshotPanel
                            ? '导入快照已可用于外联，后续可继续补录命名联系人。'
                            : '添加决策者联系人，或从候选池导入时自动提取'}
                        </p>
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
                  {contactSnapshotPanel}

                  {/* Task #124: Version Selector */}
                  {(outreachVersions.length > 0 || outreachTemplates.length > 0 || outreachPack) && (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                      <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <h4 className="font-bold text-[#0B1B2B]">外联工作台</h4>
                            <p className="text-xs text-slate-500 mt-1">保存草稿快照、回看历史版本，并沉淀可复用模板。</p>
                          </div>
                          {outreachPack?.version && (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-[#D4AF37]/10 text-[#9A7A1C]">
                              v{outreachPack.version}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleSavePackDraft}
                            disabled={!outreachPack || isSavingPackDraft}
                            className="px-3 py-2 rounded-xl bg-[#0B1220] text-[#D4AF37] text-xs font-medium disabled:opacity-50"
                          >
                            {isSavingPackDraft ? '保存中...' : '保存草稿快照'}
                          </button>
                          <button
                            onClick={handleSavePackTemplate}
                            disabled={!outreachPack || isSavingPackTemplate}
                            className="px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white text-xs font-medium text-[#9A7A1C] disabled:opacity-50"
                          >
                            {isSavingPackTemplate ? '保存中...' : '保存为复用模板'}
                          </button>
                          <button
                            onClick={handleSaveToLibrary}
                            disabled={!outreachPack || isSaving}
                            className="px-3 py-2 rounded-xl border border-[#E8E0D0] bg-white text-xs font-medium text-slate-600 disabled:opacity-50"
                          >
                            {isSaving ? '保存中...' : '保存到内容库'}
                          </button>
                        </div>
                        {savedContentId && (
                          <p className="text-[11px] text-emerald-600 mt-3">内容库草稿已保存，可继续审核和复用。</p>
                        )}
                      </div>

                      <div className="space-y-4">
                        {outreachVersions.length > 0 && (
                          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4">
                            <h4 className="font-bold text-[#0B1B2B]">版本历史</h4>
                            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                              {outreachVersions.map((version) => (
                                <button
                                  key={version.id}
                                  onClick={() => handleSelectOutreachVersion(version)}
                                  className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                                    selectedOutreachVersionId === version.id
                                      ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                                      : 'border-[#E8E0D0] bg-white hover:border-[#D4AF37]/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-[#0B1B2B]">
                                      v{version.version}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(version.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    {version.changeNote || version.createdByName || '已保存版本'}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {outreachTemplates.length > 0 && (
                          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-4">
                            <h4 className="font-bold text-[#0B1B2B]">模板库</h4>
                            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                              {outreachTemplates.map((template) => (
                                <div key={template.id} className="rounded-xl border border-[#E8E0D0] bg-white px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-medium text-[#0B1B2B]">
                                        {template.templateName || '可复用模板'}
                                      </p>
                                      <p className="text-[11px] text-slate-500 mt-1">
                                        {template.sourceCompanyName || '已沉淀模板'}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleApplyTemplate(template)}
                                      className="px-2.5 py-1 rounded-lg bg-[#0B1220] text-[#D4AF37] text-[11px] font-medium"
                                    >
                                      载入
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

                        {/* v2.0: 联系人邮箱选择 */}
                        {emailOutreachContacts.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {emailOutreachContacts.map(c => (
                              <button
                                key={c.id}
                                onClick={() => setSelectedEmailContact(c)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                  selectedEmailContact?.id === c.id
                                    ? 'bg-[#D4AF37] text-white border-[#D4AF37]'
                                    : 'bg-white text-[#D4AF37] border-[#D4AF37]/30 hover:border-[#D4AF37]'
                                }`}
                              >
                                <Mail size={12} className="inline mr-1" />
                                {c.name}: {c.email}
                                {!c.isPersisted && <span className="ml-1 opacity-70">· Radar</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="space-y-4">
                          {outreachPack.outreachPack.emails.map((email, idx) => (
                            <div key={idx} className="bg-[#FFFCF7] rounded-xl border border-[#E8E0D0] overflow-hidden">
                              <div className="bg-[#F0EBD8] px-4 py-2 flex items-center justify-between">
                                <div>
                                  <span className="text-xs text-slate-500">主题:</span>
                                  <span className="text-sm font-medium text-[#0B1B2B] ml-2">{email.subject}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* v2.0: 发送按钮 */}
                                  {selectedEmailContact && (
                                    <button
                                      onClick={async () => {
                                        if (!selectedCompany) return;
                                        setIsSendingEmail(`email-${idx}`);
                                        try {
                                          const result = await sendOutreachDraft({
                                            subject: email.subject,
                                            body: email.body,
                                            toEmail: selectedEmailContact.email || '',
                                            toName: selectedEmailContact.name,
                                            prospectCompanyId: selectedCompany.id,
                                          });
                                          if (result.success) {
                                            setEmailSentId(`email-${idx}`);
                                            setTimeout(() => setEmailSentId(null), 3000);
                                            // 刷新历史
                                            const hist = await getCompanyOutreachHistory(selectedCompany.id);
                                            setOutreachHistory(hist.records);
                                          } else {
                                            setError(result.error || '发送失败');
                                          }
                                        } catch (err) {
                                          setError(err instanceof Error ? err.message : '发送失败');
                                        } finally {
                                          setIsSendingEmail(null);
                                        }
                                      }}
                                      disabled={isSendingEmail === `email-${idx}`}
                                      className="p-1.5 text-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                      title="发送邮件"
                                    >
                                      {emailSentId === `email-${idx}` ? (
                                        <Check size={14} className="text-emerald-600" />
                                      ) : isSendingEmail === `email-${idx}` ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Send size={14} />
                                      )}
                                    </button>
                                  )}
                                  {/* 复制按钮 */}
                                  <button
                                    onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`, `email-${idx}`)}
                                    className="p-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors"
                                    title="复制内容"
                                  >
                                    {copiedId === `email-${idx}` && emailSentId !== `email-${idx}` ? (
                                      <Check size={14} className="text-emerald-500" />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                  </button>
                                </div>
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

                        {/* 提示：无联系人邮箱 */}
                        {emailOutreachContacts.length === 0 && (
                          <p className="text-xs text-slate-500 mt-3 text-center">
                            暂无可用邮箱，请继续联系人富化或补录联系人
                          </p>
                        )}
                      </div>

                      {/* WhatsApp Templates */}
                      <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <MessageCircle size={18} className="text-[#25D366]" />
                          <h4 className="font-bold text-[#0B1B2B]">WhatsApp 手动消息</h4>
                          <span className="text-xs text-slate-400 ml-auto">
                            {outreachPack.outreachPack.whatsapps.length} 条
                          </span>
                        </div>

                        {/* 联系人电话选择提示 */}
                        {phoneOutreachContacts.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {phoneOutreachContacts.map(c => (
                              <span key={c.id} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                <Phone size={10} className="inline mr-1" />
                                {c.name}: {c.phone}
                                {!c.isPersisted && <span className="ml-1 opacity-70">· Radar</span>}
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
                                  title="复制 WhatsApp 消息"
                                  aria-label="复制 WhatsApp 消息"
                                >
                                  {copiedId === `wa-${idx}` ? (
                                    <Check size={14} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>

                                {/* Open WhatsApp — pick first contact with phone */}
                                {phoneOutreachContacts.length > 0 && whatsappContact?.phone && (
                                  <a
                                    href={`https://wa.me/${whatsappContact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(wa.text)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-[#25D366] hover:text-[#128C7E] transition-colors"
                                    title="打开 WhatsApp 并预填消息"
                                    aria-label="打开 WhatsApp 并预填消息"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}

                                {/* Mark as sent */}
                                <button
                                  onClick={async () => {
                                    const contact = whatsappContact;
                                    setIsSendingManual(`wa-${idx}`);
                                    await recordManualOutreach({
                                      companyId: selectedCompany.id,
                                      contactId: contact?.isPersisted ? contact.id : undefined,
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
                                  title="标记为已手动发送"
                                  aria-label="标记为已手动发送"
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

                      {/* v2.0: LinkedIn DM - 从候选池迁移 */}
                      {linkedInOutreachContacts.length > 0 && (
                        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Linkedin size={18} className="text-[#0A66C2]" />
                            <h4 className="font-bold text-[#0B1B2B]">LinkedIn DM</h4>
                            <span className="text-xs text-slate-400 ml-auto">
                              {linkedInOutreachContacts.length} 位联系人
                            </span>
                          </div>

                          {/* 联系人选择 */}
                          <div className="mb-3 flex flex-wrap gap-2">
                            {linkedInOutreachContacts.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedLinkedInContact(c);
                                  setLinkedInDraft(null);
                                  setLinkedInCopied(false);
                                }}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                  selectedLinkedInContact?.id === c.id
                                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                                    : 'bg-white text-[#0A66C2] border-[#0A66C2]/30 hover:border-[#0A66C2]'
                                }`}
                              >
                                <Linkedin size={12} className="inline mr-1" />
                                {c.name}
                                {c.role && <span className="ml-1 opacity-70">({c.role})</span>}
                                {!c.isPersisted && <span className="ml-1 opacity-70">· Radar</span>}
                              </button>
                            ))}
                          </div>

                          {/* 草稿生成 */}
                          {selectedLinkedInContact && (
                            <div className="bg-white rounded-xl border border-[#E8E0D0] p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-sm text-slate-600">
                                  <span className="font-medium">{selectedLinkedInContact.name}</span>
                                  <a
                                    href={selectedLinkedInContact.linkedInUrl || ''}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#0A66C2] ml-2 hover:underline"
                                  >
                                    <ExternalLink size={12} className="inline" />
                                  </a>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!selectedCompany) return;
                                    setIsGeneratingLinkedIn(true);
                                    setLinkedInDraft(null);
                                    setLinkedInCopied(false);
                                    try {
                                      const result = await generateLinkedInDraft(
                                        undefined,
                                        selectedCompany.id,
                                        selectedLinkedInContact.linkedInUrl || undefined,
                                      );
                                      if (result.success && result.draft) {
                                        setLinkedInDraft(result.draft);
                                      } else {
                                        console.error('LinkedIn DM 生成失败:', result.error);
                                      }
                                    } catch (err) {
                                      console.error('LinkedIn DM 生成异常:', err);
                                    } finally {
                                      setIsGeneratingLinkedIn(false);
                                    }
                                  }}
                                  disabled={isGeneratingLinkedIn}
                                  className="flex items-center gap-1.5 text-xs bg-[#0A66C2] text-white px-3 py-1.5 rounded-lg hover:bg-[#004182] transition-colors disabled:opacity-50"
                                >
                                  {isGeneratingLinkedIn ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={12} />
                                  )}
                                  生成草稿
                                </button>
                              </div>

                              {/* 草稿内容 */}
                              {linkedInDraft && (
                                <div className="bg-[#F7F3E8] rounded-lg p-3 mb-3">
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {linkedInDraft.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-2">
                                    {linkedInDraft.message.length} / 300 字符
                                  </p>
                                </div>
                              )}

                              {/* 操作按钮 */}
                              {linkedInDraft && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!selectedCompany || !linkedInDraft) return;
                                      await navigator.clipboard.writeText(linkedInDraft.message);
                                      setLinkedInCopied(true);
                                      // 记录外联
                                      await recordLinkedInCopy(
                                        undefined,
                                        selectedCompany.id,
                                        linkedInDraft.linkedInUrl,
                                        linkedInDraft.message,
                                      );
                                      // 刷新历史
                                      const hist = await getCompanyOutreachHistory(selectedCompany.id);
                                      setOutreachHistory(hist.records);
                                      setTimeout(() => setLinkedInCopied(false), 2000);
                                    }}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                      linkedInCopied
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : 'bg-white text-[#0A66C2] border border-[#0A66C2]/30 hover:border-[#0A66C2]'
                                    }`}
                                  >
                                    {linkedInCopied ? (
                                      <Check size={12} />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                    {linkedInCopied ? '已复制' : '复制并标记'}
                                  </button>
                                  <a
                                    href={selectedLinkedInContact.linkedInUrl || ''}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs bg-[#0A66C2] text-white px-3 py-1.5 rounded-lg hover:bg-[#004182] transition-colors"
                                  >
                                    <ExternalLink size={12} />
                                    打开 LinkedIn
                                  </a>
                                </div>
                              )}

                              {/* 加载状态 */}
                              {isGeneratingLinkedIn && !linkedInDraft && (
                                <div className="flex items-center justify-center py-4 text-sm text-slate-500">
                                  <Loader2 size={16} className="animate-spin mr-2" />
                                  AI 正在生成草稿...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Phone Outreach */}
                      {phoneOutreachContacts.length > 0 && (
                        <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <PhoneCall size={18} className="text-[#D4AF37]" />
                            <h4 className="font-bold text-[#0B1B2B]">电话外联</h4>
                          </div>
                          <div className="space-y-3">
                            {phoneOutreachContacts.map(contact => (
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
                                              contactId: contact.isPersisted ? contact.id : undefined,
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
                                      {record.status === 'manual_sent' ? '已手动发送' :
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

                        const companyOverview = dossier.companyOverview as { summary?: string; keyFacts?: Array<{ label: string; value: string }>; dataGaps?: string[] } | undefined;
                        const decisionMakers = dossier.decisionMakerAnalysis as { contacts?: Array<{ name: string; role: string; seniority: string; influence: string; approachAngle: string }>; orgStructureInsight?: string; dataGaps?: string[] } | undefined;
                        const bizOpps = dossier.businessOpportunities as { opportunities?: Array<{ title: string; stage: string; value: string; deadline: string; relevance: string }>; dataGaps?: string[] } | undefined;
                        const intel = dossier.intelligenceSummary as { funding?: string; news?: string; competitors?: string; dataGaps?: string[] } | undefined;
                        const matchAnalysis = dossier.matchAnalysis as { overallScore?: number | null; matchReasons?: string[]; relevanceInsights?: string[]; dataGaps?: string[] } | undefined;
                        const riskAlerts = dossier.riskAlerts as Array<{ risk: string; severity: string; basis: string }> | undefined;
                        const approach = dossier.recommendedApproach as { nextSteps?: Array<{ action: string; priority: string; rationale: string }>; talkingPoints?: string[]; avoidTopics?: string[] } | undefined;
                        const dataSources = undefined as Array<{ field: string; source: string; status: string }> | undefined;

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

        <aside className="ci-detail-drawer min-w-0 rounded-xl border border-[var(--ci-border)] p-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto">
          {selectedCompany ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--ci-muted)]">Action Workspace</p>
                <h3 className="mt-1 text-sm font-semibold text-[var(--ci-ink)] line-clamp-2">{selectedCompany.name}</h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-[var(--ci-border)] bg-white p-3">
                  <p className="text-[10px] text-slate-500">Tier</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ci-ink)]">{selectedCompany.tier || '-'}</p>
                </div>
                <div className="rounded-lg border border-[var(--ci-border)] bg-white p-3">
                  <p className="text-[10px] text-slate-500">Contacts</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ci-ink)]">{outreachContacts.length}</p>
                </div>
                <div className="rounded-lg border border-[var(--ci-border)] bg-white p-3">
                  <p className="text-[10px] text-slate-500">Packs</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ci-ink)]">{outreachVersions.length || selectedCompany.outreachArtifacts?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleGenerateOutreach(selectedCompany)}
                  disabled={isGenerating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ci-signal)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d5fd6] disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  生成外联方案
                </button>
                <button
                  onClick={handleManualEnrich}
                  disabled={isEnriching}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ci-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[var(--ci-signal)] hover:text-[var(--ci-signal)] disabled:opacity-50"
                >
                  {isEnriching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  深度丰富联系人
                </button>
              </div>

              {selectedMatchReasons.length > 0 && (
                <div className="rounded-lg border border-[var(--ci-border)] bg-white p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Target size={13} className="text-[var(--ci-signal)]" />
                    <p className="text-xs font-semibold text-[var(--ci-ink)]">Evidence Signals</p>
                  </div>
                  <div className="space-y-2">
                    {selectedMatchReasons.slice(0, 4).map((reason, idx) => (
                      <p key={idx} className="text-xs leading-relaxed text-slate-600 line-clamp-2">{reason}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-[var(--ci-border)] bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <History size={13} className="text-slate-500" />
                  <p className="text-xs font-semibold text-[var(--ci-ink)]">Recent Outreach</p>
                </div>
                {isLoadingHistory ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                    <Loader2 size={12} className="animate-spin" />
                    加载历史...
                  </div>
                ) : outreachHistory.length > 0 ? (
                  <div className="space-y-2">
                    {outreachHistory.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-md bg-slate-50 px-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-700">{item.channel}</span>
                          <span className="text-[10px] text-slate-400">
                            {item.sentAt ? new Date(item.sentAt).toLocaleDateString('zh-CN') : item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{item.toName || item.toPhone || item.status}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-xs text-slate-500">暂无外联历史，生成方案后可在这里跟踪最近动作。</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <Users size={26} className="text-slate-300" />
              <p className="mt-3 text-sm font-medium text-[var(--ci-ink)]">选择一个线索</p>
              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">右侧会显示外联动作、证据信号和最近历史。</p>
            </div>
          )}
        </aside>
      </div>
      </> )} {/* end outreachView === 'companies' */}
    </div>
  );
}
