/**
 * Cross-Platform JWT Bridge
 * 
 * Provides utilities for generating and verifying JWTs that work across
 * both Tower (Next.js) and Vertax (Express) systems.
 * 
 * Both systems must share the same JWT_SECRET environment variable.
 */

import * as jwt from "jsonwebtoken";

// Shared JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "vertax-jwt-secret-change-in-production";
const JWT_ISSUER = "vertax.top";
const JWT_AUDIENCE = "vertax-platform";

// Token expiry durations
const ACCESS_TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY = "30d";

/**
 * Cross-platform JWT payload structure
 * This format is recognized by both Tower and Vertax
 */
export interface CrossPlatformJWTPayload {
  // Core identity
  userId: string;
  tenantId: string;
  tenantSlug: string;
  
  // Role information
  role: string;
  permissions?: string[];
  
  // User metadata (optional)
  email?: string;
  name?: string;
  
  // Standard JWT claims
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

/**
 * User object from Tower authentication
 */
export interface TowerUser {
  id: string;
  email: string;
  name?: string;
  tenantId: string;
  tenantSlug: string;
  tenantName?: string;
  roleName: string;
  permissions?: string[];
}

/**
 * Generate a cross-platform JWT that works with both Tower and Vertax
 * 
 * @param user - The authenticated user from Tower
 * @returns Object containing access and refresh tokens
 */
export function generateCrossPlatformJWT(user: TowerUser): {
  accessToken: string;
  refreshToken: string;
} {
  const payload: Omit<CrossPlatformJWTPayload, "iss" | "aud" | "exp" | "iat"> = {
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    role: user.roleName,
    permissions: user.permissions,
    email: user.email,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  const refreshToken = jwt.sign(
    { ...payload, type: "refresh" },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify a cross-platform JWT
 * 
 * @param token - The JWT token to verify
 * @returns The decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export function verifyCrossPlatformJWT(token: string): CrossPlatformJWTPayload {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as CrossPlatformJWTPayload;

  return decoded;
}

/**
 * Verify a cross-platform JWT without throwing
 * 
 * @param token - The JWT token to verify
 * @returns The decoded payload if valid, or null if invalid
 */
export function verifyCrossPlatformJWTSafe(token: string): CrossPlatformJWTPayload | null {
  try {
    return verifyCrossPlatformJWT(token);
  } catch {
    return null;
  }
}

/**
 * Decode a JWT without verification (for debugging/inspection)
 * 
 * @param token - The JWT token to decode
 * @returns The decoded payload without verification
 */
export function decodeCrossPlatformJWT(token: string): CrossPlatformJWTPayload | null {
  try {
    return jwt.decode(token) as CrossPlatformJWTPayload | null;
  } catch {
    return null;
  }
}

/**
 * Extract tenant slug from subdomain
 * 
 * @param hostname - The full hostname (e.g., "tdpaintcell.vertax.top")
 * @param baseDomain - The base domain (e.g., "vertax.top")
 * @returns The tenant slug or null if not a subdomain
 */
export function extractTenantSlugFromSubdomain(
  hostname: string,
  baseDomain: string = "vertax.top"
): string | null {
  // Handle localhost for development
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    return null;
  }

  // Remove port if present
  const hostnameWithoutPort = hostname.split(":")[0];
  
  // Check if it's a subdomain of the base domain
  if (!hostnameWithoutPort.endsWith(`.${baseDomain}`)) {
    // Direct match (e.g., "vertax.top") - no tenant subdomain
    if (hostnameWithoutPort === baseDomain) {
      return null;
    }
    return null;
  }

  // Extract subdomain
  const subdomain = hostnameWithoutPort.slice(0, -(baseDomain.length + 1));
  
  // Filter out reserved subdomains
  const reservedSubdomains = ["www", "api", "tower", "admin", "app"];
  if (reservedSubdomains.includes(subdomain)) {
    return null;
  }

  return subdomain || null;
}

/**
 * Generate a login redirect URL for cross-domain authentication
 * 
 * @param targetUrl - The URL the user was trying to access
 * @param towerBaseUrl - The base URL of Tower (e.g., "https://tower.vertax.top")
 * @returns The full login URL with redirect parameter
 */
export function generateLoginRedirectUrl(
  targetUrl: string,
  towerBaseUrl: string = "https://tower.vertax.top"
): string {
  const loginUrl = new URL("/zh-CN/login", towerBaseUrl);
  loginUrl.searchParams.set("redirect", targetUrl);
  return loginUrl.toString();
}

/**
 * Generate cross-domain cookie options for shared authentication
 * 
 * @param domain - The domain for the cookie (e.g., ".vertax.top")
 * @param secure - Whether to use secure cookies (default: true in production)
 * @returns Cookie options object
 */
export function getCrossDomainCookieOptions(
  domain: string = ".vertax.top",
  secure: boolean = process.env.NODE_ENV === "production"
): {
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax" | "strict";
  maxAge: number;
} {
  return {
    domain,
    path: "/",
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  };
}
