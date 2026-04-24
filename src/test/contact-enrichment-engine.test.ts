import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CompanyIdentity, EmailContact } from '@/lib/osint/contact-enrichment';
import {
  CompanyIdentityNormalizer,
  ContactEnrichmentEngine,
  WebsiteContactScraper,
} from '@/lib/osint/contact-enrichment/enrichment-engine';

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch;
});

describe('contact enrichment parsing and identity signals', () => {
  it('parses DuckDuckGo result pages via DOM and records linkedin slug evidence', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse(`
          <div class="result">
            <a class="result__a" href="https://www.acme.example">Acme Automation Official Website</a>
            <span class="result__url">www.acme.example</span>
            <div class="result__snippet">Industrial automation systems and turnkey integration.</div>
          </div>
        `)
      )
      .mockResolvedValueOnce(
        htmlResponse(`
          <div class="result">
            <a class="result__a" href="https://www.linkedin.com/company/acme-automation">Acme Automation | LinkedIn</a>
            <div class="result__snippet">Acme Automation company page on LinkedIn.</div>
          </div>
        `)
      )
      .mockResolvedValueOnce(
        htmlResponse(`
          <div class="result">
            <a class="result__a" href="https://www.acme.example/about">Acme Automation | About</a>
          </div>
        `)
      );

    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const normalizer = new CompanyIdentityNormalizer();
    const identity = await normalizer.normalize({
      companyName: 'Acme Automation',
      domain: 'acme.example',
      depth: 'standard',
    });

    expect(identity.domain).toBe('acme.example');
    expect(identity.officialUrl).toBe('https://www.acme.example');
    expect(identity.linkedinUrl).toBe('https://www.linkedin.com/company/acme-automation');
    expect(identity.resolution.linkedinSlug).toBe('acme-automation');
    expect(identity.resolution.evidence.some(item => item.type === 'linkedin_slug_match')).toBe(true);
    expect(identity.resolution.verdict).toBe('verified');
  });

  it('extracts contact points from mailto, tel, address, and form DOM elements', async () => {
    const homepageHtml = `
      <html>
        <body>
          <a href="mailto:info@acme.example?subject=hello">Email us</a>
        </body>
      </html>
    `;
    const contactHtml = `
      <html>
        <body>
          <a href="tel:+1-555-111-2222">+1 555 111 2222</a>
          <address>100 Main St, Austin, TX 78701</address>
          <form id="contact-form" action="/contact">
            <input name="name" />
            <input name="email" />
            <textarea name="message"></textarea>
          </form>
        </body>
      </html>
    `;

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://www.acme.example') {
        return Promise.resolve(htmlResponse(homepageHtml));
      }

      if (url === 'https://www.acme.example/contact') {
        return Promise.resolve(htmlResponse(contactHtml));
      }

      return Promise.resolve(htmlResponse('not found', 404));
    });

    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const scraper = new WebsiteContactScraper();
    const result = await scraper.scrapeWebsite('https://www.acme.example');

    expect(result.emails.map(email => email.value)).toContain('info@acme.example');
    expect(result.phones.some(phone => phone.value.includes('555'))).toBe(true);
    expect(result.addresses.some(address => address.city === 'Austin')).toBe(true);
    expect(result.forms[0]?.fields).toEqual(expect.arrayContaining(['name', 'email', 'message']));
  });

  it('passes conflicting official email domains into identity refinement during deep enrichment', async () => {
    const baseIdentity: CompanyIdentity = {
      inputName: 'Acme Automation',
      displayName: 'Acme Automation',
      domain: 'acme.example',
      officialUrl: 'https://www.acme.example',
      linkedinUrl: 'https://www.linkedin.com/company/acme-automation',
      identityConfidence: 55,
      duplicateRisk: 'low',
      duplicateWarnings: [],
      resolution: {
        canonicalName: 'Acme Automation',
        normalizedName: 'acme automation',
        officialDomain: 'acme.example',
        officialUrl: 'https://www.acme.example',
        linkedinSlug: 'acme-automation',
        confidence: 55,
        verdict: 'probable',
        writebackAllowed: true,
        strongEvidenceCount: 1,
        evidence: [],
        blockingIssues: [],
      },
    };

    const websiteEmails: EmailContact[] = [
      {
        value: 'sales@vendor-support.example',
        confidence: 95,
        sources: ['official_contact_page'],
        type: 'role',
        roleType: 'sales',
        isPrimary: true,
      },
    ];

    const refineMock = vi.fn().mockImplementation((identity: CompanyIdentity, signals: Record<string, unknown>) => {
      expect(signals.emailDomainMatch).toBe(false);
      expect(signals.conflictingEmailDomains).toEqual(['vendor-support.example']);
      expect(signals.linkedinSlugMatch).toBe(true);

      return {
        ...identity,
        identityConfidence: 30,
        resolution: {
          ...identity.resolution,
          confidence: 30,
          verdict: 'ambiguous' as const,
          writebackAllowed: false,
          strongEvidenceCount: 0,
          blockingIssues: ['Conflicting official contact domains: vendor-support.example'],
        },
      };
    });

    const engine = new ContactEnrichmentEngine(
      {
        normalize: vi.fn().mockResolvedValue(baseIdentity),
        refine: refineMock,
      } as any,
      {
        scrapeWebsite: vi.fn().mockResolvedValue({
          phones: [],
          emails: websiteEmails,
          addresses: [],
          forms: [],
          capabilities: null,
        }),
      } as any,
      {
        searchEmails: vi.fn().mockResolvedValue([]),
      } as any,
      {
        searchDirectory: vi.fn().mockResolvedValue({
          phones: [],
          emails: [],
          addresses: [],
          additionalInfo: {},
        }),
      } as any,
      {
        calculateCompletenessScore: vi.fn().mockReturnValue(25),
        calculateLeadQualityScore: vi.fn().mockReturnValue(20),
      } as any,
      {
        generateRecommendedChannels: vi.fn().mockReturnValue([]),
      } as any,
      {
        analyzeGaps: vi.fn().mockReturnValue([]),
      } as any,
      {} as any
    );

    const result = await engine.deepEnrich('Acme Automation', 'acme.example', {
      options: {
        checkDirectories: false,
      },
    });

    expect(refineMock).toHaveBeenCalledTimes(1);
    expect(result.identity.identityConfidence).toBe(30);
    expect(result.identity.resolution.writebackAllowed).toBe(false);
  });
});
