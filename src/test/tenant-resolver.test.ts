import { describe, expect, it } from "vitest";
import { getTenantCanonicalRedirectUrl } from "@/lib/tenant-resolver";

describe("tenant-resolver canonical redirects", () => {
  it("does not rewrite requests that are already on the user's tenant host", () => {
    expect(
      getTenantCanonicalRedirectUrl({
        currentUrl: "https://tdpaint.vertax.top/customer/home",
        sessionTenantSlug: "tdpaint",
      }),
    ).toBeNull();
  });

  it("rewrites mismatched customer subdomains while preserving path and query", () => {
    expect(
      getTenantCanonicalRedirectUrl({
        currentUrl: "https://terrafly.vertax.top/customer/home?tab=briefing",
        sessionTenantSlug: "tdpaint",
      }),
    ).toBe("https://tdpaint.vertax.top/customer/home?tab=briefing");
  });

  it("rewrites root-domain login requests back to the tenant host", () => {
    expect(
      getTenantCanonicalRedirectUrl({
        currentUrl: "https://vertax.top/login?callbackUrl=%2Fcustomer%2Fhome",
        sessionTenantSlug: "tdpaint",
      }),
    ).toBe("https://tdpaint.vertax.top/login?callbackUrl=%2Fcustomer%2Fhome");
  });

  it("keeps localhost customer routes on localhost during development", () => {
    expect(
      getTenantCanonicalRedirectUrl({
        currentUrl: "http://localhost:3000/customer/home",
        sessionTenantSlug: "tdpaint",
      }),
    ).toBeNull();
  });

  it("leaves tower routes alone", () => {
    expect(
      getTenantCanonicalRedirectUrl({
        currentUrl: "https://tower.vertax.top/tower",
        sessionTenantSlug: "tdpaint",
      }),
    ).toBeNull();
  });
});
