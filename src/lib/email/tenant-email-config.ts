import {
  getTenantEmailDefaults,
  type TenantEmailDefaultInput,
} from '@/lib/email/tenant-email-defaults';

export interface TenantEmailConfigUpdateInput {
  website?: string;
  resendApiKey?: string;
  fromEmail?: string;
  replyToEmail?: string;
  usePlatformKey?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function normalizeResendApiKey(value: unknown): string | undefined {
  const key = nonEmptyString(value)?.replace(/^["']|["']$/g, '');
  if (!key || key === 're_test_placeholder' || key.startsWith('re_placeholder')) {
    return undefined;
  }

  return key;
}

export function maskResendApiKey(value: string): string {
  return `${value.slice(0, 7)}...`;
}

export function buildTenantResendApiKeyEnvNames(slug?: string | null): string[] {
  const normalized = slug?.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  if (!normalized) {
    return [];
  }

  return [
    `RESEND_API_KEY_${normalized}`,
    `TENANT_${normalized}_RESEND_API_KEY`,
    `TENANT_${normalized}_API_KEY`,
  ];
}

export function resolveTenantResendApiKeyFromEnv(
  slug?: string | null,
  env: Record<string, string | undefined> = process.env
): { apiKey: string; envName: string } | null {
  for (const envName of buildTenantResendApiKeyEnvNames(slug)) {
    const apiKey = normalizeResendApiKey(env[envName]);
    if (apiKey) {
      return { apiKey, envName };
    }
  }

  return null;
}

export function extractSenderDomain(fromEmail?: string | null): string | undefined {
  const value = nonEmptyString(fromEmail);
  if (!value) {
    return undefined;
  }

  const match = value.match(/@([^>\s]+)/);
  return match?.[1]?.trim().toLowerCase();
}

export function mergeTenantEmailConfigUpdate(
  currentConfig: unknown,
  input: TenantEmailConfigUpdateInput,
  tenant?: TenantEmailDefaultInput | null
): Record<string, unknown> {
  const current = isRecord(currentConfig) ? currentConfig : {};
  const tenantDefaults = getTenantEmailDefaults(tenant);
  const next: Record<string, unknown> = { ...current };

  const newCustomApiKey = normalizeResendApiKey(input.resendApiKey);
  const existingCustomApiKey = normalizeResendApiKey(current.customApiKey);
  const customApiKey = newCustomApiKey ?? existingCustomApiKey;

  const website = nonEmptyString(input.website) ?? nonEmptyString(current.website);
  if (website) {
    next.website = website;
  }

  if (customApiKey) {
    next.customApiKey = customApiKey;
  }

  const fromEmail =
    nonEmptyString(input.fromEmail) ??
    nonEmptyString(current.fromEmail) ??
    tenantDefaults.fromEmail;
  if (fromEmail) {
    next.fromEmail = fromEmail;
  }

  const replyToEmail =
    nonEmptyString(input.replyToEmail) ??
    nonEmptyString(current.replyToEmail) ??
    tenantDefaults.replyToEmail;
  if (replyToEmail) {
    next.replyToEmail = replyToEmail;
  }

  const currentUsePlatformKey =
    typeof current.usePlatformKey === 'boolean' ? current.usePlatformKey : undefined;
  next.usePlatformKey =
    typeof input.usePlatformKey === 'boolean'
      ? input.usePlatformKey
      : newCustomApiKey
        ? false
        : currentUsePlatformKey ?? !customApiKey;

  const customFromDomain =
    extractSenderDomain(fromEmail) ?? nonEmptyString(current.customFromDomain);
  if (customFromDomain) {
    next.customFromDomain = customFromDomain;
  }

  return next;
}
