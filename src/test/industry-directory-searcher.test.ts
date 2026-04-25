import { afterEach, describe, expect, it, vi } from 'vitest';

import { IndustryDirectorySearcher } from '@/lib/osint/contact-enrichment/industry-directory';

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

describe('industry directory searcher', () => {
  it('does not treat search-engine housekeeping emails as directory contact emails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      htmlResponse(`
        <html>
          <body>
            <div>Support: error-lite@duckduckgo.com</div>
            <div>Phone: +1 555 111 2222</div>
            <div>Industrial automation systems and robotics integration.</div>
          </body>
        </html>
      `)
    );

    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const searcher = new IndustryDirectorySearcher();
    const result = await searcher.searchDirectory('Acme Automation', ['thomasnet']);

    expect(result.emails).toEqual([]);
    expect(result.phones[0]?.value).toContain('555');
    expect(result.additionalInfo.capabilities).toBeTruthy();
  });

  it('adds canonical country names to directory search queries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse('<html><body></body></html>'));

    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const searcher = new IndustryDirectorySearcher();
    await searcher.searchDirectory('Acme Automation', ['thomasnet'], 'DE');

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get('q')).toBe('Acme Automation Germany site:thomasnet.com');
  });
});
