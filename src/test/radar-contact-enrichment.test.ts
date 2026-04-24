import { describe, expect, it } from "vitest";
import type {
  CRMContactOutput,
  ContactEnrichmentResult,
} from "@/lib/osint/contact-enrichment";
import {
  buildCandidateContactEnrichmentSnapshot,
  buildCandidateContactEnrichmentUpdate,
  getCandidateOutreachContactProfile,
} from "@/lib/radar/contact-enrichment";

function buildFixture() {
  const result: ContactEnrichmentResult = {
    identity: {
      inputName: "Acme Automation",
      displayName: "Acme Automation",
      domain: "acme.example",
      officialUrl: "https://www.acme.example",
      industry: "Industrial Automation",
      identityConfidence: 92,
      duplicateRisk: "low",
      duplicateWarnings: [],
    },
    phones: [
      {
        value: "+1 555 111 2222",
        confidence: 90,
        sources: ["official_contact_page"],
        type: "main",
        isPrimary: true,
      },
    ],
    emails: [
      {
        value: "sales@acme.example",
        confidence: 95,
        sources: ["official_contact_page"],
        type: "role",
        roleType: "sales",
        isPrimary: true,
      },
    ],
    addresses: [
      {
        value: "100 Main St, Austin, TX 78701",
        confidence: 85,
        sources: ["official_contact_page"],
        type: "headquarters",
      },
    ],
    contactForms: [
      {
        url: "https://www.acme.example/contact",
        type: "contact",
        source: "official_contact_page",
      },
    ],
    capabilities: {
      keywords: ["robotics", "coating"],
      sources: ["official_contact_page"],
    },
    recommendedChannels: [
      {
        type: "email",
        value: "sales@acme.example",
        confidence: 95,
        reason: "Public sales inbox on the contact page",
        priority: 1,
      },
    ],
    leadQualityScore: 84,
    completenessScore: 88,
    informationGaps: [
      {
        type: "decision_maker",
        description: "Need a named decision maker",
        importance: "medium",
      },
    ],
    sourcesSummary: ["official_contact_page"],
    duration: 1200,
    enrichedAt: new Date("2026-04-24T10:00:00.000Z"),
  };

  const crmOutput: CRMContactOutput = {
    company: "Acme Automation",
    company_name: "Acme Automation",
    domain: "acme.example",
    official_website: "https://www.acme.example",
    primary_phone: {
      value: "+1 555 111 2222",
      confidence: 90,
      sources: ["official_contact_page"],
    },
    primary_email: {
      value: "sales@acme.example",
      confidence: 95,
      sources: ["official_contact_page"],
    },
    addresses: [
      {
        value: "100 Main St, Austin, TX 78701",
        confidence: 85,
        source: "official_contact_page",
      },
    ],
    industry: "Industrial Automation",
    capabilities: ["robotics", "coating"],
    recommended_contact: "email: sales@acme.example",
    recommended_contact_channel: ["email: sales@acme.example"],
    lead_quality_score: 84,
    data_sources: ["official_contact_page"],
    compliance_note: "Only public business contact points were used.",
    information_gaps: ["Need a named decision maker"],
    enriched_at: "2026-04-24T10:00:00.000Z",
  };

  return { result, crmOutput };
}

describe("radar contact enrichment helpers", () => {
  it("builds a persisted snapshot with preferred contact fields", () => {
    const { result, crmOutput } = buildFixture();

    const snapshot = buildCandidateContactEnrichmentSnapshot(result, crmOutput);

    expect(snapshot.primaryEmail?.value).toBe("sales@acme.example");
    expect(snapshot.recommendedContact).toBe("email: sales@acme.example");
    expect(snapshot.recommendedChannels[0]?.type).toBe("email");
    expect(snapshot.capabilities).toEqual(["robotics", "coating"]);
  });

  it("prefers persisted contact enrichment for outreach", () => {
    const { result, crmOutput } = buildFixture();
    const snapshot = buildCandidateContactEnrichmentSnapshot(result, crmOutput);

    const profile = getCandidateOutreachContactProfile({
      email: "legacy@acme.example",
      phone: null,
      rawData: {
        contactEnrichment: snapshot,
      },
    });

    expect(profile.email).toBe("sales@acme.example");
    expect(profile.recommendedContact?.label).toBe("email: sales@acme.example");
    expect(profile.complianceNote).toContain("public business");
  });

  it("merges the snapshot into candidate writeback data", () => {
    const { result, crmOutput } = buildFixture();
    const snapshot = buildCandidateContactEnrichmentSnapshot(result, crmOutput);

    const update = buildCandidateContactEnrichmentUpdate(
      {
        email: null,
        phone: null,
        address: null,
        website: null,
        linkedInUrl: null,
        industry: null,
        rawData: {
          intelligence: {
            contacts: {
              decisionMakers: [{ name: "Pat" }],
            },
          },
        },
      },
      snapshot
    );

    expect(update.email).toBe("sales@acme.example");
    expect(update.website).toBe("https://www.acme.example");
    expect((update.rawData as Record<string, unknown>).contactEnrichment).toBeTruthy();
    expect((update.rawData as Record<string, unknown>).intelligence).toBeTruthy();
  });
});
