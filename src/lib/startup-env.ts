export type RuntimeKeyStatus = {
  name: string;
  configured: boolean;
  requiredAtStartup: boolean;
};

type StartupValidationResult = {
  missingRequired: string[];
  warnings: string[];
  keys: RuntimeKeyStatus[];
};

const OPTIONAL_RUNTIME_KEYS = [
  "DIRECT_URL",
  "GOOGLE_MAPS_API_KEY",
  "BRAVE_SEARCH_API_KEY",
  "SERPAPI_KEY",
  "EXA_API_KEY",
  "TAVILY_API_KEY",
  "FIRECRAWL_API_KEY",
  "OPENROUTER_API_KEY",
] as const;

function isConfigured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function hasAuthSecret() {
  return (
    isConfigured("AUTH_SECRET") ||
    isConfigured("JWT_SECRET")
  );
}

function getRequiredStartupKeys() {
  return [
    {
      name: "DATABASE_URL",
      configured: isConfigured("DATABASE_URL"),
      requiredAtStartup: true,
    },
    {
      name: "AUTH_SECRET | JWT_SECRET",
      configured: hasAuthSecret(),
      requiredAtStartup: true,
    },
    {
      name: "CRON_SECRET",
      configured: isConfigured("CRON_SECRET"),
      requiredAtStartup: true,
    },
    {
      name: "DASHSCOPE_API_KEY",
      configured: isConfigured("DASHSCOPE_API_KEY"),
      requiredAtStartup: true,
    },
  ] satisfies RuntimeKeyStatus[];
}

export function getRuntimeKeyStatus(): RuntimeKeyStatus[] {
  const requiredKeys = getRequiredStartupKeys();
  const optionalKeys = OPTIONAL_RUNTIME_KEYS.map<RuntimeKeyStatus>((name) => ({
    name,
    configured: isConfigured(name),
    requiredAtStartup: false,
  }));

  return [...requiredKeys, ...optionalKeys];
}

export function validateStartupEnv(): StartupValidationResult {
  const keys = getRuntimeKeyStatus();

  return {
    keys,
    missingRequired: keys
      .filter((item) => item.requiredAtStartup && !item.configured)
      .map((item) => item.name),
    warnings: keys
      .filter((item) => !item.requiredAtStartup && !item.configured)
      .map((item) => item.name),
  };
}

export function assertStartupEnv() {
  const validation = validateStartupEnv();

  if (validation.missingRequired.length === 0) {
    return validation;
  }

  throw new Error(
    [
      "Startup environment validation failed.",
      `Missing required keys: ${validation.missingRequired.join(", ")}`,
      "Add the missing environment variables before starting or building the app.",
    ].join(" "),
  );
}
