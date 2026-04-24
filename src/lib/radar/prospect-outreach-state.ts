import type { Prisma, ProspectContact } from '@prisma/client';
import {
  getOutreachContactProfileFromSnapshot,
  type CandidateContactEnrichmentSnapshot,
  type CandidateOutreachContactProfile,
} from './contact-enrichment';

type JsonRecord = Record<string, unknown>;

export interface ProspectOutreachVersion extends JsonRecord {
  timestamp?: string;
  version?: number;
}

export interface ProspectOutreachState {
  versions: ProspectOutreachVersion[];
  contactSnapshot: CandidateContactEnrichmentSnapshot | null;
  updatedAt?: string;
}

export interface ProspectOutreachContact {
  id: string;
  name: string;
  role: string | null;
  seniority: string | null;
  email: string | null;
  phone: string | null;
  linkedInUrl: string | null;
  source: 'prospect_contact' | 'radar_snapshot';
  isPersisted: boolean;
  note: string | null;
}

type ProspectContactLike = Pick<
  ProspectContact,
  'id' | 'name' | 'role' | 'seniority' | 'email' | 'phone' | 'linkedInUrl'
>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeVersionEntry(value: unknown): ProspectOutreachVersion | null {
  return isJsonRecord(value) ? (value as ProspectOutreachVersion) : null;
}

function normalizeSnapshot(value: unknown): CandidateContactEnrichmentSnapshot | null {
  if (!isJsonRecord(value)) {
    return null;
  }

  const normalized = value as unknown as CandidateContactEnrichmentSnapshot;

  return {
    ...normalized,
    phones: Array.isArray(normalized.phones) ? normalized.phones : [],
    emails: Array.isArray(normalized.emails) ? normalized.emails : [],
    addresses: Array.isArray(normalized.addresses) ? normalized.addresses : [],
    contactForms: Array.isArray(normalized.contactForms) ? normalized.contactForms : [],
    recommendedChannels: Array.isArray(normalized.recommendedChannels)
      ? normalized.recommendedChannels
      : [],
    recommendedContactChannels: Array.isArray(normalized.recommendedContactChannels)
      ? normalized.recommendedContactChannels
      : [],
    dataSources: Array.isArray(normalized.dataSources) ? normalized.dataSources : [],
    informationGaps: Array.isArray(normalized.informationGaps) ? normalized.informationGaps : [],
  };
}

function isContainerShape(value: JsonRecord) {
  return 'versions' in value || 'contactSnapshot' in value || 'updatedAt' in value;
}

function normalizeEmail(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\d+]/g, '');
  return normalized || null;
}

function normalizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${pathname}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

function hasUniqueContactValue(
  contacts: ProspectOutreachContact[],
  key: 'email' | 'phone' | 'linkedInUrl',
  value: string | null
) {
  if (!value) {
    return false;
  }

  return !contacts.some((contact) => {
    if (key === 'email') {
      return normalizeEmail(contact.email) === normalizeEmail(value);
    }

    if (key === 'phone') {
      return normalizePhone(contact.phone) === normalizePhone(value);
    }

    return normalizeUrl(contact.linkedInUrl) === normalizeUrl(value);
  });
}

function toProspectOutreachContact(contact: ProspectContactLike): ProspectOutreachContact {
  return {
    id: contact.id,
    name: contact.name,
    role: contact.role,
    seniority: contact.seniority,
    email: contact.email,
    phone: contact.phone,
    linkedInUrl: contact.linkedInUrl,
    source: 'prospect_contact',
    isPersisted: true,
    note: null,
  };
}

export function getProspectOutreachState(rawValue: unknown): ProspectOutreachState {
  if (Array.isArray(rawValue)) {
    return {
      versions: rawValue
        .map(normalizeVersionEntry)
        .filter((entry): entry is ProspectOutreachVersion => entry !== null),
      contactSnapshot: null,
    };
  }

  if (!isJsonRecord(rawValue)) {
    return { versions: [], contactSnapshot: null };
  }

  if (isContainerShape(rawValue)) {
    const versions = Array.isArray(rawValue.versions)
      ? rawValue.versions
          .map(normalizeVersionEntry)
          .filter((entry): entry is ProspectOutreachVersion => entry !== null)
      : [];

    return {
      versions,
      contactSnapshot: normalizeSnapshot(rawValue.contactSnapshot),
      updatedAt: typeof rawValue.updatedAt === 'string' ? rawValue.updatedAt : undefined,
    };
  }

  const singleVersion = normalizeVersionEntry(rawValue);
  return {
    versions: singleVersion ? [singleVersion] : [],
    contactSnapshot: null,
  };
}

export function getProspectOutreachVersions(rawValue: unknown): ProspectOutreachVersion[] {
  return getProspectOutreachState(rawValue).versions;
}

export function getLatestProspectOutreachVersion(
  rawValue: unknown
): ProspectOutreachVersion | null {
  return getProspectOutreachVersions(rawValue)[0] ?? null;
}

export function buildProspectOutreachStateValue(
  rawValue: unknown,
  options: {
    appendVersion?: ProspectOutreachVersion | null;
    contactSnapshot?: CandidateContactEnrichmentSnapshot | null;
  }
): Prisma.InputJsonValue {
  const current = getProspectOutreachState(rawValue);
  const nextVersions = [...current.versions];

  if (options.appendVersion) {
    const nextEntry: ProspectOutreachVersion = {
      ...options.appendVersion,
      timestamp: new Date().toISOString(),
      version: nextVersions.length + 1,
    };
    nextVersions.unshift(nextEntry);
  }

  return {
    versions: nextVersions.slice(0, 10),
    contactSnapshot:
      options.contactSnapshot === undefined ? current.contactSnapshot : options.contactSnapshot,
    updatedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;
}

export function getProspectCompanyContactSnapshot(company: {
  outreachArtifacts?: unknown;
}): CandidateContactEnrichmentSnapshot | null {
  return getProspectOutreachState(company.outreachArtifacts).contactSnapshot;
}

export function getProspectCompanyOutreachContactProfile(
  company: { outreachArtifacts?: unknown; email?: string | null; phone?: string | null },
  overrideEmail?: string
): CandidateOutreachContactProfile {
  const snapshot = getProspectCompanyContactSnapshot(company);
  return getOutreachContactProfileFromSnapshot(
    snapshot,
    { email: company.email ?? null, phone: company.phone ?? null },
    overrideEmail
  );
}

export function getProspectSnapshotContact(company: {
  id?: string;
  name?: string | null;
  outreachArtifacts?: unknown;
}): ProspectOutreachContact | null {
  const snapshot = getProspectCompanyContactSnapshot(company);
  if (!snapshot) {
    return null;
  }

  const profile = getOutreachContactProfileFromSnapshot(snapshot, {});
  const linkedInUrl =
    snapshot.identity.linkedinUrl ??
    (profile.recommendedContact?.type === 'linkedin' ? profile.recommendedContact.value : null);

  if (!profile.email && !profile.phone && !linkedInUrl) {
    return null;
  }

  return {
    id: `snapshot:${company.id ?? snapshot.identity.domain ?? 'prospect'}`,
    name:
      snapshot.identity.displayName?.trim() ||
      snapshot.identity.legalName?.trim() ||
      snapshot.identity.inputName?.trim() ||
      company.name?.trim() ||
      'Public business contact',
    role: 'Public business contact',
    seniority: null,
    email: profile.email,
    phone: profile.phone,
    linkedInUrl,
    source: 'radar_snapshot',
    isPersisted: false,
    note: snapshot.complianceNote || null,
  };
}

export function mergeProspectContactsWithSnapshot(
  company: {
    id?: string;
    name?: string | null;
    outreachArtifacts?: unknown;
  },
  contacts: ProspectContactLike[]
): ProspectOutreachContact[] {
  const mergedContacts = contacts.map(toProspectOutreachContact);
  const snapshotContact = getProspectSnapshotContact(company);

  if (!snapshotContact) {
    return mergedContacts;
  }

  const nextSnapshotContact: ProspectOutreachContact = {
    ...snapshotContact,
    email: hasUniqueContactValue(mergedContacts, 'email', snapshotContact.email)
      ? snapshotContact.email
      : null,
    phone: hasUniqueContactValue(mergedContacts, 'phone', snapshotContact.phone)
      ? snapshotContact.phone
      : null,
    linkedInUrl: hasUniqueContactValue(mergedContacts, 'linkedInUrl', snapshotContact.linkedInUrl)
      ? snapshotContact.linkedInUrl
      : null,
  };

  if (!nextSnapshotContact.email && !nextSnapshotContact.phone && !nextSnapshotContact.linkedInUrl) {
    return mergedContacts;
  }

  return [...mergedContacts, nextSnapshotContact];
}
