export type RuntimeKeyStatus = {
  name: string;
  configured: boolean;
};

export function getRuntimeKeyStatus() {
  const keys = [
    "DATABASE_URL",
    "DIRECT_URL",
    "CRON_SECRET",
    "GOOGLE_MAPS_API_KEY",
    "BRAVE_SEARCH_API_KEY",
    "SERPAPI_KEY",
    "EXA_API_KEY",
    "TAVILY_API_KEY",
    "FIRECRAWL_API_KEY",
    "NEXTAUTH_SECRET",
  ] as const;

  return keys.map<RuntimeKeyStatus>((name) => ({
    name,
    configured: Boolean(process.env[name]),
  }));
}

export function getRuntimeHealthSnapshot() {
  const keyStatuses = getRuntimeKeyStatus();

  return {
    nodeEnv: process.env.NODE_ENV || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "unknown",
    configuredKeys: keyStatuses.filter((key) => key.configured).length,
    missingKeys: keyStatuses.filter((key) => !key.configured).map((key) => key.name),
    keys: keyStatuses,
  };
}
