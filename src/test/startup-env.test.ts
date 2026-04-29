import { afterEach, describe, expect, it, vi } from "vitest";
import { validateStartupEnv } from "@/lib/startup-env";

describe("startup-env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a complete core startup configuration", () => {
    vi.stubEnv("DATABASE_URL", "postgres://example");
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("DASHSCOPE_API_KEY", "dashscope-key");

    const validation = validateStartupEnv();

    expect(validation.missingRequired).toEqual([]);
  });

  it("requires at least one auth secret alias", () => {
    vi.stubEnv("DATABASE_URL", "postgres://example");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("DASHSCOPE_API_KEY", "dashscope-key");

    const validation = validateStartupEnv();

    expect(validation.missingRequired).toContain(
      "AUTH_SECRET | JWT_SECRET",
    );
  });
});
