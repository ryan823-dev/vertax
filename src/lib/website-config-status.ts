export type WebsiteConfigStatus = "ready" | "inactive" | "pending_setup" | "incomplete";

export type WebsiteConfigStatusInput = {
  siteType?: string | null;
  isActive?: boolean | null;
  supabaseUrl?: string | null;
  functionName?: string | null;
  webhookUrl?: string | null;
  wpUrl?: string | null;
  wpUsername?: string | null;
  wpPassword?: string | null;
  pushSecret?: string | null;
};

export type WebsiteConfigStatusInfo = {
  status: WebsiteConfigStatus;
  statusLabel: string;
  statusMessage: string;
  isPublishReady: boolean;
  normalizedIsActive: boolean;
  missingFields: string[];
};

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function getMissingFields(config: WebsiteConfigStatusInput): string[] {
  switch (config.siteType) {
    case "supabase":
      return [
        !hasValue(config.supabaseUrl) ? "Supabase URL" : null,
        !hasValue(config.functionName) ? "Function Name" : null,
        !hasValue(config.pushSecret) ? "Push Secret" : null,
      ].filter((field): field is string => field !== null);
    case "nextjs":
      return [
        !hasValue(config.webhookUrl) ? "Webhook URL" : null,
        !hasValue(config.pushSecret) ? "Push Secret" : null,
      ].filter((field): field is string => field !== null);
    case "wordpress":
      return [
        !hasValue(config.wpUrl) ? "WordPress URL" : null,
        !hasValue(config.wpUsername) ? "WordPress Username" : null,
        !hasValue(config.wpPassword) ? "WordPress Application Password" : null,
      ].filter((field): field is string => field !== null);
    case "rest":
      return [
        !hasValue(config.webhookUrl) ? "Webhook URL" : null,
      ].filter((field): field is string => field !== null);
    default:
      return [];
  }
}

export function getWebsiteConfigStatus(config: WebsiteConfigStatusInput): WebsiteConfigStatusInfo {
  const siteType = config.siteType ?? "custom";

  if (siteType === "custom") {
    return {
      status: "pending_setup",
      statusLabel: "Pending Setup",
      statusMessage: "Choose a supported publishing type and complete the connection settings before enabling publishing.",
      isPublishReady: false,
      normalizedIsActive: false,
      missingFields: [],
    };
  }

  const missingFields = getMissingFields(config);
  if (missingFields.length > 0) {
    return {
      status: "incomplete",
      statusLabel: "Incomplete",
      statusMessage: `Finish the required fields before enabling publishing: ${missingFields.join(", ")}.`,
      isPublishReady: false,
      normalizedIsActive: false,
      missingFields,
    };
  }

  if (!config.isActive) {
    return {
      status: "inactive",
      statusLabel: "Disabled",
      statusMessage: "Publishing is configured but currently disabled.",
      isPublishReady: false,
      normalizedIsActive: false,
      missingFields: [],
    };
  }

  return {
    status: "ready",
    statusLabel: "Ready",
    statusMessage: "Publishing is fully configured and ready to use.",
    isPublishReady: true,
    normalizedIsActive: true,
    missingFields: [],
  };
}
