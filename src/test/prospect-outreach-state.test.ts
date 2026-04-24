import { describe, expect, it } from 'vitest';
import type { CandidateContactEnrichmentSnapshot } from '@/lib/radar/contact-enrichment';
import {
  buildProspectOutreachStateValue,
  getProspectOutreachState,
  mergeProspectContactsWithSnapshot,
} from '@/lib/radar/prospect-outreach-state';

function buildSnapshot(): CandidateContactEnrichmentSnapshot {
  return {
    version: 1,
    updatedAt: '2026-04-24T10:00:00.000Z',
    identity: {
      inputName: 'Acme Automation',
      displayName: 'Acme Automation',
      domain: 'acme.example',
      officialUrl: 'https://www.acme.example',
      linkedinUrl: 'https://www.linkedin.com/company/acme-automation',
      industry: 'Industrial Automation',
      identityConfidence: 92,
      duplicateRisk: 'low',
      duplicateWarnings: [],
      resolution: {
        canonicalName: 'Acme Automation',
        normalizedName: 'acme automation',
        officialDomain: 'acme.example',
        confidence: 92,
        verdict: 'verified',
        writebackAllowed: true,
        strongEvidenceCount: 2,
        evidence: [
          {
            type: 'input_domain',
            strength: 'strong',
            source: 'input',
            value: 'acme.example',
            scoreDelta: 45,
          },
        ],
        blockingIssues: [],
      },
    },
    phones: [
      {
        value: '+1 555 111 2222',
        confidence: 90,
        sources: ['official_contact_page'],
        type: 'main',
        isPrimary: true,
      },
    ],
    emails: [
      {
        value: 'sales@acme.example',
        confidence: 95,
        sources: ['official_contact_page'],
        type: 'role',
        roleType: 'sales',
        isPrimary: true,
        mxValid: true,
      },
    ],
    addresses: [],
    contactForms: [],
    capabilities: ['robotics', 'coating'],
    recommendedChannels: [
      {
        type: 'email',
        value: 'sales@acme.example',
        confidence: 95,
        reason: 'Public sales inbox on the contact page',
        priority: 1,
      },
    ],
    recommendedContact: 'email: sales@acme.example',
    recommendedContactChannels: ['email: sales@acme.example'],
    primaryPhone: {
      value: '+1 555 111 2222',
      confidence: 90,
      sources: ['official_contact_page'],
    },
    primaryEmail: {
      value: 'sales@acme.example',
      confidence: 95,
      sources: ['official_contact_page'],
      note: 'Public sales inbox',
    },
    leadQualityScore: 84,
    completenessScore: 88,
    dataSources: ['official_contact_page'],
    complianceNote: 'Only public business contact points were used.',
    informationGaps: ['Need a named decision maker'],
    enrichedAt: '2026-04-24T10:00:00.000Z',
    duration: 1200,
  };
}

describe('prospect outreach state helpers', () => {
  it('preserves the snapshot when appending outreach pack versions', () => {
    const snapshot = buildSnapshot();
    const withSnapshot = buildProspectOutreachStateValue(null, {
      contactSnapshot: snapshot,
    });

    const withVersion = buildProspectOutreachStateValue(withSnapshot, {
      appendVersion: {
        outreachPack: {
          forPersona: 'Operations',
          forTier: 'A',
          openings: [],
          emails: [{ subject: 'Intro', body: 'Hello', evidenceIds: [] }],
          whatsapps: [],
          playbook: [],
          evidenceMap: [],
          warnings: [],
        },
      },
    });

    const state = getProspectOutreachState(withVersion);

    expect(state.contactSnapshot?.primaryEmail?.value).toBe('sales@acme.example');
    expect(state.versions).toHaveLength(1);
    expect(state.versions[0]?.version).toBe(1);
  });

  it('creates a snapshot-backed outreach contact when no persisted contacts exist', () => {
    const snapshot = buildSnapshot();
    const outreachArtifacts = buildProspectOutreachStateValue(null, {
      contactSnapshot: snapshot,
    });

    const contacts = mergeProspectContactsWithSnapshot(
      {
        id: 'prospect_1',
        name: 'Acme Automation',
        outreachArtifacts,
      },
      []
    );

    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({
      source: 'radar_snapshot',
      isPersisted: false,
      email: 'sales@acme.example',
      phone: '+1 555 111 2222',
      linkedInUrl: 'https://www.linkedin.com/company/acme-automation',
    });
  });

  it('dedupes identical snapshot channels while keeping unique fallback channels', () => {
    const snapshot = buildSnapshot();
    const outreachArtifacts = buildProspectOutreachStateValue(null, {
      contactSnapshot: snapshot,
    });

    const contacts = mergeProspectContactsWithSnapshot(
      {
        id: 'prospect_1',
        name: 'Acme Automation',
        outreachArtifacts,
      },
      [
        {
          id: 'contact_1',
          name: 'Pat',
          role: 'Sales Manager',
          seniority: 'Manager',
          email: 'sales@acme.example',
          phone: null,
          linkedInUrl: null,
        },
      ]
    );

    expect(contacts).toHaveLength(2);

    const snapshotContact = contacts.find((contact) => contact.source === 'radar_snapshot');

    expect(snapshotContact?.email).toBeNull();
    expect(snapshotContact?.phone).toBe('+1 555 111 2222');
    expect(snapshotContact?.linkedInUrl).toBe('https://www.linkedin.com/company/acme-automation');
  });
});
