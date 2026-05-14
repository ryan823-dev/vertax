import { afterEach, describe, expect, it } from "vitest";
import { resolveAppOrigin, shouldIgnoreStaticAuthOrigin } from "@/lib/app-origin";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("app origin resolution", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("prefers the active tenant request host over a configured tenant origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tdpaint.vertax.top";

    expect(resolveAppOrigin("https://machrio.vertax.top/customer/home")).toBe(
      "https://machrio.vertax.top",
    );
  });

  it("ignores static auth origins that would freeze Auth.js to one Vertax host", () => {
    expect(shouldIgnoreStaticAuthOrigin("https://tdpaint.vertax.top")).toBe(true);
    expect(shouldIgnoreStaticAuthOrigin("https://vertax.top")).toBe(true);
    expect(shouldIgnoreStaticAuthOrigin("http://localhost:3000")).toBe(true);
  });

  it("keeps non-Vertax static auth origins available", () => {
    expect(shouldIgnoreStaticAuthOrigin("https://auth.example.com")).toBe(false);
  });
});
