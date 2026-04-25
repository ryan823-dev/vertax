import { afterEach, describe, expect, it, vi } from 'vitest';

const { chatCompletionMock, resolveApiKeyMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
  resolveApiKeyMock: vi.fn(),
}));

vi.mock('@/lib/ai-client', () => ({
  chatCompletion: chatCompletionMock,
}));

vi.mock('@/lib/services/api-key-resolver', () => ({
  resolveApiKey: resolveApiKeyMock,
}));

import { CompetitiveDiscoveryAdapter } from '@/lib/radar/adapters/competitive-discovery';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  chatCompletionMock.mockReset();
  resolveApiKeyMock.mockReset();
  (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch;
});

describe('competitive discovery adapter', () => {
  it('passes country bias into Exa customer discovery searches', async () => {
    resolveApiKeyMock.mockResolvedValue('exa-test-key');
    chatCompletionMock.mockResolvedValue({
      content: '["Acme Robotics"]',
    });

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          results: [
            {
              title: 'Fanuc case study',
              text: 'Acme Robotics uses Fanuc automation systems.',
              url: 'https://example.com/acme-robotics',
            },
          ],
        })
      )
    );

    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const adapter = new CompetitiveDiscoveryAdapter({
      fieldMapping: {
        competitors: ['Fanuc'] as any,
      },
    });

    const result = await adapter.search({
      countries: ['DE'],
      maxResults: 10,
    });

    expect(result.items[0]?.displayName).toBe('Acme Robotics');

    const requestBodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body))
    );

    expect(requestBodies).toHaveLength(2);
    expect(requestBodies.every((body) => body.userLocation === 'DE')).toBe(true);
    expect(requestBodies.every((body) => String(body.query).includes('Germany'))).toBe(true);
  });
});
