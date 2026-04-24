import type { NextRequest } from "next/server";
import { isLocalDevelopmentHostname } from "@/lib/tenant-resolver";

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

function shouldPreferRequestOrigin(requestOrigin: string, configuredOrigin: string | null): boolean {
  if (!configuredOrigin) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    const requestHostname = new URL(requestOrigin).hostname;
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

export function shouldIgnoreStaticAuthOriginInDev(value: string | null | undefined): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const origin = parseOrigin(value);
  if (!origin) {
    return false;
  }

  return isLocalDevelopmentHostname(new URL(origin).hostname);
}
