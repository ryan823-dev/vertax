import { afterEach, describe, expect, it, vi } from 'vitest';

const { resolveMxMock } = vi.hoisted(() => ({
  resolveMxMock: vi.fn(),
}));

vi.mock('node:dns/promises', () => ({
  resolveMx: resolveMxMock,
}));

import type { CompanyIdentity, EmailContact } from '@/lib/osint/contact-enrichment';
import {
  CompanyIdentityNormalizer,
  ContactEnrichmentEngine,
  WebsiteContactScraper,
  EmailSearcher,
} from '@/lib/osint/contact-enrichment/enrichment-engine';
import {
  ComplianceChecker,
  RecommendedChannelGenerator,
} from '@/lib/osint/contact-enrichment/scoring';

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
  resolveMxMock.mockReset();
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

  it('can skip contact forms when checkForms is disabled', async () => {
    const homepageHtml = `
      <html>
        <body>
          <form id="contact-form" action="/contact">
            <input name="name" />
            <input name="email" />
          </form>
        </body>
      </html>
    `;

    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(homepageHtml));
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const scraper = new WebsiteContactScraper();
    const result = await scraper.scrapeWebsite('https://www.acme.example', {
      checkForms: false,
    });

    expect(result.forms).toEqual([]);
  });

  it('skips LinkedIn company search when social media checks are disabled', async () => {
    const normalizer = new CompanyIdentityNormalizer();
    const searchOfficialDomainSpy = vi
      .spyOn(normalizer as any, 'searchOfficialDomain')
      .mockResolvedValue('acme.example');
    const searchLinkedInCompanySpy = vi
      .spyOn(normalizer as any, 'searchLinkedInCompany')
      .mockResolvedValue({
        url: 'https://www.linkedin.com/company/acme-automation',
        legalName: 'Acme Automation LLC',
      });
    vi.spyOn(normalizer as any, 'checkDuplicateRisk').mockResolvedValue([]);

    const identity = await normalizer.normalize({
      companyName: 'Acme Automation',
      depth: 'standard',
      options: {
        checkSocialMedia: false,
      },
    });

    expect(searchOfficialDomainSpy).toHaveBeenCalledWith('Acme Automation');
    expect(searchLinkedInCompanySpy).not.toHaveBeenCalled();
    expect(identity.linkedinUrl).toBeUndefined();
  });

  it('filters search-result emails to the locked domain family and adds MX validation signals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      htmlResponse(`
        <div>
          sales@acme.example
          hello@gmail.com
          partner@otherco.example
        </div>
      `)
    );

    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;
    resolveMxMock.mockResolvedValue([{ exchange: 'mx.acme.example', priority: 10 }]);

    const searcher = new EmailSearcher();
    const emails = await searcher.searchEmails('Acme Automation', 'acme.example', {
      maxResults: 1,
      validateMX: true,
    });

    expect(emails).toHaveLength(1);
    expect(emails[0]?.value).toBe('sales@acme.example');
    expect(emails[0]?.mxValid).toBe(true);
    expect(emails[0]?.sources).toContain('mx_validated');
    expect(resolveMxMock).toHaveBeenCalledWith('acme.example');
  });

  it('recommends MX-validated inferred role emails as a fallback without making them non-compliant', () => {
    const generator = new RecommendedChannelGenerator();
    const checker = new ComplianceChecker();
    const email: EmailContact = {
      value: 'sales@acme.example',
      confidence: 55,
      sources: ['email_format_inferred', 'mx_validated'],
      type: 'role',
      roleType: 'sales',
      mxValid: true,
      isPrimary: false,
    };

    const channels = generator.generateRecommendedChannels([], [email], []);
    const compliance = checker.checkAllSourcesCompliance(email.sources);

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      type: 'email',
      value: 'sales@acme.example',
      confidence: 55,
    });
    expect(channels[0]?.reason).toContain('MX');
    expect(compliance.nonCompliant).toEqual([]);
    expect(compliance.borderline).toContain('email_format_inferred');
    expect(compliance.compliant).toContain('mx_validated');
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

  it('passes country hints into directory enrichment and matches ISO countries against formatted addresses', async () => {
    const baseIdentity: CompanyIdentity = {
      inputName: 'Acme Automation',
      displayName: 'Acme Automation',
      domain: 'acme.example',
      officialUrl: 'https://www.acme.example',
      country: 'DE',
      city: 'Berlin',
      identityConfidence: 80,
      duplicateRisk: 'low',
      duplicateWarnings: [],
      resolution: {
        canonicalName: 'Acme Automation',
        normalizedName: 'acme automation',
        officialDomain: 'acme.example',
        confidence: 80,
        verdict: 'verified',
        writebackAllowed: true,
        strongEvidenceCount: 2,
        evidence: [],
        blockingIssues: [],
      },
    };

    const refineMock = vi.fn().mockImplementation((identity: CompanyIdentity, signals: Record<string, unknown>) => {
      expect(signals.locationMatch).toBe(true);
      return identity;
    });
    const directorySearcher = {
      searchDirectory: vi.fn().mockResolvedValue({
        phones: [],
        emails: [],
        addresses: [
          {
            value: 'Berlin, Germany',
            confidence: 70,
            sources: ['industry_directory'],
            type: 'headquarters',
            city: 'Berlin',
            country: 'Germany',
            isPrimary: false,
          },
        ],
        additionalInfo: {},
      }),
    };

    const engine = new ContactEnrichmentEngine(
      {
        normalize: vi.fn().mockResolvedValue(baseIdentity),
        refine: refineMock,
      } as any,
      {
        scrapeWebsite: vi.fn().mockResolvedValue({
          phones: [],
          emails: [],
          addresses: [],
          forms: [],
          capabilities: null,
        }),
      } as any,
      {
        searchEmails: vi.fn().mockResolvedValue([]),
      } as any,
      directorySearcher as any,
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

    await engine.deepEnrich('Acme Automation', 'acme.example', {
      country: 'DE',
      city: 'Berlin',
    });

    expect(directorySearcher.searchDirectory).toHaveBeenCalledWith(
      'Acme Automation',
      undefined,
      'DE'
    );
    expect(refineMock).toHaveBeenCalledTimes(1);
  });

  it('adds inferred role-mailbox fallback emails when enabled', async () => {
    const baseIdentity: CompanyIdentity = {
      inputName: 'Acme Automation',
      displayName: 'Acme Automation',
      domain: 'acme.example',
      officialUrl: 'https://www.acme.example',
      identityConfidence: 80,
      duplicateRisk: 'low',
      duplicateWarnings: [],
      resolution: {
        canonicalName: 'Acme Automation',
        normalizedName: 'acme automation',
        officialDomain: 'acme.example',
        confidence: 80,
        verdict: 'verified',
        writebackAllowed: true,
        strongEvidenceCount: 2,
        evidence: [],
        blockingIssues: [],
      },
    };

    const emailSearcher = new EmailSearcher();
    const searchSpy = vi.spyOn(emailSearcher, 'searchEmails').mockResolvedValue([]);
    const inferSpy = vi.spyOn(emailSearcher, 'inferRoleBasedEmails').mockResolvedValue([
      {
        value: 'sales@acme.example',
        confidence: 55,
        sources: ['email_format_inferred', 'mx_validated'],
        type: 'role',
        roleType: 'sales',
        mxValid: true,
        isPrimary: false,
        note: 'Inferred from the official domain',
      },
    ]);

    const engine = new ContactEnrichmentEngine(
      {
        normalize: vi.fn().mockResolvedValue(baseIdentity),
        refine: vi.fn().mockImplementation((identity: CompanyIdentity) => identity),
      } as any,
      {
        scrapeWebsite: vi.fn().mockResolvedValue({
          phones: [],
          emails: [],
          addresses: [],
          forms: [{ url: 'https://www.acme.example/contact', type: 'quote', source: 'official_contact_page' }],
          capabilities: null,
        }),
      } as any,
      emailSearcher as any,
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
        calculateLeadQualityScore: vi.fn().mockReturnValue(30),
      } as any,
      {
        generateRecommendedChannels: vi.fn().mockImplementation((_phones: unknown, emails: EmailContact[]) =>
          emails.map((email, index) => ({
            type: 'email',
            value: email.value,
            confidence: email.confidence,
            reason: email.note || 'fallback',
            priority: index + 1,
          }))
        ),
      } as any,
      {
        analyzeGaps: vi.fn().mockReturnValue([]),
      } as any,
      {} as any
    );

    const result = await engine.deepEnrich('Acme Automation', 'acme.example', {
      options: {
        inferEmailFormat: true,
        validateMX: true,
        maxResults: 3,
        language: 'zh-CN',
      },
    });

    expect(searchSpy).toHaveBeenCalledWith(
      'Acme Automation',
      'acme.example',
      expect.objectContaining({
        maxResults: 3,
        validateMX: true,
        language: 'zh-CN',
      })
    );
    expect(inferSpy).toHaveBeenCalledWith(
      'acme.example',
      [],
      expect.objectContaining({
        validateMX: true,
        formTypes: ['quote'],
      })
    );
    expect(result.emails[0]?.value).toBe('sales@acme.example');
    expect(result.emails[0]?.sources).toEqual(expect.arrayContaining(['email_format_inferred', 'mx_validated']));
  });

  it('retains MX validation when the same email is merged from multiple sources', async () => {
    const baseIdentity: CompanyIdentity = {
      inputName: 'Acme Automation',
      displayName: 'Acme Automation',
      domain: 'acme.example',
      officialUrl: 'https://www.acme.example',
      identityConfidence: 80,
      duplicateRisk: 'low',
      duplicateWarnings: [],
      resolution: {
        canonicalName: 'Acme Automation',
        normalizedName: 'acme automation',
        officialDomain: 'acme.example',
        confidence: 80,
        verdict: 'verified',
        writebackAllowed: true,
        strongEvidenceCount: 2,
        evidence: [],
        blockingIssues: [],
      },
    };

    const engine = new ContactEnrichmentEngine(
      {
        normalize: vi.fn().mockResolvedValue(baseIdentity),
        refine: vi.fn().mockImplementation((identity: CompanyIdentity) => identity),
      } as any,
      {
        scrapeWebsite: vi.fn().mockResolvedValue({
          phones: [],
          emails: [
            {
              value: 'sales@acme.example',
              confidence: 95,
              sources: ['official_contact_page'],
              type: 'role',
              roleType: 'sales',
              isPrimary: true,
            },
          ],
          addresses: [],
          forms: [],
          capabilities: null,
        }),
      } as any,
      {
        searchEmails: vi.fn().mockResolvedValue([
          {
            value: 'sales@acme.example',
            confidence: 60,
            sources: ['search_result', 'mx_validated'],
            type: 'role',
            roleType: 'sales',
            mxValid: true,
            isPrimary: false,
          },
        ]),
        inferRoleBasedEmails: vi.fn().mockResolvedValue([]),
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
        calculateLeadQualityScore: vi.fn().mockReturnValue(30),
      } as any,
      {
        generateRecommendedChannels: vi.fn().mockReturnValue([]),
      } as any,
      {
        analyzeGaps: vi.fn().mockReturnValue([]),
      } as any,
      {} as any
    );

    const result = await engine.deepEnrich('Acme Automation', 'acme.example');

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]).toMatchObject({
      value: 'sales@acme.example',
      mxValid: true,
      roleType: 'sales',
    });
    expect(result.emails[0]?.sources).toEqual(
      expect.arrayContaining(['official_contact_page', 'search_result', 'mx_validated'])
    );
  });

  it('skips MX fallback and inferred role mailboxes when official email evidence is already strong', async () => {
    const baseIdentity: CompanyIdentity = {
      inputName: 'Acme Automation',
      displayName: 'Acme Automation',
      domain: 'acme.example',
      officialUrl: 'https://www.acme.example',
      identityConfidence: 90,
      duplicateRisk: 'low',
      duplicateWarnings: [],
      resolution: {
        canonicalName: 'Acme Automation',
        normalizedName: 'acme automation',
        officialDomain: 'acme.example',
        confidence: 90,
        verdict: 'verified',
        writebackAllowed: true,
        strongEvidenceCount: 2,
        evidence: [],
        blockingIssues: [],
      },
    };

    const emailSearcher = new EmailSearcher();
    const searchSpy = vi.spyOn(emailSearcher, 'searchEmails').mockResolvedValue([
      {
        value: 'sales@acme.example',
        confidence: 60,
        sources: ['search_result'],
        type: 'role',
        roleType: 'sales',
        isPrimary: false,
      },
    ]);
    const inferSpy = vi.spyOn(emailSearcher, 'inferRoleBasedEmails').mockResolvedValue([]);

    const engine = new ContactEnrichmentEngine(
      {
        normalize: vi.fn().mockResolvedValue(baseIdentity),
        refine: vi.fn().mockImplementation((identity: CompanyIdentity) => identity),
      } as any,
      {
        scrapeWebsite: vi.fn().mockResolvedValue({
          phones: [],
          emails: [
            {
              value: 'info@acme.example',
              confidence: 95,
              sources: ['official_contact_page'],
              type: 'role',
              roleType: 'info',
              isPrimary: true,
            },
          ],
          addresses: [],
          forms: [],
          capabilities: null,
        }),
      } as any,
      emailSearcher as any,
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
        calculateLeadQualityScore: vi.fn().mockReturnValue(30),
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
        inferEmailFormat: true,
        validateMX: true,
      },
    });

    expect(searchSpy).toHaveBeenCalledWith(
      'Acme Automation',
      'acme.example',
      expect.objectContaining({
        validateMX: false,
      })
    );
    expect(inferSpy).not.toHaveBeenCalled();
    expect(result.emails.map(email => email.value)).toContain('info@acme.example');
    expect(result.emails.some(email => email.sources.includes('email_format_inferred'))).toBe(false);
  });
});
