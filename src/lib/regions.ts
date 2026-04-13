export type TargetRegionRecord = {
  region: string;
  countries?: string[];
  rationale?: string;
};

export type TargetRegionInput = string | (Partial<TargetRegionRecord> & { name?: string });

/**
 * 中国境内区域黑名单 - 这些区域不能作为出海目标市场
 * VertaX 是出海获客系统，只服务中国企业开拓海外客户
 */
const CHINA_REGIONS = new Set([
  // 国家级
  '中国',
  'China',
  '中华人民共和国',
  'PRC',
  // 大区级
  '华东',
  '华南',
  '华北',
  '华中',
  '西南',
  '西北',
  '东北',
  // 经济区
  '长三角',
  '珠三角',
  '京津冀',
  '环渤海',
  '大湾区',
  // 省份级（常见简称）
  '广东',
  '浙江',
  '江苏',
  '山东',
  '福建',
  '上海',
  '北京',
  '深圳',
  '广州',
  '杭州',
  '南京',
  '苏州',
]);

/**
 * 检查区域名是否为中国境内区域
 */
export function isChinaRegion(regionName: string): boolean {
  const normalized = regionName.trim().toLowerCase();
  
  // 直接匹配黑名单
  if (CHINA_REGIONS.has(regionName.trim())) {
    return true;
  }
  
  // 小写匹配（容错）- 使用 Array.from 避免 Set 迭代问题
  const chinaRegionsList = Array.from(CHINA_REGIONS);
  for (const chinaRegion of chinaRegionsList) {
    if (chinaRegion.toLowerCase() === normalized) {
      return true;
    }
  }
  
  // 包含关键词匹配（如"中国华南"、"中国大陆"等）
  const chinaKeywords = ['中国', 'china', '中国大陆', '国内', '内陆'];
  for (const keyword of chinaKeywords) {
    if (normalized.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

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
    .filter((item): item is string => item.length > 0)
    // v2.0: 强制排除中国境内区域 - 出海获客系统只服务海外市场
    .filter((item) => !isChinaRegion(item));

  return Array.from(new Set(names));
}
