import { afterEach, describe, expect, it, vi } from "vitest";
import { getRuntimeHealthSnapshot, getRuntimeKeyStatus } from "@/lib/runtime-check";

describe("runtime-check", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports configured keys without exposing secret values", () => {
    vi.stubEnv("DATABASE_URL", "postgres://example");
    vi.stubEnv("EXA_API_KEY", "exa-key");
    vi.stubEnv("TAVILY_API_KEY", "tavily-key");

    const snapshot = getRuntimeHealthSnapshot();

    expect(snapshot.configuredKeys).toBeGreaterThanOrEqual(3);
    expect(snapshot.keys.find((item) => item.name === "EXA_API_KEY")?.configured).toBe(true);
    expect(snapshot.keys.find((item) => item.name === "TAVILY_API_KEY")?.configured).toBe(true);
    expect(snapshot.missingKeys).not.toContain("EXA_API_KEY");
    expect(snapshot.missingKeys).not.toContain("TAVILY_API_KEY");
  });

  it("returns a stable list of runtime keys", () => {
    const keys = getRuntimeKeyStatus();

    expect(keys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "DATABASE_URL" }),
        expect.objectContaining({ name: "CRON_SECRET" }),
        expect.objectContaining({ name: "EXA_API_KEY" }),
      ])
    );
  });
});
