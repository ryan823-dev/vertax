import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getTenantClient } from '@/lib/email/resend-client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

const mockFindUnique = vi.mocked(prisma.tenant.findUnique);

describe('resend tenant client config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('keeps MachRio defaults when using a tenant-owned Resend key', async () => {
    mockFindUnique.mockResolvedValueOnce({
      slug: 'machrio',
      emailConfig: {
        usePlatformKey: false,
        customApiKey: 're_machrio_key',
      },
      companyProfile: {
        companyName: 'MachRio',
      },
    } as never);

    const result = await getTenantClient('tenant-machrio-custom');

    expect(result.client).not.toBeNull();
    expect(result.config).toMatchObject({
      usePlatformKey: false,
      customApiKey: 're_machrio_key',
      fromEmail: 'VertaX <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
      apiKeySource: 'tenant_db',
      apiKeySourceName: 'Tenant.emailConfig.customApiKey',
    });
  });

  it('prefers a persisted tenant key even when legacy config says platform key', async () => {
    mockFindUnique.mockResolvedValueOnce({
      slug: 'machrio',
      emailConfig: {
        usePlatformKey: true,
        customApiKey: 're_machrio_saved_key',
      },
      companyProfile: {
        companyName: 'MachRio',
      },
    } as never);

    const result = await getTenantClient('tenant-machrio-legacy');

    expect(result.config).toMatchObject({
      usePlatformKey: false,
      customApiKey: 're_machrio_saved_key',
      fromEmail: 'VertaX <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
      apiKeySource: 'tenant_db',
    });
  });

  it('uses tenant-scoped environment keys before the platform key', async () => {
    vi.stubEnv('RESEND_API_KEY_MACHRIO', 're_machrio_env_key');
    mockFindUnique.mockResolvedValueOnce({
      slug: 'machrio',
      emailConfig: {
        usePlatformKey: true,
        replyToEmail: 'support@machrio.com',
      },
      companyProfile: {
        companyName: 'MachRio',
      },
    } as never);

    const result = await getTenantClient('tenant-machrio-env');

    expect(result.config).toMatchObject({
      usePlatformKey: false,
      fromEmail: 'VertaX <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
      apiKeySource: 'tenant_env',
      apiKeySourceName: 'RESEND_API_KEY_MACHRIO',
    });
  });

  it('uses persisted reply-to over tenant defaults', async () => {
    mockFindUnique.mockResolvedValueOnce({
      slug: 'machrio',
      emailConfig: {
        usePlatformKey: true,
        replyToEmail: 'support@machrio.com',
      },
      companyProfile: {
        companyName: 'MachRio',
      },
    } as never);

    const result = await getTenantClient('tenant-machrio-platform');

    expect(result.config).toMatchObject({
      usePlatformKey: true,
      fromEmail: 'VertaX <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
    });
  });
});
