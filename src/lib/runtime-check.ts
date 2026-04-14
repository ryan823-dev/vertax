import {
  getRuntimeKeyStatus,
  validateStartupEnv,
  type RuntimeKeyStatus,
} from "@/lib/startup-env";

export function getRuntimeHealthSnapshot() {
  const validation = validateStartupEnv();
  const keyStatuses = validation.keys;

  return {
    nodeEnv: process.env.NODE_ENV || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "unknown",
    configuredKeys: keyStatuses.filter((key) => key.configured).length,
    missingKeys: keyStatuses.filter((key) => !key.configured).map((key) => key.name),
    missingRequiredKeys: validation.missingRequired,
    warnings: validation.warnings,
    keys: keyStatuses,
  };
}

export { getRuntimeKeyStatus };
export type { RuntimeKeyStatus };
