import type { NextRequest } from "next/server";
import {
  isLocalDevelopmentHostname,
  normalizeHostname,
} from "@/lib/tenant-resolver";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(request: NextRequest | URL | string): string | null {
  try {
    if (typeof request === "string") {
      return new URL(request).origin;
    }

    if (request instanceof URL) {
      return request.origin;
    }

    const fallbackUrl = new URL(request.url);
    const forwardedProto =
      request.headers.get("x-forwarded-proto") ??
      fallbackUrl.protocol.replace(/:$/, "");
    const forwardedHost =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host");

    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    return fallbackUrl.origin;
  } catch {
    return null;
  }
}

function getConfiguredAppOrigin(): string | null {
  return (
    parseOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    parseOrigin(process.env.AUTH_URL) ??
    parseOrigin(process.env.NEXTAUTH_URL)
  );
}

function isConfiguredVertaxHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === BASE_DOMAIN ||
    normalized === `www.${BASE_DOMAIN}` ||
    normalized.endsWith(`.${BASE_DOMAIN}`)
  );
}

function shouldPreferRequestOrigin(requestOrigin: string, configuredOrigin: string | null): boolean {
  const requestHostname = normalizeHostname(new URL(requestOrigin).hostname);

  if (isConfiguredVertaxHost(requestHostname)) {
    return true;
  }

  if (!configuredOrigin) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    if (isLocalDevelopmentHostname(requestHostname)) {
      return true;
    }
  }

  return false;
}

export function resolveAppOrigin(request?: NextRequest | URL | string): string {
  const requestOrigin = request ? getRequestOrigin(request) : null;
  const configuredOrigin = getConfiguredAppOrigin();

  if (requestOrigin && shouldPreferRequestOrigin(requestOrigin, configuredOrigin)) {
    return requestOrigin;
  }

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  return "http://127.0.0.1:3000";
}

export function getAppUrl(pathname: string, request?: NextRequest | URL | string): URL {
  return new URL(pathname, resolveAppOrigin(request));
}

export function shouldIgnoreStaticAuthOrigin(value: string | null | undefined): boolean {
  const origin = parseOrigin(value);
  if (!origin) {
    return false;
  }

  const hostname = normalizeHostname(new URL(origin).hostname);

  return isLocalDevelopmentHostname(hostname) || isConfiguredVertaxHost(hostname);
}
