import { ROLES, APP_ROLES, DECIDER_ONLY_ACTIONS, type AppRole } from "./constants";
import type { Session } from "next-auth";

function getRoleKey(roleName: string | undefined | null): string {
  return roleName?.trim().toLowerCase() ?? "";
}

export const PLATFORM_ADMIN_ROLE_CANDIDATES = [
  ROLES.PLATFORM_ADMIN,
  "platform_admin",
  "super_admin",
  "admin",
] as const;

export const COMPANY_ADMIN_ROLE_CANDIDATES = [
  ROLES.COMPANY_ADMIN,
  "company_admin",
  "tenant_admin",
  "企业管理员",
] as const;

const PLATFORM_ADMIN_ROLE_KEYS = new Set(
  PLATFORM_ADMIN_ROLE_CANDIDATES.map((roleName) => getRoleKey(roleName))
);

const COMPANY_ADMIN_ROLE_KEYS = new Set(
  COMPANY_ADMIN_ROLE_CANDIDATES.map((roleName) => getRoleKey(roleName))
);

export type UserPermissions = {
  permissions: string[];
  roleName: string;
};

export function normalizeRoleName(roleName: string | undefined | null): string {
  const roleKey = getRoleKey(roleName);

  if (!roleKey) return "";
  if (PLATFORM_ADMIN_ROLE_KEYS.has(roleKey)) return ROLES.PLATFORM_ADMIN;
  if (COMPANY_ADMIN_ROLE_KEYS.has(roleKey)) return ROLES.COMPANY_ADMIN;

  return roleName?.trim() ?? "";
}

export function isPlatformAdminRoleName(
  roleName: string | undefined | null
): boolean {
  return normalizeRoleName(roleName) === ROLES.PLATFORM_ADMIN;
}

export function isCompanyAdminRoleName(
  roleName: string | undefined | null
): boolean {
  const normalizedRoleName = normalizeRoleName(roleName);
  return (
    normalizedRoleName === ROLES.COMPANY_ADMIN ||
    normalizedRoleName === ROLES.PLATFORM_ADMIN
  );
}

/**
 * Check if a user has a specific permission.
 * Supports wildcard matching: "products.*" matches "products.read", "products.edit", etc.
 */
export function checkPermission(
  user: UserPermissions | null | undefined,
  permission: string
): boolean {
  if (!user || !user.permissions) return false;

  return user.permissions.some((p: string) => {
    if (p === permission) return true;
    // Wildcard: "products.*" matches "products.read"
    if (p.endsWith(".*")) {
      const prefix = p.slice(0, -1);
      return permission.startsWith(prefix);
    }
    // Super wildcard: "platform.*" grants everything
    if (p === "platform.*") return true;
    return false;
  });
}

export function isPlatformAdmin(user: UserPermissions | null | undefined): boolean {
  if (!user) return false;
  return isPlatformAdminRoleName(user.roleName);
}

export function isCompanyAdmin(user: UserPermissions | null | undefined): boolean {
  if (!user) return false;
  return isCompanyAdminRoleName(user.roleName);
}

// ==================== RBAC 应用角色扩展 ====================

/**
 * 将数据库 roleName 映射为应用角色
 */
export function mapRoleToAppRole(roleName: string | undefined | null): AppRole {
  const normalizedRoleName = normalizeRoleName(roleName);

  if (!normalizedRoleName) return APP_ROLES.OPERATOR;
  if (
    normalizedRoleName === ROLES.PLATFORM_ADMIN ||
    normalizedRoleName === ROLES.COMPANY_ADMIN
  ) {
    return APP_ROLES.DECIDER;
  }
  return APP_ROLES.OPERATOR;
}

/**
 * 判断用户是否为决策者
 */
export function isDecider(user: UserPermissions | null | undefined): boolean {
  if (!user) return false;
  return mapRoleToAppRole(user.roleName) === APP_ROLES.DECIDER;
}

/**
 * 前端权限检查：某操作是否允许
 */
export function canPerformAction(appRole: AppRole, action: string): boolean {
  if (appRole === APP_ROLES.DECIDER) return true;
  return !(DECIDER_ONLY_ACTIONS as readonly string[]).includes(action);
}

/**
 * 服务端守卫：要求决策者权限，否则返回错误
 */
export function requireDecider(session: Session | null): { authorized: true } | { authorized: false; error: string } {
  if (!session?.user?.tenantId || !session?.user?.id) {
    return { authorized: false, error: '未登录，请重新登录。' };
  }
  const roleName = (session.user as Record<string, unknown>).roleName as string | undefined;
  if (mapRoleToAppRole(roleName) !== APP_ROLES.DECIDER) {
    return { authorized: false, error: '该操作需要决策者权限。请联系管理员。' };
  }
  return { authorized: true };
}
