import { prisma } from '@/lib/prisma';
import type { Prisma, ProspectCompany, ProspectContact } from '@prisma/client';

const RADAR_TIMEZONE = 'Asia/Shanghai';
const RADAR_UTC_OFFSET = '+08:00';
const DEFAULT_METRIC_DAYS = 7;
const DEFAULT_WORKSPACE_LIMIT = 200;
const FEEDBACK_LOOKBACK_DAYS = 180;

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: RADAR_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type WorkspaceBucket = 'phone' | 'email' | 'pending';

type ProspectCompanyWithContacts = ProspectCompany & {
  contacts: ProspectContact[];
};

type CompanyFeedbackSummary = {
  companyScoreAdjustment: number;
  notes: string[];
  excludeFromDaily: boolean;
  engaged: boolean;
  contactAdjustmentsById: Map<string, number>;
  emailAdjustments: Map<string, number>;
  phoneAdjustments: Map<string, number>;
  invalidEmails: Set<string>;
  stats: {
    replied: number;
    bounced: number;
    failed: number;
    noResponse: number;
    meetingBooked: number;
    notInterested: number;
  };
};

export interface DailyMetricPoint {
  day: string;
  rawCandidates: number;
  qualifiedCompanies: number;
  importedProspects: number;
  contactsAdded: number;
  readyCompanies: number;
}

export interface DailySupplyMetricsData {
  generatedAt: string;
  today: DailyMetricPoint;
  trailing7d: {
    rawCandidates: number;
    qualifiedCompanies: number;
    importedProspects: number;
    contactsAdded: number;
    readyCompanies: number;
  };
  points: DailyMetricPoint[];
}

export interface DailyWorkspaceContact {
  id: string;
  name: string;
  role: string | null;
  seniority: string | null;
  email: string | null;
  phone: string | null;
  linkedInUrl: string | null;
}

export interface DailyWorkspaceItem {
  companyId: string;
  companyName: string;
  tier: string | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  status: string;
  enrichmentStatus: string | null;
  contactReadyScore: number;
  bucket: WorkspaceBucket;
  recommendedChannel: 'phone' | 'email' | 'research';
  recommendedContact: DailyWorkspaceContact | null;
  fallbackContact: DailyWorkspaceContact | null;
  contactCount: number;
  readyLabel: 'Hot' | 'Ready' | 'Build';
  freshnessDays: number;
  lastContactedAt: string | null;
  createdAt: string;
  recommendedAngle: string;
  matchReasons: string[];
  outreachPackReady: boolean;
  quickNote: string;
  feedbackSignals: string[];
}

export interface RadarDailyWorkspaceData {
  generatedAt: string;
  summary: {
    workspaceTotal: number;
    readyNowCount: number;
    phonePriorityCount: number;
    emailPriorityCount: number;
    pendingCount: number;
    avgReadyScore: number;
  };
  phonePriority: DailyWorkspaceItem[];
  emailPriority: DailyWorkspaceItem[];
  pendingEnrichment: DailyWorkspaceItem[];
}

export interface RadarFeedbackSummaryData {
  repliedCount: number;
  bouncedCount: number;
  failedCount: number;
  noResponseCount: number;
  meetingBookedCount: number;
  notInterestedCount: number;
}

export interface PersistRadarDailySnapshotResult {
  day: string;
  metrics: DailyMetricPoint;
  workspaceSummary: RadarDailyWorkspaceData['summary'];
  feedbackSummary: RadarFeedbackSummaryData;
}

type RadarDailySnapshotRecord = {
  dayKey: string;
  rawCandidates: number;
  qualifiedCompanies: number;
  importedProspects: number;
  contactsAdded: number;
  readyCompanies: number;
};

const EMPTY_WORKSPACE_SUMMARY: RadarDailyWorkspaceData['summary'] = {
  workspaceTotal: 0,
  readyNowCount: 0,
  phonePriorityCount: 0,
  emailPriorityCount: 0,
  pendingCount: 0,
  avgReadyScore: 0,
};

const EMPTY_FEEDBACK_SUMMARY: RadarFeedbackSummaryData = {
  repliedCount: 0,
  bouncedCount: 0,
  failedCount: 0,
  noResponseCount: 0,
  meetingBookedCount: 0,
  notInterestedCount: 0,
};

function formatDayKey(date: Date) {
  return dayKeyFormatter.format(date);
}

function parseDayKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00${RADAR_UTC_OFFSET}`);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDayWindow(dayKey: string) {
  const start = parseDayKey(dayKey);
  return {
    start,
    end: addUtcDays(start, 1),
  };
}

function normalizeDayKeys(dayKeys: string[]) {
  return [...new Set(dayKeys)].sort((left, right) => left.localeCompare(right));
}

function getMetricsQueryWindow(dayKeys: string[]) {
  const normalized = normalizeDayKeys(dayKeys);
  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  if (!first || !last) {
    return null;
  }

  return {
    start: getDayWindow(first).start,
    end: getDayWindow(last).end,
  };
}

export function getCurrentRadarDayKey() {
  return formatDayKey(new Date());
}

export function buildRadarDayKeyRange(fromDayKey: string, toDayKey: string) {
  const range: string[] = [];
  const start = parseDayKey(fromDayKey);
  const end = parseDayKey(toDayKey);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid day key range');
  }

  if (start.getTime() > end.getTime()) {
    throw new Error('Range start must be before range end');
  }

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addUtcDays(cursor, 1)) {
    range.push(formatDayKey(cursor));
  }

  return range;
}

function buildTrailingDayKeys(days: number) {
  const keys: string[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    keys.push(formatDayKey(date));
  }
  return keys;
}

function getDaysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function normalizeMatchReasons(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeWebsiteUrl(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function getTierBoost(tier: string | null) {
  if (tier === 'A') return 32;
  if (tier === 'B') return 22;
  return 10;
}

function getFreshnessBoost(createdAt: Date) {
  const days = getDaysSince(createdAt);
  if (days <= 1) return 16;
  if (days <= 3) return 12;
  if (days <= 7) return 8;
  if (days <= 14) return 4;
  return 0;
}

function getSeniorityBoost(seniority: string | null | undefined) {
  switch (seniority) {
    case 'C-level':
      return 12;
    case 'VP':
      return 9;
    case 'Director':
      return 7;
    case 'Manager':
      return 4;
    default:
      return 1;
  }
}

function createEmptyFeedbackSummary(): CompanyFeedbackSummary {
  return {
    companyScoreAdjustment: 0,
    notes: [],
    excludeFromDaily: false,
    engaged: false,
    contactAdjustmentsById: new Map(),
    emailAdjustments: new Map(),
    phoneAdjustments: new Map(),
    invalidEmails: new Set(),
    stats: {
      replied: 0,
      bounced: 0,
      failed: 0,
      noResponse: 0,
      meetingBooked: 0,
      notInterested: 0,
    },
  };
}

function pushUniqueNote(notes: string[], note: string) {
  if (!notes.includes(note)) {
    notes.push(note);
  }
}

function adjustMap(map: Map<string, number>, key: string | null | undefined, delta: number) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + delta);
}

function extractCompanyIdFromMetadata(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const companyId = (value as Record<string, unknown>).companyId;
  return typeof companyId === 'string' ? companyId : null;
}

function extractContactIdFromMetadata(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const contactId = (value as Record<string, unknown>).contactId;
  return typeof contactId === 'string' ? contactId : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toWorkspaceContact(contact: ProspectContact): DailyWorkspaceContact {
  return {
    id: contact.id,
    name: contact.name,
    role: contact.role,
    seniority: contact.seniority,
    email: contact.email,
    phone: contact.phone,
    linkedInUrl: contact.linkedInUrl,
  };
}

async function loadWorkspaceProspects(tenantId: string) {
  const prospects = await prisma.prospectCompany.findMany({
    where: {
      tenantId,
      deletedAt: null,
      tier: { in: ['A', 'B'] },
      status: { not: 'lost' },
    },
    include: {
      contacts: {
        where: { deletedAt: null },
      },
    },
  });

  return prospects as ProspectCompanyWithContacts[];
}

async function loadFeedbackMap(
  tenantId: string,
  prospects: ProspectCompanyWithContacts[],
) {
  const feedbackByCompany = new Map<string, CompanyFeedbackSummary>();
  const candidateToCompany = new Map<string, string>();

  prospects.forEach((company) => {
    feedbackByCompany.set(company.id, createEmptyFeedbackSummary());
    if (company.sourceCandidateId) {
      candidateToCompany.set(company.sourceCandidateId, company.id);
    }
  });

  if (feedbackByCompany.size === 0) {
    return feedbackByCompany;
  }

  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - FEEDBACK_LOOKBACK_DAYS);

  const records = await prisma.outreachRecord.findMany({
    where: {
      tenantId,
      createdAt: { gte: lookbackStart },
    },
    select: {
      candidateId: true,
      toEmail: true,
      status: true,
      channel: true,
      callResult: true,
      metadata: true,
      openedAt: true,
      repliedAt: true,
      sentAt: true,
      createdAt: true,
    },
  });

  const staleNoResponseCutoff = new Date();
  staleNoResponseCutoff.setDate(staleNoResponseCutoff.getDate() - 14);

  records.forEach((record) => {
    const directCompanyId = extractCompanyIdFromMetadata(record.metadata);
    const mappedCompanyId = record.candidateId ? candidateToCompany.get(record.candidateId) : null;
    const companyId = directCompanyId || mappedCompanyId;
    if (!companyId) {
      return;
    }

    const summary = feedbackByCompany.get(companyId);
    if (!summary) {
      return;
    }

    const contactId = extractContactIdFromMetadata(record.metadata);

    if (record.status === 'replied' || record.repliedAt) {
      summary.companyScoreAdjustment -= 18;
      summary.engaged = true;
      summary.excludeFromDaily = true;
      summary.stats.replied += 1;
      pushUniqueNote(summary.notes, '已有回复，已从今日冷启动清单降权。');
    }

    if (record.channel === 'email') {
      if (record.status === 'bounced') {
        summary.companyScoreAdjustment -= 16;
        summary.stats.bounced += 1;
        if (record.toEmail) {
          summary.invalidEmails.add(record.toEmail.toLowerCase());
          adjustMap(summary.emailAdjustments, record.toEmail.toLowerCase(), -40);
        }
        adjustMap(summary.contactAdjustmentsById, contactId, -20);
        pushUniqueNote(summary.notes, '最近出现退信，邮件优先级已自动下调。');
      } else if (record.status === 'failed') {
        summary.companyScoreAdjustment -= 10;
        summary.stats.failed += 1;
        if (record.toEmail) {
          adjustMap(summary.emailAdjustments, record.toEmail.toLowerCase(), -20);
        }
        adjustMap(summary.contactAdjustmentsById, contactId, -10);
        pushUniqueNote(summary.notes, '最近邮件发送失败，建议换联系人或先补全资料。');
      } else if (record.openedAt && !record.repliedAt) {
        summary.companyScoreAdjustment += 4;
        if (record.toEmail) {
          adjustMap(summary.emailAdjustments, record.toEmail.toLowerCase(), 3);
        }
      } else if (
        record.sentAt &&
        record.sentAt <= staleNoResponseCutoff &&
        !record.openedAt &&
        !record.repliedAt &&
        record.status !== 'bounced'
      ) {
        summary.companyScoreAdjustment -= 4;
        summary.stats.noResponse += 1;
        if (record.toEmail) {
          adjustMap(summary.emailAdjustments, record.toEmail.toLowerCase(), -4);
        }
      }
    }

    if (record.channel === 'phone') {
      switch (record.callResult) {
        case 'meeting_booked':
          summary.companyScoreAdjustment -= 24;
          summary.stats.meetingBooked += 1;
          summary.engaged = true;
          summary.excludeFromDaily = true;
          adjustMap(summary.contactAdjustmentsById, contactId, 12);
          pushUniqueNote(summary.notes, '已约到会议，已从今日冷启动清单移出。');
          break;
        case 'callback':
          summary.companyScoreAdjustment += 6;
          adjustMap(summary.contactAdjustmentsById, contactId, 5);
          break;
        case 'connected':
          summary.companyScoreAdjustment += 5;
          adjustMap(summary.contactAdjustmentsById, contactId, 4);
          break;
        case 'no_answer':
          summary.companyScoreAdjustment -= 3;
          summary.stats.noResponse += 1;
          adjustMap(summary.contactAdjustmentsById, contactId, -2);
          break;
        case 'voicemail':
          summary.companyScoreAdjustment -= 2;
          adjustMap(summary.contactAdjustmentsById, contactId, -1);
          break;
        case 'not_interested':
          summary.companyScoreAdjustment -= 28;
          summary.stats.notInterested += 1;
          summary.excludeFromDaily = true;
          adjustMap(summary.contactAdjustmentsById, contactId, -15);
          pushUniqueNote(summary.notes, '客户明确表示不感兴趣，已从今日清单排除。');
          break;
        default:
          break;
      }
    }
  });

  feedbackByCompany.forEach((summary) => {
    summary.companyScoreAdjustment = clamp(summary.companyScoreAdjustment, -35, 20);
  });

  return feedbackByCompany;
}

function scoreContact(
  contact: ProspectContact,
  channel: 'phone' | 'email',
  feedback: CompanyFeedbackSummary | undefined,
) {
  const availabilityBoost = channel === 'phone'
    ? (contact.phone ? 28 : -100)
    : (contact.email ? 24 : -100);

  const idAdjustment = feedback?.contactAdjustmentsById.get(contact.id) || 0;
  const emailAdjustment =
    channel === 'email' && contact.email
      ? feedback?.emailAdjustments.get(contact.email.toLowerCase()) || 0
      : 0;
  const phoneAdjustment =
    channel === 'phone' && contact.phone
      ? feedback?.phoneAdjustments.get(contact.phone) || 0
      : 0;

  return availabilityBoost + getSeniorityBoost(contact.seniority) + (contact.linkedInUrl ? 4 : 0) + idAdjustment + emailAdjustment + phoneAdjustment;
}

function chooseBestContact(
  contacts: ProspectContact[],
  channel: 'phone' | 'email',
  feedback: CompanyFeedbackSummary | undefined,
): ProspectContact | null {
  const sorted = [...contacts].sort(
    (left, right) => scoreContact(right, channel, feedback) - scoreContact(left, channel, feedback),
  );
  const top = sorted[0];
  if (!top) return null;
  if (channel === 'phone' && !top.phone) return null;
  if (channel === 'email' && !top.email) return null;
  if (scoreContact(top, channel, feedback) < 0) return null;
  return top;
}

function buildQuickNote(
  company: ProspectCompanyWithContacts,
  primary: ProspectContact | null,
  bucket: WorkspaceBucket,
  feedback: CompanyFeedbackSummary | undefined,
) {
  const feedbackNote = feedback?.notes[0];

  if (bucket === 'pending') {
    return feedbackNote || '缺少可直接外联的电话或邮箱，优先继续联系人富化。';
  }

  if (!primary) {
    return feedbackNote || '已具备基础触达条件，建议先补齐首要联系人。';
  }

  if (bucket === 'phone') {
    return feedbackNote || `优先电话联系 ${primary.name}${primary.role ? ` (${primary.role})` : ''}，切入点先用当前推荐话术。`;
  }

  return feedbackNote || `优先向 ${primary.name}${primary.role ? ` (${primary.role})` : ''} 发邮件，结合推荐切入点生成首封草稿。`;
}

function buildRecommendedAngle(company: ProspectCompanyWithContacts) {
  if (company.approachAngle?.trim()) {
    return company.approachAngle.trim();
  }

  const matchReasons = normalizeMatchReasons(company.matchReasons);
  if (matchReasons.length > 0) {
    return matchReasons[0];
  }

  if (company.industry) {
    return `围绕 ${company.industry} 场景切入，先验证业务痛点与采购窗口。`;
  }

  return '先确认业务场景、采购节奏与当前负责人的优先级。';
}

function buildWorkspaceItem(
  company: ProspectCompanyWithContacts,
  feedback: CompanyFeedbackSummary | undefined,
): DailyWorkspaceItem | null {
  if (feedback?.excludeFromDaily || company.status === 'lost') {
    return null;
  }

  const contacts = company.contacts;
  const bestPhone = chooseBestContact(contacts, 'phone', feedback);
  const bestEmail = chooseBestContact(contacts, 'email', feedback);
  const bucket: WorkspaceBucket = bestPhone ? 'phone' : bestEmail ? 'email' : 'pending';
  const recommendedContact = bucket === 'phone' ? bestPhone : bucket === 'email' ? bestEmail : null;
  const fallbackContact = bucket === 'phone' ? bestEmail : bestPhone;

  const companyBaseScore =
    getTierBoost(company.tier) +
    getFreshnessBoost(company.createdAt) +
    (company.approachAngle ? 6 : 0) +
    (company.outreachArtifacts ? 6 : 0) +
    (company.status === 'contacted' ? -10 : 0) +
    (company.lastContactedAt ? -6 : 0) +
    (feedback?.companyScoreAdjustment || 0);

  const contactScore = recommendedContact
    ? Math.max(scoreContact(recommendedContact, bucket === 'phone' ? 'phone' : 'email', feedback), 0)
    : 0;

  const contactReadyScore = Math.max(0, Math.min(100, companyBaseScore + contactScore));
  const readyLabel = contactReadyScore >= 75 ? 'Hot' : contactReadyScore >= 55 ? 'Ready' : 'Build';

  return {
    companyId: company.id,
    companyName: company.name,
    tier: company.tier,
    country: company.country,
    industry: company.industry,
    website: normalizeWebsiteUrl(company.website),
    status: company.status,
    enrichmentStatus: company.enrichmentStatus,
    contactReadyScore,
    bucket,
    recommendedChannel: bucket === 'phone' ? 'phone' : bucket === 'email' ? 'email' : 'research',
    recommendedContact: recommendedContact ? toWorkspaceContact(recommendedContact) : null,
    fallbackContact: fallbackContact ? toWorkspaceContact(fallbackContact) : null,
    contactCount: contacts.length,
    readyLabel,
    freshnessDays: getDaysSince(company.createdAt),
    lastContactedAt: company.lastContactedAt?.toISOString() ?? null,
    createdAt: company.createdAt.toISOString(),
    recommendedAngle: buildRecommendedAngle(company),
    matchReasons: normalizeMatchReasons(company.matchReasons),
    outreachPackReady: Boolean(company.outreachArtifacts),
    quickNote: buildQuickNote(company, recommendedContact, bucket, feedback),
    feedbackSignals: feedback?.notes || [],
  };
}

function compareWorkspaceItems(left: DailyWorkspaceItem, right: DailyWorkspaceItem) {
  if (right.contactReadyScore !== left.contactReadyScore) {
    return right.contactReadyScore - left.contactReadyScore;
  }

  if (left.freshnessDays !== right.freshnessDays) {
    return left.freshnessDays - right.freshnessDays;
  }

  return left.companyName.localeCompare(right.companyName);
}

function selectWorkspaceWindow(items: DailyWorkspaceItem[], limit: number) {
  const phone = items.filter((item) => item.bucket === 'phone').sort(compareWorkspaceItems);
  const email = items.filter((item) => item.bucket === 'email').sort(compareWorkspaceItems);
  const pending = items.filter((item) => item.bucket === 'pending').sort(compareWorkspaceItems);

  const selected = [
    ...phone.slice(0, 80),
    ...email.slice(0, 80),
    ...pending.slice(0, 40),
  ];

  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((item) => item.companyId));
    const leftovers = [...items]
      .filter((item) => !selectedIds.has(item.companyId))
      .sort(compareWorkspaceItems)
      .slice(0, limit - selected.length);
    selected.push(...leftovers);
  }

  const finalSelection = selected
    .sort(compareWorkspaceItems)
    .slice(0, limit);

  return {
    phonePriority: finalSelection.filter((item) => item.bucket === 'phone'),
    emailPriority: finalSelection.filter((item) => item.bucket === 'email'),
    pendingEnrichment: finalSelection.filter((item) => item.bucket === 'pending'),
  };
}

async function computeLiveDailyPoints(tenantId: string, dayKeys: string[]) {
  const normalizedDayKeys = normalizeDayKeys(dayKeys);
  const queryWindow = getMetricsQueryWindow(normalizedDayKeys);

  if (!queryWindow) {
    return [];
  }

  const [candidateEvents, contacts, prospects] = await Promise.all([
    prisma.radarCandidate.findMany({
      where: {
        tenantId,
        OR: [
          { createdAt: { gte: queryWindow.start, lt: queryWindow.end } },
          { qualifiedAt: { gte: queryWindow.start, lt: queryWindow.end } },
          { importedAt: { gte: queryWindow.start, lt: queryWindow.end } },
        ],
      },
      select: {
        createdAt: true,
        qualifiedAt: true,
        importedAt: true,
        qualifyTier: true,
        importedToType: true,
        candidateType: true,
      },
    }),
    prisma.prospectContact.findMany({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: queryWindow.start, lt: queryWindow.end },
      },
      select: { createdAt: true },
    }),
    loadWorkspaceProspects(tenantId),
  ]);

  const feedbackMap = await loadFeedbackMap(tenantId, prospects);

  const bucketMap = new Map<string, DailyMetricPoint>();
  normalizedDayKeys.forEach((day) => {
    bucketMap.set(day, {
      day,
      rawCandidates: 0,
      qualifiedCompanies: 0,
      importedProspects: 0,
      contactsAdded: 0,
      readyCompanies: 0,
    });
  });

  candidateEvents.forEach((candidate) => {
    const createdDay = formatDayKey(candidate.createdAt);
    const createdBucket = bucketMap.get(createdDay);
    if (createdBucket) {
      createdBucket.rawCandidates += 1;
    }

    if (candidate.candidateType === 'COMPANY' && candidate.qualifiedAt && ['A', 'B'].includes(candidate.qualifyTier || '')) {
      const qualifiedBucket = bucketMap.get(formatDayKey(candidate.qualifiedAt));
      if (qualifiedBucket) {
        qualifiedBucket.qualifiedCompanies += 1;
      }
    }

    if (candidate.candidateType === 'COMPANY' && candidate.importedAt && candidate.importedToType === 'ProspectCompany') {
      const importedBucket = bucketMap.get(formatDayKey(candidate.importedAt));
      if (importedBucket) {
        importedBucket.importedProspects += 1;
      }
    }
  });

  contacts.forEach((contact) => {
    const contactBucket = bucketMap.get(formatDayKey(contact.createdAt));
    if (contactBucket) {
      contactBucket.contactsAdded += 1;
    }
  });

  prospects
    .map((company) => buildWorkspaceItem(company, feedbackMap.get(company.id)))
    .filter((item): item is DailyWorkspaceItem => item !== null)
    .forEach((item) => {
      if (item.bucket === 'pending') {
        return;
      }

      const readyBucket = bucketMap.get(formatDayKey(new Date(item.createdAt)));
      if (readyBucket) {
        readyBucket.readyCompanies += 1;
      }
    });

  return normalizedDayKeys.map((day) => bucketMap.get(day)!);
}

async function upsertRadarDailySnapshotMetrics(params: {
  tenantId: string;
  dayKey: string;
  metrics: DailyMetricPoint;
  workspaceSummary?: RadarDailyWorkspaceData['summary'];
  feedbackSummary?: RadarFeedbackSummaryData;
}) {
  const { tenantId, dayKey, metrics, workspaceSummary, feedbackSummary } = params;

  if (!workspaceSummary && !feedbackSummary) {
    await prisma.radarDailySnapshot.upsert({
      where: {
        tenantId_dayKey: {
          tenantId,
          dayKey,
        },
      },
      create: {
        tenantId,
        dayKey,
        rawCandidates: metrics.rawCandidates,
        qualifiedCompanies: metrics.qualifiedCompanies,
        importedProspects: metrics.importedProspects,
        contactsAdded: metrics.contactsAdded,
        readyCompanies: metrics.readyCompanies,
      },
      update: {
        rawCandidates: metrics.rawCandidates,
        qualifiedCompanies: metrics.qualifiedCompanies,
        importedProspects: metrics.importedProspects,
        contactsAdded: metrics.contactsAdded,
        readyCompanies: metrics.readyCompanies,
      },
    });

    return;
  }

  const feedbackSummaryJson = feedbackSummary
    ? ({ ...feedbackSummary } as Prisma.InputJsonObject)
    : undefined;

  await prisma.radarDailySnapshot.upsert({
    where: {
      tenantId_dayKey: {
        tenantId,
        dayKey,
      },
    },
    create: {
      tenantId,
      dayKey,
      rawCandidates: metrics.rawCandidates,
      qualifiedCompanies: metrics.qualifiedCompanies,
      importedProspects: metrics.importedProspects,
      contactsAdded: metrics.contactsAdded,
      readyCompanies: metrics.readyCompanies,
      workspaceTotal: workspaceSummary?.workspaceTotal ?? 0,
      readyNowCount: workspaceSummary?.readyNowCount ?? 0,
      phonePriorityCount: workspaceSummary?.phonePriorityCount ?? 0,
      emailPriorityCount: workspaceSummary?.emailPriorityCount ?? 0,
      pendingCount: workspaceSummary?.pendingCount ?? 0,
      avgReadyScore: workspaceSummary?.avgReadyScore ?? 0,
      feedbackSummary: feedbackSummaryJson,
    },
    update: {
      rawCandidates: metrics.rawCandidates,
      qualifiedCompanies: metrics.qualifiedCompanies,
      importedProspects: metrics.importedProspects,
      contactsAdded: metrics.contactsAdded,
      readyCompanies: metrics.readyCompanies,
      workspaceTotal: workspaceSummary?.workspaceTotal ?? 0,
      readyNowCount: workspaceSummary?.readyNowCount ?? 0,
      phonePriorityCount: workspaceSummary?.phonePriorityCount ?? 0,
      emailPriorityCount: workspaceSummary?.emailPriorityCount ?? 0,
      pendingCount: workspaceSummary?.pendingCount ?? 0,
      avgReadyScore: workspaceSummary?.avgReadyScore ?? 0,
      feedbackSummary: feedbackSummaryJson,
    },
  });
}

function summarizeFeedback(feedbackMap: Map<string, CompanyFeedbackSummary>): RadarFeedbackSummaryData {
  return Array.from(feedbackMap.values()).reduce(
    (summary, item) => ({
      repliedCount: summary.repliedCount + item.stats.replied,
      bouncedCount: summary.bouncedCount + item.stats.bounced,
      failedCount: summary.failedCount + item.stats.failed,
      noResponseCount: summary.noResponseCount + item.stats.noResponse,
      meetingBookedCount: summary.meetingBookedCount + item.stats.meetingBooked,
      notInterestedCount: summary.notInterestedCount + item.stats.notInterested,
    }),
    {
      repliedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      noResponseCount: 0,
      meetingBookedCount: 0,
      notInterestedCount: 0,
    },
  );
}

export async function getRadarDailyWorkspaceForTenant(
  tenantId: string,
  limit = DEFAULT_WORKSPACE_LIMIT,
): Promise<RadarDailyWorkspaceData> {
  const prospects = await loadWorkspaceProspects(tenantId);
  const feedbackMap = await loadFeedbackMap(tenantId, prospects);
  const items = prospects
    .map((company) => buildWorkspaceItem(company, feedbackMap.get(company.id)))
    .filter((item): item is DailyWorkspaceItem => item !== null)
    .sort(compareWorkspaceItems);

  const selected = selectWorkspaceWindow(items, Math.max(60, Math.min(limit, 300)));
  const actionable = items.filter((item) => item.bucket !== 'pending');

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      workspaceTotal: items.length,
      readyNowCount: actionable.length,
      phonePriorityCount: items.filter((item) => item.bucket === 'phone').length,
      emailPriorityCount: items.filter((item) => item.bucket === 'email').length,
      pendingCount: items.filter((item) => item.bucket === 'pending').length,
      avgReadyScore: actionable.length > 0
        ? Math.round(actionable.reduce((sum, item) => sum + item.contactReadyScore, 0) / actionable.length)
        : 0,
    },
    phonePriority: selected.phonePriority,
    emailPriority: selected.emailPriority,
    pendingEnrichment: selected.pendingEnrichment,
  };
}

export async function getDailySupplyMetricsForTenant(
  tenantId: string,
  days = DEFAULT_METRIC_DAYS,
): Promise<DailySupplyMetricsData> {
  const normalizedDays = Math.max(3, Math.min(days, 30));
  const dayKeys = buildTrailingDayKeys(normalizedDays);
  const todayKey = getCurrentRadarDayKey();

  const snapshots: RadarDailySnapshotRecord[] = await prisma.radarDailySnapshot.findMany({
    where: {
      tenantId,
      dayKey: { in: dayKeys },
    },
    orderBy: { dayKey: 'asc' },
  });

  const snapshotMap = new Map<string, RadarDailySnapshotRecord>(
    snapshots.map((snapshot) => [snapshot.dayKey, snapshot] as const),
  );
  const missingDayKeys = dayKeys.filter((dayKey) => dayKey === todayKey || !snapshotMap.has(dayKey));
  const livePoints = missingDayKeys.length > 0 ? await computeLiveDailyPoints(tenantId, missingDayKeys) : [];
  const livePointMap = new Map(livePoints.map((point) => [point.day, point]));

  const points = dayKeys.map((dayKey) => {
    const snapshot = snapshotMap.get(dayKey);
    if (snapshot) {
      return {
        day: snapshot.dayKey,
        rawCandidates: snapshot.rawCandidates,
        qualifiedCompanies: snapshot.qualifiedCompanies,
        importedProspects: snapshot.importedProspects,
        contactsAdded: snapshot.contactsAdded,
        readyCompanies: snapshot.readyCompanies,
      };
    }

    return livePointMap.get(dayKey) || {
      day: dayKey,
      rawCandidates: 0,
      qualifiedCompanies: 0,
      importedProspects: 0,
      contactsAdded: 0,
      readyCompanies: 0,
    };
  });

  const today = points[points.length - 1];
  const trailing7d = points.reduce(
    (accumulator, point) => ({
      rawCandidates: accumulator.rawCandidates + point.rawCandidates,
      qualifiedCompanies: accumulator.qualifiedCompanies + point.qualifiedCompanies,
      importedProspects: accumulator.importedProspects + point.importedProspects,
      contactsAdded: accumulator.contactsAdded + point.contactsAdded,
      readyCompanies: accumulator.readyCompanies + point.readyCompanies,
    }),
    {
      rawCandidates: 0,
      qualifiedCompanies: 0,
      importedProspects: 0,
      contactsAdded: 0,
      readyCompanies: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    today,
    trailing7d,
    points,
  };
}

export async function persistRadarDailySnapshotForTenant(
  tenantId: string,
  dayKey = getCurrentRadarDayKey(),
): Promise<PersistRadarDailySnapshotResult> {
  const [livePoints, workspaceData, prospects] = await Promise.all([
    computeLiveDailyPoints(tenantId, [dayKey]),
    getRadarDailyWorkspaceForTenant(tenantId, DEFAULT_WORKSPACE_LIMIT),
    loadWorkspaceProspects(tenantId),
  ]);

  const feedbackMap = await loadFeedbackMap(tenantId, prospects);
  const feedbackSummary = summarizeFeedback(feedbackMap);
  const metrics = livePoints[0] || {
    day: dayKey,
    rawCandidates: 0,
    qualifiedCompanies: 0,
    importedProspects: 0,
    contactsAdded: 0,
    readyCompanies: 0,
  };

  await upsertRadarDailySnapshotMetrics({
    tenantId,
    dayKey,
    metrics,
    workspaceSummary: workspaceData.summary,
    feedbackSummary,
  });

  return {
    day: dayKey,
    metrics,
    workspaceSummary: workspaceData.summary,
    feedbackSummary,
  };
}

export async function persistRadarDailyMetricsSnapshotForTenant(
  tenantId: string,
  dayKey: string,
): Promise<PersistRadarDailySnapshotResult> {
  const livePoints = await computeLiveDailyPoints(tenantId, [dayKey]);
  const metrics = livePoints[0] || {
    day: dayKey,
    rawCandidates: 0,
    qualifiedCompanies: 0,
    importedProspects: 0,
    contactsAdded: 0,
    readyCompanies: 0,
  };

  await upsertRadarDailySnapshotMetrics({
    tenantId,
    dayKey,
    metrics,
  });

  return {
    day: dayKey,
    metrics,
    workspaceSummary: EMPTY_WORKSPACE_SUMMARY,
    feedbackSummary: EMPTY_FEEDBACK_SUMMARY,
  };
}
