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
 * Resolve tenant and view mode from hostname
 */
export function resolveTenant(hostname: string): TenantInfo {
  // Remove port if present
  const domain = hostname.split(':')[0];
  
  // Check if it's tower (operations view)
  if (TOWER_DOMAINS.includes(domain)) {
    return {
      viewMode: 'operations',
      tenantSlug: null,
      domain,
    };
  }
  
  // Check if it's a customer subdomain (e.g., tdpaintcell.vertax.top)
  if (domain.endsWith(`.${BASE_DOMAIN}`)) {
    const tenantSlug = domain.replace(`.${BASE_DOMAIN}`, '');
    return {
      viewMode: 'customer',
      tenantSlug,
      domain,
    };
  }
  
  // Localhost or unknown domain - use env or default to operations
  if (domain === 'localhost' || domain === '127.0.0.1') {
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
