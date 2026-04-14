import { NextResponse } from "next/server";

type CronRequestLike = {
  headers: Headers;
  nextUrl?: URL;
  url?: string;
};

export type CronAuthMethod =
  | "authorization"
  | "query"
  | "development-bypass"
  | null;

export type CronAuthState = {
  authorized: boolean;
  method: CronAuthMethod;
  reason?: "missing_cron_secret" | "missing_request_secret" | "invalid_secret";
};

function readRequestUrl(request: CronRequestLike): URL | null {
  if (request.nextUrl instanceof URL) {
    return request.nextUrl;
  }

  if (!request.url) {
    return null;
  }

  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function getCronAuthState(request: CronRequestLike): CronAuthState {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV !== "production") {
      return {
        authorized: true,
        method: "development-bypass",
      };
    }

    return {
      authorized: false,
      method: null,
      reason: "missing_cron_secret",
    };
  }

  const bearerToken = getBearerToken(request.headers);
  if (bearerToken === cronSecret) {
    return {
      authorized: true,
      method: "authorization",
    };
  }

  const requestUrl = readRequestUrl(request);
  const querySecret = requestUrl?.searchParams.get("secret");
  if (querySecret === cronSecret) {
    return {
      authorized: true,
      method: "query",
    };
  }

  return {
    authorized: false,
    method: null,
    reason: bearerToken || querySecret ? "invalid_secret" : "missing_request_secret",
  };
}

export function ensureCronAuthorized(request: CronRequestLike) {
  const authState = getCronAuthState(request);
  if (authState.authorized) {
    return null;
  }

  const message =
    authState.reason === "missing_cron_secret"
      ? "CRON_SECRET is not configured"
      : authState.reason === "missing_request_secret"
        ? "Missing Authorization bearer token or legacy ?secret parameter"
        : "Invalid cron secret";

  return NextResponse.json(
    {
      error: "Unauthorized",
      message,
    },
    { status: 401 },
  );
}
