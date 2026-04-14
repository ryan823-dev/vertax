import { Prisma, type ProspectCompany, type RadarCandidate, type RadarSource } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface ImportContext {
  tenantId: string;
  importedBy: string;
  activityUserId?: string;
}

interface CandidateWithSource extends RadarCandidate {
  source: RadarSource;
}

function normalizeDomainForDedup(website: string | null | undefined): string | null {
  if (!website) return null;

  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    let domain = url.hostname.toLowerCase();
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

function inferSeniority(title: string | undefined): string | null {
  if (!title) return null;
  const normalized = title.toLowerCase();
  if (/\b(ceo|cto|cfo|coo|cmo|cio|founder|co-founder|owner|president|chairman)\b/.test(normalized)) {
    return 'C-level';
  }
  if (/\b(vp|vice president)\b/.test(normalized)) return 'VP';
  if (/\bdirector\b/.test(normalized)) return 'Director';
  if (/\bmanager\b/.test(normalized)) return 'Manager';
  return 'Staff';
}

async function extractContactsFromCandidate(
  candidate: CandidateWithSource,
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
    phone?: string;
    linkedIn?: string;
    linkedin?: string;
  }> | undefined;

  if (!decisionMakers?.length) return 0;

  let created = 0;
  for (const dm of decisionMakers) {
    if (!dm.name) continue;

    const exists = await prisma.prospectContact.findFirst({
      where: {
        tenantId,
        companyId,
        deletedAt: null,
        OR: [
          { name: dm.name },
          ...(dm.email ? [{ email: dm.email }] : []),
        ],
      },
      select: { id: true },
    });

    if (exists) continue;

    await prisma.prospectContact.create({
      data: {
        tenantId,
        companyId,
        name: dm.name,
        role: dm.title || null,
        email: dm.email || null,
        phone: dm.phone || null,
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

function buildProspectPatch(candidate: CandidateWithSource) {
  const companyName = candidate.buyerName || candidate.displayName;
  const companyCountry = candidate.buyerCountry || candidate.country;
  const matchReasons =
    extractStringReasons(candidate.aiRelevance) ??
    extractStringReasons(candidate.matchExplain);
  const needsEnrichment = ['A', 'B'].includes(candidate.qualifyTier || '');

  return {
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
    matchReasons: matchReasons ? (matchReasons as Prisma.InputJsonValue) : undefined,
    approachAngle: candidate.aiSummary || null,
    sourceType: candidate.source.channelType.toLowerCase(),
    sourceCandidateId: candidate.id,
    sourceUrl: candidate.sourceUrl,
    status: 'new',
    enrichmentStatus: needsEnrichment ? 'PENDING' : undefined,
  };
}

export async function importCandidateToProspectForTenant(
  candidateId: string,
  context: ImportContext
): Promise<{
  company: ProspectCompany;
  created: boolean;
  queuedForEnrichment: boolean;
}> {
  const candidate = await prisma.radarCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true },
  });

  if (!candidate || candidate.tenantId !== context.tenantId) {
    throw new Error('Candidate not found');
  }

  if (candidate.candidateType !== 'COMPANY') {
    throw new Error('Candidate is not a company');
  }

  if (candidate.status === 'IMPORTED' && candidate.importedToType === 'ProspectCompany' && candidate.importedToId) {
    const existingImported = await prisma.prospectCompany.findUnique({
      where: { id: candidate.importedToId },
    });
    if (existingImported) {
      return {
        company: existingImported,
        created: false,
        queuedForEnrichment: existingImported.enrichmentStatus === 'PENDING',
      };
    }
  }

  const companyName = candidate.buyerName || candidate.displayName;
  const companyCountry = candidate.buyerCountry || candidate.country;
  const domain = normalizeDomainForDedup(candidate.website);

  let existingCompany: ProspectCompany | null = null;
  if (domain) {
    existingCompany = await prisma.prospectCompany.findFirst({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        website: { contains: domain, mode: 'insensitive' },
      },
    });
  }

  if (!existingCompany && companyName) {
    existingCompany = await prisma.prospectCompany.findFirst({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        name: { equals: companyName, mode: 'insensitive' },
        country: companyCountry || null,
      },
    });
  }

  const patch = buildProspectPatch(candidate);

  let company: ProspectCompany;
  let created = false;

  if (existingCompany) {
    company = await prisma.prospectCompany.update({
      where: { id: existingCompany.id },
      data: {
        website: existingCompany.website || patch.website,
        phone: existingCompany.phone || patch.phone,
        email: existingCompany.email || patch.email,
        address: existingCompany.address || patch.address,
        country: existingCompany.country || patch.country,
        city: existingCompany.city || patch.city,
        industry: existingCompany.industry || patch.industry,
        companySize: existingCompany.companySize || patch.companySize,
        description: existingCompany.description || patch.description,
        tier: existingCompany.tier || patch.tier,
        matchReasons: existingCompany.matchReasons || patch.matchReasons,
        approachAngle: existingCompany.approachAngle || patch.approachAngle,
        sourceCandidateId: existingCompany.sourceCandidateId || candidate.id,
        sourceUrl: existingCompany.sourceUrl || patch.sourceUrl,
        enrichmentStatus:
          existingCompany.enrichmentStatus === 'IN_PROGRESS'
            ? existingCompany.enrichmentStatus
            : (existingCompany.enrichmentStatus || patch.enrichmentStatus),
      },
    });
  } else {
    company = await prisma.prospectCompany.create({
      data: {
        tenantId: context.tenantId,
        ...patch,
      },
    });
    created = true;
  }

  try {
    await extractContactsFromCandidate(candidate as CandidateWithSource, company.id, context.tenantId, candidate.id);
  } catch (error) {
    console.error('[importCandidateToProspectForTenant] Contact extraction failed:', error);
  }

  const refreshedCompany = await prisma.prospectCompany.findUnique({
    where: { id: company.id },
    include: { _count: { select: { contacts: { where: { deletedAt: null } } } } },
  });

  const queuedForEnrichment =
    !!refreshedCompany &&
    ['A', 'B'].includes(refreshedCompany.tier || '') &&
    (refreshedCompany._count?.contacts ?? 0) === 0;

  if (queuedForEnrichment) {
    company = await prisma.prospectCompany.update({
      where: { id: company.id },
      data: {
        enrichmentStatus: 'PENDING',
      },
    });
  }

  await prisma.radarCandidate.update({
    where: { id: candidateId },
    data: {
      status: 'IMPORTED',
      importedToType: 'ProspectCompany',
      importedToId: company.id,
      importedAt: new Date(),
      importedBy: context.importedBy,
    },
  });

  if (context.activityUserId) {
    await prisma.activity.create({
      data: {
        tenantId: context.tenantId,
        userId: context.activityUserId,
        action: 'radar_candidate_imported_company',
        entityType: 'ProspectCompany',
        entityId: company.id,
        eventCategory: 'radar',
        context: { candidateId, companyName: company.name } as object,
      },
    });
  }

  return { company, created, queuedForEnrichment };
}
