export type TargetRegionRecord = {
  region: string;
  countries?: string[];
  rationale?: string;
};

export type TargetRegionInput = string | (Partial<TargetRegionRecord> & { name?: string });

export function getTargetRegionName(region: TargetRegionInput): string {
  if (typeof region === "string") {
    return region.trim();
  }

  if (typeof region.region === "string" && region.region.trim().length > 0) {
    return region.region.trim();
  }

  if (typeof region.name === "string" && region.name.trim().length > 0) {
    return region.name.trim();
  }

  return "";
}

export function normalizeTargetRegions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const names = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        return getTargetRegionName(item as TargetRegionInput);
      }

      return "";
    })
    .filter((item): item is string => item.length > 0);

  return Array.from(new Set(names));
}
