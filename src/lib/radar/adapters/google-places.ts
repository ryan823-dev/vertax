// ==================== Google Places Adapter ====================
// Google Maps Places API 适配器，用于发现目标公司

import type { 
  RadarAdapter, 
  RadarSearchQuery, 
  RadarSearchResult, 
  NormalizedCandidate,
  HealthStatus,
  AdapterFeatures,
  AdapterConfig,
} from './types';

// ==================== Google Places API 类型 ====================

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  types?: string[];
  business_status?: string;
  opening_hours?: { open_now?: boolean };
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  url?: string; // Google Maps URL
}

interface PlaceDetailsResult extends PlaceResult {
  editorial_summary?: { overview: string };
  reviews?: Array<{ text: string; rating: number }>;
}

interface TextSearchResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
  error_message?: string;
}

interface PlaceDetailsResponse {
  result: PlaceDetailsResult;
  status: string;
  error_message?: string;
}

// ==================== Google Places 适配器 ====================

export class GooglePlacesAdapter implements RadarAdapter {
  readonly sourceCode = 'google_places';
  readonly channelType = 'MAPS' as const;
  
  readonly supportedFeatures: AdapterFeatures = {
    supportsKeywordSearch: true,
    supportsCategoryFilter: true,
    supportsDateFilter: false,
    supportsRegionFilter: true,
    supportsPagination: true,
    supportsDetails: true,
    maxResultsPerQuery: 60, // 3 pages * 20
    rateLimit: { requests: 100, windowMs: 60000 },
  };

  private apiKey: string;
  private timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey || process.env.GOOGLE_MAPS_API_KEY || '';
    this.timeout = config.timeout || 30000;
  }

  async search(query: RadarSearchQuery): Promise<RadarSearchResult> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    // 构建搜索查询
    const searchText = this.buildSearchText(query);
    
    // 执行 Text Search
    const results = await this.textSearch(searchText, query);
    
    // 标准化结果
    const items = results.map(r => this.normalize(r));
    
    const duration = Date.now() - startTime;
    
    return {
      items,
      total: items.length,
      hasMore: false,
      metadata: {
        source: this.sourceCode,
        query,
        fetchedAt: new Date(),
        duration,
      },
      // Google Places: 无分页 token 时视为 exhausted
      isExhausted: true,
    };
  }

  /**
   * 构建搜索文本
   */
  private buildSearchText(query: RadarSearchQuery): string {
    const parts: string[] = [];
    
    // 关键词 - 只取前3个，避免查询过长
    if (query.keywords?.length) {
      const topKeywords = query.keywords.slice(0, 3);
      parts.push(topKeywords.join(' '));
    }
    
    // 行业/类型
    if (query.targetIndustries?.length) {
      parts.push(query.targetIndustries[0]);
    }
    
    // 公司类型
    if (query.companyTypes?.length) {
      const typeMap: Record<string, string> = {
        manufacturer: 'manufacturer factory',
        distributor: 'distributor supplier',
        service_provider: 'service company',
      };
      parts.push(typeMap[query.companyTypes[0]] || query.companyTypes[0]);
    }
    
    return parts.join(' ') || 'industrial company';
  }

  /**
   * Text Search API
   */
  private async textSearch(
    searchText: string, 
    query: RadarSearchQuery
  ): Promise<PlaceResult[]> {
    const params = new URLSearchParams({
      query: searchText,
      key: this.apiKey,
    });
    
    // 添加位置偏好
    if (query.locationBias) {
      params.set('location', `${query.locationBias.lat},${query.locationBias.lng}`);
      params.set('radius', String(query.locationBias.radius * 1000)); // km to m
    }
    
    // 添加国家/地区
    if (query.countries?.length === 1) {
      params.set('region', query.countries[0].toLowerCase());
    }
    
    // 只搜索商业场所
    params.set('type', 'establishment');
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { signal: AbortSignal.timeout(this.timeout) }
    );
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }
    
    const data: TextSearchResponse = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
    }
    
    return data.results || [];
  }

  /**
   * 获取详细信息
   */
  async getDetails(externalId: string): Promise<{
    externalId: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    description?: string;
    additionalInfo?: Record<string, unknown>;
  } | null> {
    if (!this.apiKey) return null;
    
    const params = new URLSearchParams({
      place_id: externalId,
      key: this.apiKey,
      fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,url,editorial_summary,rating,user_ratings_total,types,business_status,opening_hours',
    });
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
        { signal: AbortSignal.timeout(this.timeout) }
      );
      
      if (!response.ok) return null;
      
      const data: PlaceDetailsResponse = await response.json();
      
      if (data.status !== 'OK') return null;
      
      const place = data.result;
      
      return {
        externalId,
        phone: place.international_phone_number || place.formatted_phone_number,
        website: place.website,
        address: place.formatted_address,
        description: place.editorial_summary?.overview,
        additionalInfo: {
          rating: place.rating,
          reviewCount: place.user_ratings_total,
          types: place.types,
          businessStatus: place.business_status,
          googleMapsUrl: place.url,
        },
      };
    } catch (error) {
      console.error('Failed to get place details:', error);
      return null;
    }
  }

  normalize(raw: unknown): NormalizedCandidate {
    const place = raw as PlaceResult;
    
    // 从地址提取国家/城市
    const addressParts = place.formatted_address?.split(', ') || [];
    const country = addressParts.length > 0 ? addressParts[addressParts.length - 1] : undefined;
    const city = addressParts.length > 1 ? addressParts[addressParts.length - 2] : undefined;
    
    // 从 types 推断行业
    const industry = this.inferIndustry(place.types || []);
    
    return {
      externalId: place.place_id,
      sourceUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      displayName: place.name,
      candidateType: 'COMPANY',
      
      website: place.website,
      phone: place.international_phone_number || place.formatted_phone_number,
      address: place.formatted_address,
      country,
      city,
      industry,
      
      matchExplain: {
        channel: 'google_places',
        reasons: [
          `Google Maps POI`,
          place.rating ? `评分 ${place.rating}⭐ (${place.user_ratings_total} 评)` : undefined,
          place.business_status === 'OPERATIONAL' ? '营业中' : undefined,
        ].filter(Boolean) as string[],
      },
      
      rawData: {
        source: 'google_places',
        place_id: place.place_id,
        types: place.types,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        business_status: place.business_status,
        geometry: place.geometry,
      },
    };
  }

  /**
   * 从 Google place types 推断行业
   */
  private inferIndustry(types: string[]): string | undefined {
    const industryMap: Record<string, string> = {
      factory: '制造业',
      manufacturing: '制造业',
      industrial: '工业',
      electronics_store: '电子',
      hardware_store: '五金',
      car_dealer: '汽车',
      car_repair: '汽车服务',
      food: '食品',
      construction: '建筑',
      logistics: '物流',
      shipping: '物流',
      chemical: '化工',
      pharmaceutical: '医药',
      technology: '科技',
    };
    
    for (const type of types) {
      const normalizedType = type.toLowerCase().replace(/_/g, '');
      for (const [key, value] of Object.entries(industryMap)) {
        if (normalizedType.includes(key)) {
          return value;
        }
      }
    }
    
    return undefined;
  }

  async healthCheck(): Promise<HealthStatus> {
    if (!this.apiKey) {
      return {
        healthy: false,
        latency: 0,
        error: 'Google Maps API key not configured (GOOGLE_MAPS_API_KEY)',
      };
    }
    
    const startTime = Date.now();
    
    try {
      // 执行一个简单查询测试 API
      const params = new URLSearchParams({
        query: 'test company',
        key: this.apiKey,
      });
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      const data: TextSearchResponse = await response.json();
      const latency = Date.now() - startTime;
      
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        return { healthy: true, latency };
      }
      
      return {
        healthy: false,
        latency,
        error: `API error: ${data.status} - ${data.error_message || ''}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
