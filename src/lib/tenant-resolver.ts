/**
 * Tenant/View Resolver based on domain
 * 
 * - tower.vertax.top → Operations view (运营后台)
 * - *.vertax.top → Customer view (客户界面)
 * - localhost → Based on NEXT_PUBLIC_VIEW_MODE env
 */

export type ViewMode = 'operations' | 'customer';

export interface TenantInfo {
  viewMode: ViewMode;
  tenantSlug: string | null;
  domain: string;
}

const TOWER_DOMAINS = ['tower.vertax.top', 'tower.vertax.cn'];
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'vertax.top';

/**
 * Normalize a hostname by trimming whitespace, lowercasing it, and stripping
 * the port when the input comes from a raw Host header.
 */
export function normalizeHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase();

  if (normalized.startsWith('[')) {
    const closingBracketIndex = normalized.indexOf(']');
    return closingBracketIndex >= 0
      ? normalized.slice(0, closingBracketIndex + 1)
      : normalized;
  }

  return normalized.split(':')[0];
}

/**
 * Localhost traffic should stay on localhost during development instead of
 * being canonicalized to production tenant domains.
 */
export function isLocalDevelopmentHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    normalized.endsWith('.localhost')
  );
}

/**
 * Resolve tenant and view mode from hostname
 */
export function resolveTenant(hostname: string): TenantInfo {
  // Remove port if present
  const domain = normalizeHostname(hostname);
  
  // Check if it's tower (operations view)
  if (TOWER_DOMAINS.includes(domain)) {
    return {
      viewMode: 'operations',
      tenantSlug: null,
      domain,
    };
  }
  
  // Check if it's a customer subdomain (e.g., tdpaint.vertax.top)
  if (domain.endsWith(`.${BASE_DOMAIN}`)) {
    const tenantSlug = domain.replace(`.${BASE_DOMAIN}`, '');
    return {
      viewMode: 'customer',
      tenantSlug,
      domain,
    };
  }
  
  // Localhost or unknown domain - use env or default to operations
  if (isLocalDevelopmentHostname(domain)) {
    const viewMode = (process.env.NEXT_PUBLIC_VIEW_MODE as ViewMode) || 'operations';
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || null;
    return {
      viewMode,
      tenantSlug,
      domain,
    };
  }
  
  // Default to operations view
  return {
    viewMode: 'operations',
    tenantSlug: null,
    domain,
  };
}

/**
 * Build the canonical hostname for a tenant workspace.
 */
export function getTenantHostname(
  tenantSlug: string,
  baseDomain: string = BASE_DOMAIN,
): string {
  return `${tenantSlug}.${baseDomain}`;
}

/**
 * Redirect authenticated tenant users back to their canonical subdomain when
 * they land on the wrong customer host.
 */
export function getTenantCanonicalRedirectUrl({
  currentUrl,
  sessionTenantSlug,
  baseDomain = BASE_DOMAIN,
}: {
  currentUrl: string | URL;
  sessionTenantSlug?: string | null;
  baseDomain?: string;
}): string | null {
  const normalizedTenantSlug = sessionTenantSlug?.trim();
  if (!normalizedTenantSlug) {
    return null;
  }

  const url = currentUrl instanceof URL ? new URL(currentUrl.toString()) : new URL(currentUrl);
  const currentHostname = normalizeHostname(url.hostname);
  const expectedHostname = getTenantHostname(normalizedTenantSlug, baseDomain);

  if (currentHostname === expectedHostname) {
    return null;
  }

  if (isLocalDevelopmentHostname(currentHostname)) {
    return null;
  }

  const tenantInfo = resolveTenant(currentHostname);
  const shouldEnforceCanonicalHost =
    tenantInfo.viewMode === 'customer' ||
    url.pathname.startsWith('/customer') ||
    url.pathname === '/login' ||
    url.pathname === '/register';

  if (!shouldEnforceCanonicalHost) {
    return null;
  }

  url.hostname = expectedHostname;
  return url.toString();
}

/**
 * Get tenant info from request headers (for server components)
 */
export function getTenantFromHeaders(headers: Headers): TenantInfo {
  const host = headers.get('host') || 'localhost';
  return resolveTenant(host);
}

/**
 * Check if current view is customer view
 */
export function isCustomerView(hostname: string): boolean {
  return resolveTenant(hostname).viewMode === 'customer';
}

/**
 * Check if current view is operations view
 */
export function isOperationsView(hostname: string): boolean {
  return resolveTenant(hostname).viewMode === 'operations';
}
