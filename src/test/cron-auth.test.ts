import { afterEach, describe, expect, it, vi } from "vitest";
import { getCronAuthState } from "@/lib/cron-auth";

describe("cron-auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("authorizes requests with the Vercel Authorization header", () => {
    vi.stubEnv("CRON_SECRET", "top-secret");
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("https://example.com/api/cron/radar-scan", {
      headers: {
        Authorization: "Bearer top-secret",
      },
    });

    expect(getCronAuthState(request)).toEqual({
      authorized: true,
      method: "authorization",
    });
  });

  it("keeps the legacy query secret path working for manual triggers", () => {
    vi.stubEnv("CRON_SECRET", "top-secret");
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request(
      "https://example.com/api/cron/radar-scan?secret=top-secret",
    );

    expect(getCronAuthState(request)).toEqual({
      authorized: true,
      method: "query",
    });
  });

  it("rejects requests that do not include any cron secret in production", () => {
    vi.stubEnv("CRON_SECRET", "top-secret");
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("https://example.com/api/cron/radar-scan");

    expect(getCronAuthState(request)).toEqual({
      authorized: false,
      method: null,
      reason: "missing_request_secret",
    });
  });

  it("allows local development when CRON_SECRET is intentionally absent", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");

    const request = new Request("https://example.com/api/cron/radar-scan");

    expect(getCronAuthState(request)).toEqual({
      authorized: true,
      method: "development-bypass",
    });
  });
});
