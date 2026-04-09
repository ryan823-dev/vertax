'use server';

// ==================== Radar V2 Server Actions ====================
// 閺傛壆澧楅懢宄邦吂闂嗙柉鎻化鑽ょ埠 - 婢舵碍绗柆鎾冲絺閻?+ 閹锋稒鐖ｉ懕姘値

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireDecider } from '@/lib/permissions';
import {
  validateRadarQuery,
  ValidationError,
} from '@/lib/validation';
import type {
  Prisma,
  ChannelType,
  CandidateStatus,
  CandidateType,
  RadarSource,
  RadarTask,
  RadarCandidate,
  ProspectCompany,
  ProspectContact,
  Opportunity,
} from '@prisma/client';
import {
  createRadarTask,
  runRadarTask,
  cancelRadarTask,
  cleanupExpiredCandidates,
} from '@/lib/radar/sync-service';
import {
  ensureAdaptersInitialized,
  listAdapterRegistrations,
  listAdaptersByChannel,
  getAdapterRegistration,
  getAdapter,
} from '@/lib/radar/adapters/registry';
import type { RadarSearchQuery } from '@/lib/radar/adapters/types';
import { enrichProspectCompany } from '@/lib/radar/enrich-pipeline';

// ==================== 缁鐎风€电厧鍤?====================

export type RadarSourceData = RadarSource;
export type RadarTaskData = RadarTask;
export type RadarCandidateData = RadarCandidate;
export type ProspectCompanyData = ProspectCompany & { _count?: { contacts: number } };
export type ProspectContactData = ProspectContact;
export type OpportunityData = Opportunity;

export interface CreateProspectContactInput {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  seniority?: string;
  linkedInUrl?: string;
  notes?: string;
}

export interface SyncResultData {
  success: boolean;
  taskId: string;
  stats: {
    fetched: number;
    created: number;
    duplicates: number;
    errors: string[];
    duration: number;
  };
}

export interface RadarStatsData {
  totalCandidates: number;
  newCandidates: number;
  qualifiedCandidates: number;
  importedCandidates: number;
  opportunities: number;
  companies: number;
  runningTasks: number;
}

// ==================== 閸樺鍣稿銉ュ徔閸戣姤鏆?====================

/**
 * 鐟欏嫯瀵栭崠鏍秹缁旀瑥鐓欓崥宥囨暏娴滃氦娉曞┃鎰箵闁?
 * 娓氬顩? "https://www.example.com/path" -> "example.com"
 */
function normalizeDomainForDedup(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    let domain = url.hostname.toLowerCase();
    // 缁夊娅?www. 閸撳秶绱?
    if (domain.startsWith('www.')) {
      domain = domain.slice(4);
    }
    return domain;
  } catch {
    return null;
  }
}

function extractStringReasons(value: unknown): string[] | null {
  if (!value || typeof value !== 'object') return null;

  const reasons = (value as Record<string, unknown>).reasons;
  if (!Array.isArray(reasons)) return null;

  const stringReasons = reasons.filter(
    (reason): reason is string => typeof reason === 'string'
  );

  return stringReasons.length > 0 ? stringReasons : null;
}

// ==================== 閺佺増宓佸┃鎰吀閻?====================

/**
 * 閼惧嘲褰囬幍鈧張澶嬫殶閹诡喗绨?
 */
export async function getRadarSourcesV2(channelType?: ChannelType): Promise<RadarSource[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  ensureAdaptersInitialized();
  
  const where: Record<string, unknown> = {
    OR: [
      { tenantId: session.user.tenantId },
      { tenantId: null }, // 缁崵绮虹痪褍鍙曢崗杈ㄧ爱
    ],
  };
  
  if (channelType) {
    where.channelType = channelType;
  }
  
  return prisma.radarSource.findMany({
    where,
    orderBy: [
      { isOfficial: 'desc' },
      { channelType: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * 閼惧嘲褰囬崣顖滄暏閻ㄥ嫰鈧倿鍘ら崳銊ュ灙鐞?
 */
export async function getAvailableAdaptersV2(channelType?: string) {
  ensureAdaptersInitialized();
  
  if (channelType) {
    return listAdaptersByChannel(channelType);
  }
  return listAdapterRegistrations();
}

/**
 * 閼惧嘲褰囬柅鍌炲帳閸ｃ劏顕涢幆?
 */
export async function getAdapterInfoV2(code: string) {
  ensureAdaptersInitialized();
  return getAdapterRegistration(code);
}

/**
 * 濡偓閺屻儲鏆熼幑顔界爱閸嬨儱鎮嶉悩鑸碘偓?
 */
export async function checkSourceHealthV2(sourceId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  ensureAdaptersInitialized();
  
  const source = await prisma.radarSource.findUnique({
    where: { id: sourceId },
  });
  
  if (!source) throw new Error('Source not found');
  
  const adapter = getAdapter(source.code, source.adapterConfig as Record<string, unknown>);
  const health = await adapter.healthCheck();
  
  // 閺囧瓨鏌婇弫鐗堝祦濠ф劗濮搁幀?
  await prisma.radarSource.update({
    where: { id: sourceId },
    data: {
      syncStats: {
        ...(source.syncStats as object || {}),
        lastHealthCheck: new Date().toISOString(),
        healthy: health.healthy,
        latency: health.latency,
        error: health.error,
      },
    },
  });
  
  return health;
}

/**
 * 閸掓繂顫愰崠鏍兇缂佺喐鏆熼幑顔界爱閿涘牓顩诲▎鈥插▏閻劍妞傜拫鍐暏閿?
 */
export async function initializeSystemSourcesV2() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  ensureAdaptersInitialized();
  
  const registrations = listAdapterRegistrations();
  const created: RadarSource[] = [];
  
  for (const reg of registrations) {
    // 濡偓閺屻儲妲搁崥锕€鍑＄€涙ê婀?
    const existing = await prisma.radarSource.findUnique({
      where: { code: reg.code },
    });
    
    if (!existing) {
      const source = await prisma.radarSource.create({
        data: {
          tenantId: null, // 缁崵绮虹痪?
          channelType: reg.channelType,
          name: reg.name,
          code: reg.code,
          description: reg.description,
          websiteUrl: reg.websiteUrl,
          countries: reg.countries || [],
          regions: reg.regions || [],
          adapterType: reg.adapterType,
          adapterConfig: reg.defaultConfig as Prisma.InputJsonValue,
          isOfficial: reg.isOfficial,
          termsUrl: reg.termsUrl,
          storagePolicy: reg.storagePolicy,
          ttlDays: reg.ttlDays,
          attributionRequired: reg.attributionRequired,
          rateLimit: reg.features.rateLimit as Prisma.InputJsonValue,
          isEnabled: true,
        },
      });
      created.push(source);
    }
  }
  
  return created;
}

// ==================== 閸欐垹骞囨禒璇插缁狅紕鎮?====================

/**
 * 閸掓稑缂撻崣鎴犲箛娴犺濮?
 */
export async function createDiscoveryTaskV2(input: {
  sourceId: string;
  name?: string;
  queryConfig: RadarSearchQuery;
  targetingRef?: {
    segmentId?: string;
    personaId?: string;
    specVersionId?: string;
  };
}): Promise<RadarTask> {
  // 妤犲矁鐦夋潏鎾冲弳
  if (!input.sourceId) {
    throw new ValidationError('sourceId is required');
  }

  // 妤犲矁鐦夐弻銉嚄闁板秶鐤?
  const validatedQuery = validateRadarQuery(input.queryConfig);

  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  return createRadarTask({
    tenantId: session.user.tenantId,
    sourceId: input.sourceId,
    name: input.name,
    queryConfig: validatedQuery,
    targetingRef: input.targetingRef,
    triggeredBy: session.user.id,
  });
}

/**
 * 鏉╂劘顢戦崣鎴犲箛娴犺濮?
 */
export async function runDiscoveryTaskV2(taskId: string): Promise<SyncResultData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  // 妤犲矁鐦夋禒璇插鐏炵偘绨ぐ鎾冲缁夌喐鍩?
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
  });
  
  if (!task || task.tenantId !== session.user.tenantId) {
    throw new Error('Task not found');
  }
  
  return runRadarTask(taskId);
}

/**
 * 閸欐牗绉烽崣鎴犲箛娴犺濮?
 */
export async function cancelDiscoveryTaskV2(taskId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
  });
  
  if (!task || task.tenantId !== session.user.tenantId) {
    throw new Error('Task not found');
  }
  
  return cancelRadarTask(taskId, session.user.id);
}

/**
 * 閼惧嘲褰囨禒璇插閸掓銆?
 */
export async function getDiscoveryTasksV2(options?: {
  sourceId?: string;
  status?: string;
  limit?: number;
}): Promise<Array<RadarTask & { source: RadarSource }>> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  
  if (options?.sourceId) {
    where.sourceId = options.sourceId;
  }
  if (options?.status) {
    where.status = options.status;
  }
  
  return prisma.radarTask.findMany({
    where,
    include: { source: true },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
  });
}

/**
 * 閼惧嘲褰囨禒璇插鐠囷附鍎?
 */
export async function getDiscoveryTaskV2(taskId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const task = await prisma.radarTask.findUnique({
    where: { id: taskId },
    include: { source: true },
  });
  
  if (task && task.tenantId !== session.user.tenantId) {
    return null;
  }
  
  return task;
}

// ==================== 閸婃瑩鈧鐫滅粻锛勬倞 ====================

/**
 * 閼惧嘲褰囬崐娆撯偓澶婂灙鐞?
 */
export async function getCandidatesV2(options?: {
  candidateType?: CandidateType;
  status?: CandidateStatus;
  sourceId?: string;
  qualifyTier?: string;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  country?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ candidates: Array<RadarCandidate & { source: RadarSource }>; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  
  if (options?.candidateType) {
    where.candidateType = options.candidateType;
  }
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.sourceId) {
    where.sourceId = options.sourceId;
  }
  if (options?.qualifyTier) {
    where.qualifyTier = options.qualifyTier;
  }
  if (options?.hasPhone) {
    where.phone = { not: null };
  }
  if (options?.hasWebsite) {
    where.website = { not: null };
  }
  if (options?.country) {
    where.OR = [
      { country: options.country },
      { buyerCountry: options.country },
    ];
  }
  if (options?.search) {
    where.OR = [
      { displayName: { contains: options.search, mode: 'insensitive' } },
      { buyerName: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const [candidates, total] = await Promise.all([
    prisma.radarCandidate.findMany({
      where,
      include: { source: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.radarCandidate.count({ where }),
  ]);
  
  return { candidates, total };
}

/**
 * 閼惧嘲褰囬崐娆撯偓澶庮嚊閹?
 */
export async function getCandidateV2(candidateId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true, task: true },
  });
  
  if (candidate && candidate.tenantId !== session.user.tenantId) {
    return null;
  }
  
  return candidate;
}

/**
 * 閸氬牊鐗搁崠鏍р偓娆撯偓澶涚礄閸掑棗鐪伴敍?
 */
export async function qualifyCandidateV2(
  candidateId: string,
  tier: 'A' | 'B' | 'C' | 'excluded',
  reason?: string
): Promise<RadarCandidate> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
  });
  
  if (!candidate || candidate.tenantId !== session.user.tenantId) {
    throw new Error('Candidate not found');
  }
  
  const updated = await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: tier === 'excluded' ? 'EXCLUDED' : 'QUALIFIED',
      qualifyTier: tier,
      qualifyReason: reason,
      qualifiedAt: new Date(),
      qualifiedBy: session.user.id,
    },
  });
  
  // 鐠佹澘缍?Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidate_qualified',
      entityType: 'RadarCandidate',
      entityId: candidateId,
      eventCategory: 'radar',
      context: { tier, reason } as object,
    },
  });

  // 閹烘帡娅庨弮璺虹磽濮濄儴袝閸欐埊绱拌箛顐︹偓鐔活唶瑜版洖鍙曢崣绋挎倳 + AI 濡€崇础閹绘劗鍋?
  if (tier === 'excluded') {
    const tenantId = session.user.tenantId;
    void (async () => {
      try {
        const { appendExcludedCompany, learnExclusionPattern } = await import(
          '@/lib/radar/exclusion-learner'
        );
        // 1. 缁斿宓嗛幎濠傚彆閸欑鎮曟潻钘夊閸?excludedCompanies
        if (candidate.profileId) {
          await appendExcludedCompany(candidate.profileId, candidate.displayName);
        }
        // 2. 濮?5 濞嗏剝甯撻梽銈埿曢崣鎴滅濞?AI 濡€崇础閹绘劗鍋ч敍鍫ｅΝ閻?token閿?
        const excludedCount = await prisma.radarCandidate.count({
          where: { tenantId, status: 'EXCLUDED' },
        });
        if (excludedCount % 5 === 0 && candidate.profileId) {
          await learnExclusionPattern(tenantId, candidate.profileId);
        }
      } catch {
        // 闂堟瑩绮径杈Е
      }
    })();
  }

  return updated;
}

/**
 * 閹靛綊鍣洪崥鍫熺壐閸?
 */
export async function qualifyCandidatesBatchV2(
  candidateIds: string[],
  tier: 'A' | 'B' | 'C' | 'excluded',
  reason?: string
): Promise<number> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const result = await prisma.radarCandidate.updateMany({
    where: {
      id: { in: candidateIds },
      tenantId: session.user.tenantId,
    },
    data: {
      status: tier === 'excluded' ? 'EXCLUDED' : 'QUALIFIED',
      qualifyTier: tier,
      qualifyReason: reason,
      qualifiedAt: new Date(),
      qualifiedBy: session.user.id,
    },
  });
  
  // 鐠佹澘缍?Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidates_batch_qualified',
      entityType: 'RadarCandidate',
      entityId: candidateIds.join(','),
      eventCategory: 'radar',
      context: { count: result.count, tier, reason } as object,
    },
  });
  
  return result.count;
}

// ==================== 鐎电厧鍙嗙痪璺ㄥ偍鎼?====================

/**
 * 鐎电厧鍙嗛崐娆撯偓澶婂煂 ProspectCompany
 */
export async function importCandidateToCompanyV2(
  candidateId: string
): Promise<ProspectCompany> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true },
  });

  if (!candidate || candidate.tenantId !== session.user.tenantId) {
    throw new Error('Candidate not found');
  }

  // 濡偓閺屻儲妲搁崥锕€鍑＄€电厧鍙?
  if (candidate.status === 'IMPORTED') {
    throw new Error('Candidate already imported');
  }

  const companyName = candidate.buyerName || candidate.displayName;
  const companyCountry = candidate.buyerCountry || candidate.country;

  // 閸樺鍣稿Λ鈧弻銉窗閸╄桨绨純鎴犵彲閸╃喎鎮?
  let existingCompany: { id: string } | null = null;
  if (candidate.website) {
    const domain = normalizeDomainForDedup(candidate.website);
    if (domain) {
      existingCompany = await prisma.prospectCompany.findFirst({
        where: {
          tenantId: session.user.tenantId,
          website: { contains: domain, mode: 'insensitive' },
          deletedAt: null,
        },
      });
    }
  }

  // 閸樺鍣稿Λ鈧弻銉窗閸╄桨绨崗顒€寰冮崥宥囆?+ 閸ヨ棄顔?
  if (!existingCompany && companyName) {
    existingCompany = await prisma.prospectCompany.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: { equals: companyName, mode: 'insensitive' },
        country: companyCountry || null,
        deletedAt: null,
      },
    });
  }

  // 婵″倹鐏夊鎻掔摠閸︻煉绱濇潻鏂挎礀瀹稿弶婀佺拋鏉跨秿楠炶埖鐖ｇ拋鏉库偓娆撯偓澶婂嚒鐎电厧鍙?
  if (existingCompany) {
    await prisma.radarCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'IMPORTED',
        importedToType: 'ProspectCompany',
        importedToId: existingCompany.id,
        importedAt: new Date(),
        importedBy: session.user.id,
      },
    });
    return prisma.prospectCompany.findUnique({ where: { id: existingCompany.id } }) as Promise<ProspectCompany>;
  }

  // 閸掓稑缂?ProspectCompany
  const matchReasons =
    extractStringReasons(candidate.aiRelevance) ??
    extractStringReasons(candidate.matchExplain);

  const company = await prisma.prospectCompany.create({
    data: {
      tenantId: session.user.tenantId,
      name: companyName,
      website: candidate.website,
      phone: candidate.phone,
      email: candidate.email,
      address: candidate.address,
      country: companyCountry,
      city: candidate.city,
      industry: candidate.industry,
      companySize: candidate.companySize,
      description: candidate.description,
      tier: candidate.qualifyTier,
      matchReasons: matchReasons
        ? (matchReasons as Prisma.InputJsonValue)
        : undefined,
      approachAngle: candidate.aiSummary || null,
      sourceType: candidate.source.channelType.toLowerCase(),
      sourceCandidateId: candidateId,
      sourceUrl: candidate.sourceUrl,
      status: 'new',
    },
  });
  
  // 閼奉亜濮╅幓鎰絿閸愬磭鐡ラ懓鍛颁粓缁姹夐敍鍫濄亼鐠愩儰绗夐梼璇差敚鐎电厧鍙嗛敍?
  try {
    await extractContactsFromCandidate(candidate, company.id, session.user.tenantId, candidateId);
  } catch (err) {
    console.error('[importCandidateToCompanyV2] Contact extraction failed (non-blocking):', err);
  }
  
  // 閺囧瓨鏌婇崐娆撯偓澶屽Ц閹?
  await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: 'IMPORTED',
      importedToType: 'ProspectCompany',
      importedToId: company.id,
      importedAt: new Date(),
      importedBy: session.user.id,
    },
  });
  
  // 鐠佹澘缍?Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidate_imported_company',
      entityType: 'ProspectCompany',
      entityId: company.id,
      eventCategory: 'radar',
      context: { candidateId, companyName: company.name } as object,
    },
  });
  
  return company;
}

/**
 * 鐎电厧鍙嗛崐娆撯偓澶婂煂 Opportunity
 */
export async function importCandidateToOpportunityV2(
  candidateId: string,
  companyId?: string
): Promise<Opportunity> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true },
  });
  
  if (!candidate || candidate.tenantId !== session.user.tenantId) {
    throw new Error('Candidate not found');
  }
  
  if (candidate.candidateType !== 'OPPORTUNITY') {
    throw new Error('Candidate is not an opportunity');
  }
  
  // 閸掓稑缂?Opportunity
  const opportunity = await prisma.opportunity.create({
    data: {
      tenantId: session.user.tenantId,
      companyId,
      sourceType: 'tender',
      sourceCandidateId: candidateId,
      sourceUrl: candidate.sourceUrl,
      title: candidate.displayName,
      description: candidate.description,
      deadline: candidate.deadline,
      estimatedValue: candidate.estimatedValue,
      currency: candidate.currency,
      categoryCode: candidate.categoryCode,
      categoryName: candidate.categoryName,
      stage: 'IDENTIFIED',
    },
  });
  
  // 閺囧瓨鏌婇崐娆撯偓澶屽Ц閹?
  await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: 'IMPORTED',
      importedToType: 'Opportunity',
      importedToId: opportunity.id,
      importedAt: new Date(),
      importedBy: session.user.id,
    },
  });
  
  // 鐠佹澘缍?Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'radar_candidate_imported_opportunity',
      entityType: 'Opportunity',
      entityId: opportunity.id,
      eventCategory: 'radar',
      context: { candidateId, title: opportunity.title } as object,
    },
  });
  
  return opportunity;
}

/**
 * 閹靛綊鍣虹€电厧鍙?
 */
export async function importCandidatesBatchV2(
  candidateIds: string[],
  targetType: 'company' | 'opportunity'
): Promise<{ imported: number; failed: number }> {
  // 妤犲矁鐦夋潏鎾冲弳
  if (!candidateIds || candidateIds.length === 0) {
    throw new ValidationError('candidateIds is required');
  }
  if (candidateIds.length > 100) {
    throw new ValidationError('Maximum 100 candidates per batch');
  }

  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of candidateIds) {
    try {
      if (targetType === 'company') {
        await importCandidateToCompanyV2(id);
      } else {
        await importCandidateToOpportunityV2(id);
      }
      imported++;
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[importCandidatesBatchV2] Failed to import ${id}:`, msg);
      errors.push(`${id}: ${msg}`);
    }
  }

  return { imported, failed };
}

// ==================== ProspectCompany 缁狅紕鎮?====================

/**
 * 閼惧嘲褰囩痪璺ㄥ偍閸忣剙寰冮崚妤勩€?
 */
export async function getProspectCompaniesV2(options?: {
  status?: string;
  tier?: string;
  industry?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ companies: ProspectCompanyData[]; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };
  
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.tier) {
    where.tier = options.tier;
  }
  if (options?.industry) {
    where.industry = { contains: options.industry, mode: 'insensitive' };
  }
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const [companies, total] = await Promise.all([
    prisma.prospectCompany.findMany({
      where,
      include: { _count: { select: { contacts: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.prospectCompany.count({ where }),
  ]);
  
  return { companies: companies as ProspectCompanyData[], total };
}

// ==================== Opportunity 缁狅紕鎮?====================

/**
 * 閼惧嘲褰囬張杞扮窗閸掓銆?
 */
export async function getOpportunitiesV2(options?: {
  stage?: string;
  companyId?: string;
  hasDeadline?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ opportunities: Array<Opportunity & { company: ProspectCompany | null }>; total: number }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    deletedAt: null,
  };
  
  if (options?.stage) {
    where.stage = options.stage;
  }
  if (options?.companyId) {
    where.companyId = options.companyId;
  }
  if (options?.hasDeadline) {
    where.deadline = { not: null };
  }
  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: { company: true },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.opportunity.count({ where }),
  ]);
  
  return { opportunities, total };
}

/**
 * 閺囧瓨鏌婇張杞扮窗闂冭埖顔?
 */
export async function updateOpportunityStageV2(
  opportunityId: string,
  stage: string,
  notes?: string
): Promise<Opportunity> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');
  
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  
  if (!opportunity || opportunity.tenantId !== session.user.tenantId) {
    throw new Error('Opportunity not found');
  }
  
  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      stage: stage as Opportunity['stage'],
      notes: notes ? `${opportunity.notes || ''}\n\n${new Date().toISOString()}: ${notes}` : opportunity.notes,
      ...(stage === 'WON' ? { wonAt: new Date() } : {}),
      ...(stage === 'LOST' ? { lostAt: new Date() } : {}),
    },
  });
  
  // 鐠佹澘缍?Activity
  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'opportunity_stage_updated',
      entityType: 'Opportunity',
      entityId: opportunityId,
      eventCategory: 'radar',
      context: { previousStage: opportunity.stage, newStage: stage, notes } as object,
    },
  });
  
  return updated;
}

// ==================== ProspectContact 缁狅紕鎮?====================

/**
 * 娴犲骸鈧瑩鈧甯慨瀣殶閹诡喕鑵戦幒銊︽焽閼辨梻閮存禍楦夸捍缁?
 */
function inferSeniority(title: string | undefined): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (/\b(ceo|cto|cfo|coo|cmo|cio|founder|co-founder|owner|president|chairman)\b/.test(t)) return 'C-level';
  if (/\b(vp|vice president)\b/.test(t)) return 'VP';
  if (/\bdirector\b/.test(t)) return 'Director';
  if (/\bmanager\b/.test(t)) return 'Manager';
  return 'Staff';
}

/**
 * 娴犲骸鈧瑩鈧鏆熼幑顔炬畱 intelligence 娑擃厽褰侀崣鏍粓缁姹夐獮璺哄灡瀵?ProspectContact
 */
async function extractContactsFromCandidate(
  candidate: RadarCandidate,
  companyId: string,
  tenantId: string,
  candidateId: string
): Promise<number> {
  const rawData = candidate.rawData as Record<string, unknown> | null;
  if (!rawData) return 0;

  const intelligence = rawData.intelligence as Record<string, unknown> | undefined;
  const contactsData = intelligence?.contacts as Record<string, unknown> | undefined;
  const decisionMakers = contactsData?.decisionMakers as Array<{
    name?: string;
    title?: string;
    email?: string;
    linkedIn?: string;
    linkedin?: string;
    emailConfidence?: number;
  }> | undefined;

  if (!decisionMakers || decisionMakers.length === 0) return 0;

  let created = 0;
  for (const dm of decisionMakers) {
    if (!dm.name) continue;
    // 閸樺鍣搁敍姘倱閸忣剙寰冮崥灞芥倳鐠哄疇绻?
    const exists = await prisma.prospectContact.findFirst({
      where: { tenantId, companyId, name: dm.name, deletedAt: null },
    });
    if (exists) continue;

    await prisma.prospectContact.create({
      data: {
        tenantId,
        companyId,
        name: dm.name,
        role: dm.title || null,
        email: dm.email || null,
        linkedInUrl: dm.linkedIn || dm.linkedin || null,
        seniority: inferSeniority(dm.title),
        sourceCandidateId: candidateId,
        status: 'new',
      },
    });
    created++;
  }
  return created;
}

/**
 * 閼惧嘲褰囬崗顒€寰冮懕鏃傞兇娴滃搫鍨悰?
 */
export async function getProspectContacts(companyId: string): Promise<ProspectContactData[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  const company = await prisma.prospectCompany.findUnique({ where: { id: companyId } });
  if (!company || company.tenantId !== session.user.tenantId) {
    throw new Error('Company not found');
  }

  return prisma.prospectContact.findMany({
    where: { tenantId: session.user.tenantId, companyId, deletedAt: null },
    orderBy: [
      { createdAt: 'asc' },
    ],
  });
}

/**
 * 閸掓稑缂撻懕鏃傞兇娴?
 */
export async function createProspectContact(input: CreateProspectContactInput): Promise<ProspectContactData> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  const company = await prisma.prospectCompany.findUnique({ where: { id: input.companyId } });
  if (!company || company.tenantId !== session.user.tenantId) {
    throw new Error('Company not found');
  }

  const contact = await prisma.prospectContact.create({
    data: {
      tenantId: session.user.tenantId,
      companyId: input.companyId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      role: input.role || null,
      department: input.department || null,
      seniority: input.seniority || null,
      linkedInUrl: input.linkedInUrl || null,
      notes: input.notes || null,
      status: 'new',
    },
  });

  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'prospect_contact_created',
      entityType: 'ProspectContact',
      entityId: contact.id,
      eventCategory: 'radar',
      context: { companyId: input.companyId, contactName: input.name } as object,
    },
  });

  return contact;
}

/**
 * 閺囧瓨鏌婇懕鏃傞兇娴?
 */
export async function updateProspectContact(
  contactId: string,
  input: Partial<Omit<CreateProspectContactInput, 'companyId'>>
): Promise<ProspectContactData> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  const contact = await prisma.prospectContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.tenantId !== session.user.tenantId || contact.deletedAt) {
    throw new Error('Contact not found');
  }

  const updated = await prisma.prospectContact.update({
    where: { id: contactId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.role !== undefined && { role: input.role || null }),
      ...(input.department !== undefined && { department: input.department || null }),
      ...(input.seniority !== undefined && { seniority: input.seniority || null }),
      ...(input.linkedInUrl !== undefined && { linkedInUrl: input.linkedInUrl || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
  });

  return updated;
}

/**
 * 閸掔娀娅庨懕鏃傞兇娴滅尨绱欐潪顖氬灩闂勩倧绱?
 */
export async function deleteProspectContact(contactId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  const contact = await prisma.prospectContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.tenantId !== session.user.tenantId || contact.deletedAt) {
    throw new Error('Contact not found');
  }

  await prisma.prospectContact.update({
    where: { id: contactId },
    data: { deletedAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'prospect_contact_deleted',
      entityType: 'ProspectContact',
      entityId: contactId,
      eventCategory: 'radar',
      context: { contactName: contact.name, companyId: contact.companyId } as object,
    },
  });
}

// ==================== 閼冲矁鐨熺粻鈧幎?====================

/**
 * 閻㈢喐鍨氱€广垺鍩涢懗宀冪殶缁犫偓閹?
 */
export async function generateProspectDossier(companyId: string): Promise<{
  ok: boolean;
  versionId?: string;
  content?: Record<string, unknown>;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error('Unauthorized');

  const company = await prisma.prospectCompany.findUnique({ where: { id: companyId } });
  if (!company || company.tenantId !== session.user.tenantId) {
    throw new Error('Company not found');
  }

  // 閺€鍫曟肠閹碘偓閺堝娴夐崗铏殶閹?
  const [contacts, opportunities, sourceCandidate] = await Promise.all([
    prisma.prospectContact.findMany({
      where: { tenantId: session.user.tenantId, companyId, deletedAt: null },
    }),
    prisma.opportunity.findMany({
      where: { tenantId: session.user.tenantId, companyId, deletedAt: null },
    }),
    company.sourceCandidateId
      ? prisma.radarCandidate.findUnique({ where: { id: company.sourceCandidateId } })
      : null,
  ]);

  // 閹绘劕褰?intelligence 閺佺増宓?
  const rawData = sourceCandidate?.rawData as Record<string, unknown> | null;
  const intelligence = rawData?.intelligence as Record<string, unknown> | undefined;

  // 鐠嬪啰鏁?AI 閹垛偓閼?
  const { executeSkill } = await import('@/actions/skills');
  const result = await executeSkill(
    'radar.generateProspectDossier',
    {
      entityType: 'ProspectDossier',
      entityId: companyId,
      mode: 'generate',
      useCompanyProfile: true,
      input: {
        prospectCompany: {
          id: company.id,
          name: company.name,
          website: company.website,
          phone: company.phone,
          email: company.email,
          address: company.address,
          country: company.country,
          city: company.city,
          industry: company.industry,
          companySize: company.companySize,
          description: company.description,
          tier: company.tier,
          status: company.status,
          sourceType: company.sourceType,
          sourceUrl: company.sourceUrl,
        },
        contacts: contacts.map(c => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
          role: c.role,
          department: c.department,
          seniority: c.seniority,
          linkedInUrl: c.linkedInUrl,
        })),
        opportunities: opportunities.map(o => ({
          title: o.title,
          description: o.description,
          stage: o.stage,
          estimatedValue: o.estimatedValue,
          currency: o.currency,
          deadline: o.deadline,
          sourceType: o.sourceType,
        })),
        candidateData: sourceCandidate ? {
          matchScore: sourceCandidate.matchScore,
          matchExplain: sourceCandidate.matchExplain,
          aiRelevance: sourceCandidate.aiRelevance,
          aiSummary: sourceCandidate.aiSummary,
        } : null,
        intelligence: intelligence || null,
      },
    }
  );

  return {
    ok: result.ok,
    versionId: result.versionId,
    content: result.output,
    error: result.ok ? undefined : 'Skill execution failed',
  };
}

/**
 * 閼惧嘲褰囬張鈧弬鎷屽剹鐠嬪啰鐣濋幎?
 */
export async function getLatestProspectDossier(companyId: string): Promise<{
  id: string;
  version: number;
  content: Record<string, unknown>;
  createdAt: Date;
} | null> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');

  const version = await prisma.artifactVersion.findFirst({
    where: {
      tenantId: session.user.tenantId,
      entityType: 'ProspectDossier',
      entityId: companyId,
    },
    orderBy: { version: 'desc' },
  });

  if (!version) return null;

  return {
    id: version.id,
    version: version.version,
    content: version.content as Record<string, unknown>,
    createdAt: version.createdAt,
  };
}

// ==================== 缂佺喕顓?====================

/**
 * 閼惧嘲褰囬梿鐤彧缂佺喕顓?
 */
export async function getRadarStatsV2(): Promise<RadarStatsData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const tenantId = session.user.tenantId;
  
  const [
    totalCandidates,
    newCandidates,
    qualifiedCandidates,
    importedCandidates,
    opportunities,
    companies,
    runningTasks,
  ] = await Promise.all([
    prisma.radarCandidate.count({ where: { tenantId } }),
    prisma.radarCandidate.count({ where: { tenantId, status: 'NEW' } }),
    prisma.radarCandidate.count({ where: { tenantId, status: 'QUALIFIED' } }),
    prisma.radarCandidate.count({ where: { tenantId, status: 'IMPORTED' } }),
    prisma.radarCandidate.count({ where: { tenantId, candidateType: 'OPPORTUNITY' } }),
    prisma.prospectCompany.count({ where: { tenantId, deletedAt: null } }),
    prisma.radarTask.count({ where: { tenantId, status: 'RUNNING' } }),
  ]);
  
  return {
    totalCandidates,
    newCandidates,
    qualifiedCandidates,
    importedCandidates,
    opportunities,
    companies,
    runningTasks,
  };
}

// ==================== RadarSearchProfile 缁狅紕鎮?====================

export interface RadarSearchProfileData {
  id: string;
  name: string;
  description: string | null;
  segmentId: string | null;
  personaId: string | null;
  keywords: Record<string, string[]>;
  negativeKeywords: string[] | null;
  targetCountries: string[];
  targetRegions: string[];
  industryCodes: string[];
  categoryFilters: string[];
  enabledChannels: string[];
  sourceIds: string[];
  isActive: boolean;
  scheduleRule: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  lockToken: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  maxRunSeconds: number;
  autoQualify: boolean;
  autoEnrich: boolean;
  runStats: {
    totalRuns?: number;
    totalNew?: number;
    lastError?: string;
    avgDurationMs?: number;
  } | null;
  exclusionRules: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  // 閸忓疇浠?
  segment?: { id: string; name: string } | null;
  persona?: { id: string; name: string } | null;
  _count?: { cursors: number };
}

export interface CreateRadarSearchProfileInput {
  name: string;
  description?: string;
  segmentId?: string;
  personaId?: string;
  keywords?: Record<string, string[]>;
  negativeKeywords?: string[];
  targetCountries?: string[];
  targetRegions?: string[];
  industryCodes?: string[];
  categoryFilters?: string[];
  enabledChannels?: string[];
  sourceIds?: string[];
  scheduleRule?: string;
  maxRunSeconds?: number;
  autoQualify?: boolean;
  autoEnrich?: boolean;
  // 閺傛澘顤冮敍姘辩翱閸戝棗鐣炬担宥呯摟濞?
  targetCustomerType?: string[];      // 閻╊喗鐖ｇ€广垺鍩涚猾璇茬€烽敍姝產nufacturer, distributor, service_provider, retailer
  businessScenario?: string;          // 娑撴艾濮熼崷鐑樻珯閹诲繗鍫敍姘灉閸楁牔绮堟稊鍫礉鐎广垺鍩涢棁鈧憰浣风矆娑?
  exampleCustomers?: string[];        // 缁€杞扮伐閻╊喗鐖ｇ€广垺鍩?
  myProduct?: string;                 // 閹存垹娈戞禍褍鎼?閺堝秴濮?
}

/**
 * 閼惧嘲褰囬幍顐ｅ伎鐠佲€冲灊閸掓銆?
 */
export async function getRadarSearchProfiles(options?: {
  isActive?: boolean;
  limit?: number;
}): Promise<RadarSearchProfileData[]> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };
  
  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }
  
  const profiles = await prisma.radarSearchProfile.findMany({
    where,
    orderBy: [
      { isActive: 'desc' },
      { nextRunAt: 'asc' },
      { createdAt: 'desc' },
    ],
    take: options?.limit || 100,
  });
  
  // 閼惧嘲褰囬崗瀹犱粓閻?segment 閸?persona
  const segmentIds = profiles.map(p => p.segmentId).filter(Boolean) as string[];
  const personaIds = profiles.map(p => p.personaId).filter(Boolean) as string[];
  
  const [segments, personas, cursorCounts] = await Promise.all([
    segmentIds.length > 0 
      ? prisma.iCPSegment.findMany({ where: { id: { in: segmentIds } }, select: { id: true, name: true } })
      : [],
    personaIds.length > 0
      ? prisma.persona.findMany({ where: { id: { in: personaIds } }, select: { id: true, name: true } })
      : [],
    prisma.radarScanCursor.groupBy({
      by: ['profileId'],
      where: { profileId: { in: profiles.map(p => p.id) } },
      _count: true,
    }),
  ]);
  
  const segmentMap = new Map(segments.map(s => [s.id, s]));
  const personaMap = new Map(personas.map(p => [p.id, p]));
  const cursorCountMap = new Map(cursorCounts.map(c => [c.profileId, c._count]));
  
  return profiles.map(p => ({
    ...p,
    keywords: (p.keywords || {}) as Record<string, string[]>,
    negativeKeywords: p.negativeKeywords as string[] | null,
    enabledChannels: p.enabledChannels as string[],
    runStats: p.runStats as RadarSearchProfileData['runStats'],
    exclusionRules: p.exclusionRules as Record<string, unknown> | null,
    segment: p.segmentId ? segmentMap.get(p.segmentId) || null : null,
    persona: p.personaId ? personaMap.get(p.personaId) || null : null,
    _count: { cursors: cursorCountMap.get(p.id) || 0 },
  }));
}

/**
 * 閼惧嘲褰囬崡鏇氶嚋閹殿偅寮跨拋鈥冲灊
 */
export async function getRadarSearchProfile(profileId: string): Promise<RadarSearchProfileData | null> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const profile = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!profile || profile.tenantId !== session.user.tenantId) {
    return null;
  }
  
  // 閼惧嘲褰囬崗瀹犱粓閺佺増宓?
  const [segment, persona, cursorCount] = await Promise.all([
    profile.segmentId ? prisma.iCPSegment.findUnique({ where: { id: profile.segmentId }, select: { id: true, name: true } }) : null,
    profile.personaId ? prisma.persona.findUnique({ where: { id: profile.personaId }, select: { id: true, name: true } }) : null,
    prisma.radarScanCursor.count({ where: { profileId } }),
  ]);
  
  return {
    ...profile,
    keywords: (profile.keywords || {}) as Record<string, string[]>,
    negativeKeywords: profile.negativeKeywords as string[] | null,
    enabledChannels: profile.enabledChannels as string[],
    runStats: profile.runStats as RadarSearchProfileData['runStats'],
    exclusionRules: profile.exclusionRules as Record<string, unknown> | null,
    segment,
    persona,
    _count: { cursors: cursorCount },
  };
}

/**
 * 閸掓稑缂撻幍顐ｅ伎鐠佲€冲灊
 */
export async function createRadarSearchProfile(input: CreateRadarSearchProfileInput): Promise<RadarSearchProfileData> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  // 鐠侊紕鐣婚崚婵嗩潗 nextRunAt
  let nextRunAt: Date | null = null;
  if (input.scheduleRule) {
    try {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(input.scheduleRule);
      nextRunAt = interval.next().toDate();
    } catch (error) {
      console.warn('[createRadarSearchProfile] Invalid cron expression, using default:', error);
      nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }
  
  const profile = await prisma.radarSearchProfile.create({
    data: {
      tenantId: session.user.tenantId,
      name: input.name,
      description: input.description,
      segmentId: input.segmentId,
      personaId: input.personaId,
      keywords: (input.keywords || { en: [] }) as Prisma.InputJsonValue,
      negativeKeywords: input.negativeKeywords as Prisma.InputJsonValue,
      targetCountries: input.targetCountries || [],
      targetRegions: input.targetRegions || [],
      industryCodes: input.industryCodes || [],
      categoryFilters: input.categoryFilters || [],
      enabledChannels: (input.enabledChannels || []) as never[],
      sourceIds: input.sourceIds || [],
      scheduleRule: input.scheduleRule || '0 6 * * *',
      maxRunSeconds: input.maxRunSeconds || 45,
      autoQualify: input.autoQualify ?? true,
      autoEnrich: input.autoEnrich ?? false,
      nextRunAt,
      isActive: true,
    },
  });
  
  return {
    ...profile,
    keywords: (profile.keywords || {}) as Record<string, string[]>,
    negativeKeywords: profile.negativeKeywords as string[] | null,
    enabledChannels: profile.enabledChannels as string[],
    runStats: null,
    exclusionRules: null,
    segment: null,
    persona: null,
    _count: { cursors: 0 },
  };
}

/**
 * 閺囧瓨鏌婇幍顐ｅ伎鐠佲€冲灊
 */
export async function updateRadarSearchProfile(
  profileId: string,
  input: Partial<CreateRadarSearchProfileInput> & { isActive?: boolean }
): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  // 娣囶喗鏁?scheduleRule 闂団偓鐟曚礁鍠呯粵鏍偓鍛綀闂?
  if (input.scheduleRule !== undefined) {
    const roleCheck = requireDecider(session);
    if (!roleCheck.authorized) {
      throw new Error(roleCheck.error);
    }
  }
  
  const existing = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!existing || existing.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  const data: Record<string, unknown> = {};
  
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.segmentId !== undefined) data.segmentId = input.segmentId;
  if (input.personaId !== undefined) data.personaId = input.personaId;
  if (input.keywords !== undefined) data.keywords = input.keywords as Prisma.InputJsonValue;
  if (input.negativeKeywords !== undefined) data.negativeKeywords = input.negativeKeywords as Prisma.InputJsonValue;
  if (input.targetCountries !== undefined) data.targetCountries = input.targetCountries;
  if (input.targetRegions !== undefined) data.targetRegions = input.targetRegions;
  if (input.industryCodes !== undefined) data.industryCodes = input.industryCodes;
  if (input.categoryFilters !== undefined) data.categoryFilters = input.categoryFilters;
  if (input.enabledChannels !== undefined) data.enabledChannels = input.enabledChannels as never[];
  if (input.sourceIds !== undefined) data.sourceIds = input.sourceIds;
  if (input.maxRunSeconds !== undefined) data.maxRunSeconds = input.maxRunSeconds;
  if (input.autoQualify !== undefined) data.autoQualify = input.autoQualify;
  if (input.autoEnrich !== undefined) data.autoEnrich = input.autoEnrich;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  
  // 婵″倹鐏夋穱顔芥暭娴?scheduleRule閿涘矂鍣搁弬鎷岊吀缁?nextRunAt
  if (input.scheduleRule !== undefined) {
    data.scheduleRule = input.scheduleRule;
    try {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(input.scheduleRule);
      data.nextRunAt = interval.next().toDate();
    } catch (error) {
      console.warn('[updateRadarSearchProfile] Invalid cron expression, using default:', error);
      data.nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }
  
  await prisma.radarSearchProfile.update({
    where: { id: profileId },
    data,
  });
}

/**
 * 閸掑洦宕查幍顐ｅ伎鐠佲€冲灊閸氼垳鏁ら悩鑸碘偓?
 */
export async function toggleRadarSearchProfileActive(profileId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const existing = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!existing || existing.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  const newActive = !existing.isActive;
  
  // 婵″倹鐏夐柌宥嗘煀閸氼垳鏁ら敍宀冾吀缁犳鏌婇惃?nextRunAt
  let nextRunAt = existing.nextRunAt;
  if (newActive && !existing.nextRunAt) {
    try {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(existing.scheduleRule);
      nextRunAt = interval.next().toDate();
    } catch (error) {
      console.warn('[toggleRadarProfile] Invalid cron expression, using default:', error);
      nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }
  
  await prisma.radarSearchProfile.update({
    where: { id: profileId },
    data: { 
      isActive: newActive,
      nextRunAt: newActive ? nextRunAt : null,
      // 濞撳懘娅庨柨浣哄Ц閹?
      lockToken: null,
      lockedAt: null,
      lockedBy: null,
    },
  });
  
  return newActive;
}

/**
 * 閸掔娀娅庨幍顐ｅ伎鐠佲€冲灊
 */
export async function deleteRadarSearchProfile(profileId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }
  
  const existing = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!existing || existing.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  // 閸忓牆鍨归梽銈呭彠閼辨梻娈戝〒鍛婄垼
  await prisma.radarScanCursor.deleteMany({
    where: { profileId },
  });
  
  await prisma.radarSearchProfile.delete({
    where: { id: profileId },
  });
}

/**
 * 閼惧嘲褰囬幍顐ｅ伎鐠佲€冲灊閻ㄥ嫭鐖堕弽鍥╁Ц閹?
 */
export async function getRadarSearchProfileCursors(profileId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const profile = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!profile || profile.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  const cursors = await prisma.radarScanCursor.findMany({
    where: { profileId },
    orderBy: { lastScanAt: 'desc' },
  });
  
  // 閼惧嘲褰?source 閸氬秶袨
  const sourceIds = cursors.map(c => c.sourceId);
  const sources = await prisma.radarSource.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, name: true, code: true },
  });
  const sourceMap = new Map(sources.map(s => [s.id, s]));
  
  return cursors.map(c => ({
    ...c,
    cursorState: c.cursorState as Record<string, unknown>,
    source: sourceMap.get(c.sourceId) || null,
  }));
}

/**
 * 閹靛濮╃憴锕€褰傞幍顐ｅ伎
 */
export async function triggerRadarSearchProfileScan(profileId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  
  const profile = await prisma.radarSearchProfile.findUnique({
    where: { id: profileId },
  });
  
  if (!profile || profile.tenantId !== session.user.tenantId) {
    throw new Error('Profile not found');
  }
  
  // 濡偓閺屻儲妲搁崥锕€鍑＄悮顐︽敚鐎?
  if (profile.lockToken && profile.lockedAt) {
    const lockAge = Date.now() - profile.lockedAt.getTime();
    if (lockAge < 5 * 60 * 1000) {
      return { success: false, message: '任务已在运行中，请稍后再试' };
    }
  }
  
  // 鐠佸墽鐤?nextRunAt 娑撹櫣骞囬崷顭掔礉鐠佲晞鐨熸惔锕€娅掔粩瀣祮閹锋儳褰?
  await prisma.radarSearchProfile.update({
    where: { id: profileId },
    data: { 
      nextRunAt: new Date(),
      isActive: true,
    },
  });
  
  return { success: true, message: '扫描任务已加入队列' };
}

// ==================== 濞撳懐鎮?====================

// ==================== 辅助任务 ====================

/**
 * 清理过期的候选人数据
 */
export async function cleanupExpiredV2(): Promise<number> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  return cleanupExpiredCandidates();
}


/**
 * 手动触发线索丰富化
 */
export async function enrichProspectCompanyAction(companyId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Unauthorized');
  const company = await prisma.prospectCompany.findUnique({
    where: { id: companyId, tenantId: session.user.tenantId }
  });
  if (!company) throw new Error('Company not found');
  return await enrichProspectCompany(company.id);
}
