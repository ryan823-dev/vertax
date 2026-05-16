import { describe, expect, it } from 'vitest';
import {
  buildTenantResendApiKeyEnvNames,
  extractSenderDomain,
  mergeTenantEmailConfigUpdate,
  normalizeResendApiKey,
  resolveTenantResendApiKeyFromEnv,
} from '@/lib/email/tenant-email-config';

describe('tenant email config helpers', () => {
  it('keeps tenant-owned key mode when saving without re-entering the key', () => {
    const merged = mergeTenantEmailConfigUpdate(
      {
        customApiKey: 're_existing_key',
        usePlatformKey: false,
        fromEmail: 'MachRio <noreply@mail.machrio.com>',
        replyToEmail: 'sales@machrio.com',
      },
      {
        replyToEmail: 'support@machrio.com',
      },
      { slug: 'machrio' }
    );

    expect(merged).toMatchObject({
      customApiKey: 're_existing_key',
      usePlatformKey: false,
      fromEmail: 'MachRio <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
      customFromDomain: 'mail.machrio.com',
    });
  });

  it('switches to tenant-owned key mode when a new Resend key is provided', () => {
    const merged = mergeTenantEmailConfigUpdate(
      {
        usePlatformKey: true,
      },
      {
        resendApiKey: ' re_new_key ',
        fromEmail: 'MachRio <noreply@mail.machrio.com>',
      },
      { slug: 'machrio' }
    );

    expect(merged).toMatchObject({
      customApiKey: 're_new_key',
      usePlatformKey: false,
      fromEmail: 'MachRio <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
      customFromDomain: 'mail.machrio.com',
    });
  });

  it('uses tenant email defaults when persisted fields are absent', () => {
    const merged = mergeTenantEmailConfigUpdate(
      {
        usePlatformKey: true,
      },
      {},
      { slug: 'machrio' }
    );

    expect(merged).toMatchObject({
      usePlatformKey: true,
      fromEmail: 'VertaX <noreply@mail.machrio.com>',
      replyToEmail: 'support@machrio.com',
      customFromDomain: 'mail.machrio.com',
    });
  });

  it('extracts the sender domain from display-name email values', () => {
    expect(extractSenderDomain('MachRio <noreply@mail.machrio.com>')).toBe('mail.machrio.com');
    expect(extractSenderDomain('noreply@mail.machrio.com')).toBe('mail.machrio.com');
    expect(extractSenderDomain('')).toBeUndefined();
  });

  it('resolves tenant-scoped Resend API keys from environment aliases', () => {
    expect(buildTenantResendApiKeyEnvNames('machrio')).toEqual([
      'RESEND_API_KEY_MACHRIO',
      'TENANT_MACHRIO_RESEND_API_KEY',
      'TENANT_MACHRIO_API_KEY',
    ]);
    expect(resolveTenantResendApiKeyFromEnv('machrio', {
      RESEND_API_KEY_MACHRIO: ' re_machrio_key ',
    })).toEqual({
      apiKey: 're_machrio_key',
      envName: 'RESEND_API_KEY_MACHRIO',
    });
  });

  it('ignores empty and placeholder Resend API keys', () => {
    expect(normalizeResendApiKey('')).toBeUndefined();
    expect(normalizeResendApiKey('re_test_placeholder')).toBeUndefined();
    expect(normalizeResendApiKey('"re_real_key"')).toBe('re_real_key');
  });
});
