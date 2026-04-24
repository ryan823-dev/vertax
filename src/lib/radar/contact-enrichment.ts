import type { Prisma, RadarCandidate } from '@prisma/client';
import type {
  CRMContactOutput,
  ContactEnrichmentResult,
  ContactSourceType,
  IdentityResolution,
  RecommendedChannel,
} from '@/lib/osint/contact-enrichment';

type JsonRecord = Record<string, unknown>;

export interface PersistedContactPoint {
  value: string;
  confidence: number;
  sources: string[];
  sourceUrls?: string[];
  note?: string;
  isPrimary?: boolean;
  type?: string;
  roleType?: string;
  mxValid?: boolean;
}

export interface PersistedAddressPoint extends PersistedContactPoint {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  hasConflict?: boolean;
}

export interface PersistedContactForm {
  url: string;
  type: string;
  source: string;
  fields?: string[];
  requiresLogin?: boolean;
}

export interface PersistedRecommendedChannel {
  type: RecommendedChannel['type'];
  value: string;
  confidence: number;
  reason: string;
  priority: number;
}

export interface PersistedIdentityResolution extends IdentityResolution {}

export interface CandidateContactEnrichmentSnapshot {
  version: 1;
  updatedAt: string;
  identity: {
    inputName: string;
    legalName?: string;
    displayName?: string;
    domain?: string;
    country?: string;
    state?: string;
    city?: string;
    industry?: string;
    officialUrl?: string;
    linkedinUrl?: string;
    identityConfidence: number;
    duplicateRisk: string;
    duplicateWarnings?: string[];
    resolution: PersistedIdentityResolution;
  };
  phones: PersistedContactPoint[];
  emails: PersistedContactPoint[];
  addresses: PersistedAddressPoint[];
  contactForms: PersistedContactForm[];
  capabilities?: string[];
  recommendedChannels: PersistedRecommendedChannel[];
  recommendedContact?: string;
  recommendedContactChannels: string[];
  primaryPhone?: CRMContactOutput['primary_phone'];
  primaryEmail?: CRMContactOutput['primary_email'];
  leadQualityScore: number;
  completenessScore: number;
  dataSources: string[];
  complianceNote: string;
  informationGaps: string[];
  enrichedAt: string;
  duration: number;
}

export interface RadarCandidateRawData extends JsonRecord {
  intelligence?: unknown;
  signalScores?: unknown;
  contactEnrichment?: CandidateContactEnrichmentSnapshot;
}

export interface CandidateRecommendedContact {
  type: RecommendedChannel['type'] | 'unknown';
  value: string;
  label: string;
  confidence?: number;
}

export interface CandidateOutreachContactProfile {
  email: string | null;
  phone: string | null;
  recommendedContact: CandidateRecommendedContact | null;
  complianceNote: string | null;
  primaryEmail?: CRMContactOutput['primary_email'];
  primaryPhone?: CRMContactOutput['primary_phone'];
  snapshot: CandidateContactEnrichmentSnapshot | null;
}

export type CandidateContactFields = Pick<
  RadarCandidate,
  'rawData' | 'email' | 'phone' | 'address' | 'website' | 'linkedInUrl' | 'industry'
>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getRadarCandidateRawData(rawData: unknown): RadarCandidateRawData {
  return isJsonRecord(rawData) ? { ...rawData } : {};
}

function normalizeIdentityName(value?: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|co|ltd|limited|gmbh|sa|bv|plc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFallbackIdentityResolution(
  identity: CandidateContactEnrichmentSnapshot['identity']
): PersistedIdentityResolution {
  const confidence = typeof identity.identityConfidence === 'number' ? identity.identityConfidence : 0;
  const hasAnchor = Boolean(identity.domain || identity.officialUrl);
  const strongEvidenceCount = hasAnchor ? 1 : 0;
  const blockingIssues =
    identity.duplicateRisk === 'high' || identity.duplicateRisk === 'medium'
      ? [...(identity.duplicateWarnings || [])]
      : [];
  const verdict: PersistedIdentityResolution['verdict'] =
    blockingIssues.length > 0
      ? 'ambiguous'
      : confidence >= 75 && hasAnchor
        ? 'verified'
        : confidence >= 55 && hasAnchor
          ? 'probable'
          : confidence >= 35
            ? 'ambiguous'
            : 'unverified';

  return {
    canonicalName: identity.displayName || identity.legalName || identity.inputName,
    normalizedName: normalizeIdentityName(
      identity.displayName || identity.legalName || identity.inputName
    ),
    officialDomain: identity.domain,
    confidence,
    verdict,
    writebackAllowed:
      blockingIssues.length === 0 && hasAnchor && (verdict === 'verified' || verdict === 'probable'),
    strongEvidenceCount,
    evidence: [],
    blockingIssues,
  };
}

function normalizePersistedIdentityResolution(
  identity: CandidateContactEnrichmentSnapshot['identity']
): PersistedIdentityResolution {
  const resolution = isJsonRecord(identity.resolution)
    ? (identity.resolution as PersistedIdentityResolution)
    : null;

  if (!resolution) {
    return buildFallbackIdentityResolution(identity);
  }

  return {
    canonicalName:
      typeof resolution.canonicalName === 'string' && resolution.canonicalName.trim()
        ? resolution.canonicalName
        : identity.displayName || identity.legalName || identity.inputName,
    normalizedName:
      typeof resolution.normalizedName === 'string' && resolution.normalizedName.trim()
        ? resolution.normalizedName
        : normalizeIdentityName(identity.displayName || identity.legalName || identity.inputName),
    officialDomain:
      typeof resolution.officialDomain === 'string' && resolution.officialDomain.trim()
        ? resolution.officialDomain
        : identity.domain,
    confidence: typeof resolution.confidence === 'number' ? resolution.confidence : identity.identityConfidence,
    verdict:
      resolution.verdict === 'verified' ||
      resolution.verdict === 'probable' ||
      resolution.verdict === 'ambiguous' ||
      resolution.verdict === 'unverified'
        ? resolution.verdict
        : buildFallbackIdentityResolution(identity).verdict,
    writebackAllowed:
      typeof resolution.writebackAllowed === 'boolean'
        ? resolution.writebackAllowed
        : buildFallbackIdentityResolution(identity).writebackAllowed,
    strongEvidenceCount:
      typeof resolution.strongEvidenceCount === 'number'
        ? resolution.strongEvidenceCount
        : buildFallbackIdentityResolution(identity).strongEvidenceCount,
    evidence: Array.isArray(resolution.evidence) ? resolution.evidence.map((item) => ({ ...item })) : [],
    blockingIssues: Array.isArray(resolution.blockingIssues) ? [...resolution.blockingIssues] : [],
  };
}

export function mergeRadarCandidateRawData(
  rawData: unknown,
  patch: Partial<RadarCandidateRawData>
): Prisma.InputJsonValue {
  return {
    ...getRadarCandidateRawData(rawData),
    ...patch,
  } as Prisma.InputJsonValue;
}

function toPersistedContactPoint(
  point: ContactEnrichmentResult['phones'][number] | ContactEnrichmentResult['emails'][number]
): PersistedContactPoint {
  return {
    value: point.value,
    confidence: point.confidence,
    sources: [...point.sources],
    sourceUrls: point.sourceUrls ? [...point.sourceUrls] : undefined,
    note: point.note,
    isPrimary: point.isPrimary,
    type: point.type,
    roleType: 'roleType' in point ? point.roleType : undefined,
    mxValid: 'mxValid' in point ? point.mxValid : undefined,
  };
}

function toPersistedAddressPoint(
  address: ContactEnrichmentResult['addresses'][number]
): PersistedAddressPoint {
  return {
    value: address.value,
    confidence: address.confidence,
    sources: [...address.sources],
    sourceUrls: address.sourceUrls ? [...address.sourceUrls] : undefined,
    note: address.note,
    isPrimary: address.isPrimary,
    type: address.type,
    street: address.street,
    city: address.city,
    state: address.state,
    country: address.country,
    postalCode: address.postalCode,
    hasConflict: address.hasConflict,
  };
}

function toPersistedContactForm(
  form: ContactEnrichmentResult['contactForms'][number]
): PersistedContactForm {
  return {
    url: form.url,
    type: form.type,
    source: form.source,
    fields: form.fields ? [...form.fields] : undefined,
    requiresLogin: form.requiresLogin,
  };
}

function toPersistedRecommendedChannel(
  channel: ContactEnrichmentResult['recommendedChannels'][number]
): PersistedRecommendedChannel {
  return {
    type: channel.type,
    value: channel.value,
    confidence: channel.confidence,
    reason: channel.reason,
    priority: channel.priority,
  };
}

export function buildCandidateContactEnrichmentSnapshot(
  result: ContactEnrichmentResult,
  crmOutput: CRMContactOutput
): CandidateContactEnrichmentSnapshot {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    identity: {
      inputName: result.identity.inputName,
      legalName: result.identity.legalName,
      displayName: result.identity.displayName,
      domain: result.identity.domain,
      country: result.identity.country,
      state: result.identity.state,
      city: result.identity.city,
      industry: result.identity.industry,
      officialUrl: result.identity.officialUrl,
      linkedinUrl: result.identity.linkedinUrl,
      identityConfidence: result.identity.identityConfidence,
      duplicateRisk: result.identity.duplicateRisk,
      duplicateWarnings: result.identity.duplicateWarnings
        ? [...result.identity.duplicateWarnings]
        : undefined,
      resolution: {
        ...result.identity.resolution,
        evidence: result.identity.resolution.evidence.map((item) => ({ ...item })),
        blockingIssues: [...result.identity.resolution.blockingIssues],
      },
    },
    phones: result.phones.map(toPersistedContactPoint),
    emails: result.emails.map(toPersistedContactPoint),
    addresses: result.addresses.map(toPersistedAddressPoint),
    contactForms: result.contactForms.map(toPersistedContactForm),
    capabilities: result.capabilities?.keywords ? [...result.capabilities.keywords] : undefined,
    recommendedChannels: result.recommendedChannels.map(toPersistedRecommendedChannel),
    recommendedContact: crmOutput.recommended_contact,
    recommendedContactChannels: [...crmOutput.recommended_contact_channel],
    primaryPhone: crmOutput.primary_phone
      ? {
          value: crmOutput.primary_phone.value,
          confidence: crmOutput.primary_phone.confidence,
          sources: [...crmOutput.primary_phone.sources],
        }
      : undefined,
    primaryEmail: crmOutput.primary_email
      ? {
          value: crmOutput.primary_email.value,
          confidence: crmOutput.primary_email.confidence,
          sources: [...crmOutput.primary_email.sources],
          note: crmOutput.primary_email.note,
        }
      : undefined,
    leadQualityScore: crmOutput.lead_quality_score,
    completenessScore: result.completenessScore,
    dataSources: [...crmOutput.data_sources],
    complianceNote: crmOutput.compliance_note,
    informationGaps: crmOutput.information_gaps ? [...crmOutput.information_gaps] : [],
    enrichedAt: crmOutput.enriched_at,
    duration: result.duration,
  };
}

export function getCandidateContactEnrichment(
  candidate: Pick<RadarCandidate, 'rawData'> | { rawData?: unknown }
): CandidateContactEnrichmentSnapshot | null {
  const rawData = getRadarCandidateRawData(candidate.rawData);
  const snapshot = rawData.contactEnrichment;

  if (!isJsonRecord(snapshot)) {
    return null;
  }

  const normalized = snapshot as CandidateContactEnrichmentSnapshot;

  return {
    ...normalized,
    identity: {
      ...normalized.identity,
      resolution: normalizePersistedIdentityResolution(normalized.identity),
    },
    phones: Array.isArray(normalized.phones) ? normalized.phones : [],
    emails: Array.isArray(normalized.emails) ? normalized.emails : [],
    addresses: Array.isArray(normalized.addresses) ? normalized.addresses : [],
    contactForms: Array.isArray(normalized.contactForms) ? normalized.contactForms : [],
    recommendedChannels: Array.isArray(normalized.recommendedChannels) ? normalized.recommendedChannels : [],
    recommendedContactChannels: Array.isArray(normalized.recommendedContactChannels)
      ? normalized.recommendedContactChannels
      : [],
    dataSources: Array.isArray(normalized.dataSources) ? normalized.dataSources : [],
    informationGaps: Array.isArray(normalized.informationGaps) ? normalized.informationGaps : [],
  };
}

export function canWriteCandidateIdentity(
  snapshot: CandidateContactEnrichmentSnapshot | null | undefined
): boolean {
  if (!snapshot) {
    return false;
  }

  const resolution = snapshot.identity.resolution;
  return Boolean(
    resolution.writebackAllowed &&
      resolution.blockingIssues.length === 0 &&
      resolution.strongEvidenceCount >= 1 &&
      (resolution.verdict === 'verified' || resolution.verdict === 'probable')
  );
}

export function buildCandidateContactEnrichmentUpdate(
  candidate: CandidateContactFields,
  snapshot: CandidateContactEnrichmentSnapshot
) {
  const allowWriteback = canWriteCandidateIdentity(snapshot);

  return {
    enrichedAt: new Date(snapshot.enrichedAt),
    email: allowWriteback ? (snapshot.primaryEmail?.value ?? candidate.email ?? null) : candidate.email ?? null,
    phone: allowWriteback ? (snapshot.primaryPhone?.value ?? candidate.phone ?? null) : candidate.phone ?? null,
    address: allowWriteback ? (snapshot.addresses[0]?.value ?? candidate.address ?? null) : candidate.address ?? null,
    website: allowWriteback ? (snapshot.identity.officialUrl ?? candidate.website ?? null) : candidate.website ?? null,
    linkedInUrl: allowWriteback
      ? (snapshot.identity.linkedinUrl ?? candidate.linkedInUrl ?? null)
      : candidate.linkedInUrl ?? null,
    industry: allowWriteback
      ? (candidate.industry ?? snapshot.identity.industry ?? null)
      : candidate.industry ?? null,
    rawData: mergeRadarCandidateRawData(candidate.rawData, {
      contactEnrichment: snapshot,
    }),
  };
}

function parseRecommendedContactLabel(
  rawValue?: string
): CandidateRecommendedContact | null {
  if (!rawValue) {
    return null;
  }

  const separatorIndex = rawValue.indexOf(':');
  if (separatorIndex === -1) {
    return {
      type: 'unknown',
      value: rawValue.trim(),
      label: rawValue.trim(),
    };
  }

  const rawType = rawValue.slice(0, separatorIndex).trim().toLowerCase();
  const rawContactValue = rawValue.slice(separatorIndex + 1).trim();
  const allowedTypes = new Set<RecommendedChannel['type']>(['email', 'phone', 'form', 'linkedin']);

  return {
    type: allowedTypes.has(rawType as RecommendedChannel['type'])
      ? (rawType as RecommendedChannel['type'])
      : 'unknown',
    value: rawContactValue,
    label: `${rawType}: ${rawContactValue}`,
  };
}

export function getCandidateOutreachContactProfile(
  candidate: Pick<RadarCandidate, 'rawData' | 'email' | 'phone'> | { rawData?: unknown; email?: string | null; phone?: string | null },
  overrideEmail?: string
): CandidateOutreachContactProfile {
  const snapshot = getCandidateContactEnrichment(candidate);
  return getOutreachContactProfileFromSnapshot(snapshot, candidate, overrideEmail);
}

export function getOutreachContactProfileFromSnapshot(
  snapshot: CandidateContactEnrichmentSnapshot | null,
  base: { email?: string | null; phone?: string | null },
  overrideEmail?: string
): CandidateOutreachContactProfile {
  const topRecommended = snapshot?.recommendedChannels[0];
  const recommendedContact = topRecommended
    ? {
        type: topRecommended.type,
        value: topRecommended.value,
        label: `${topRecommended.type}: ${topRecommended.value}`,
        confidence: topRecommended.confidence,
      }
    : parseRecommendedContactLabel(snapshot?.recommendedContact);

  const recommendedEmail = recommendedContact?.type === 'email' ? recommendedContact.value : null;
  const recommendedPhone = recommendedContact?.type === 'phone' ? recommendedContact.value : null;

  return {
    email: overrideEmail || recommendedEmail || snapshot?.primaryEmail?.value || base.email || null,
    phone: recommendedPhone || snapshot?.primaryPhone?.value || base.phone || null,
    recommendedContact,
    complianceNote: snapshot?.complianceNote || null,
    primaryEmail: snapshot?.primaryEmail,
    primaryPhone: snapshot?.primaryPhone,
    snapshot,
  };
}

export function formatCandidateContactHint(
  profile: CandidateOutreachContactProfile
): string | null {
  const hints = [
    profile.recommendedContact ? `推荐渠道：${profile.recommendedContact.label}` : null,
    profile.complianceNote,
  ].filter((value): value is string => Boolean(value));

  return hints.length > 0 ? hints.join('；') : null;
}

export function formatContactSources(
  sources: string[] | undefined,
  limit = 3
): string {
  if (!sources?.length) {
    return '来源待补充';
  }

  return sources.slice(0, limit).join(' / ');
}

export function isCompliantContactSource(source: string): source is ContactSourceType {
  const allowedSources = new Set<ContactSourceType>([
    'official_contact_page',
    'official_footer',
    'official_about_page',
    'official_homepage',
    'official_service_page',
    'official_quote_page',
    'official_inquiry_page',
    'official_policy_page',
    'official_team_page',
    'official_linkedin',
    'official_facebook',
    'official_youtube',
    'industry_directory',
    'association_member',
    'chamber_member',
    'trade_show_exhibitor',
    'chamber_of_commerce',
    'bbb',
    'partner_page',
    'third_party_database',
    'email_format_inferred',
    'search_result',
    'mx_validated',
  ]);

  return allowedSources.has(source as ContactSourceType);
}
