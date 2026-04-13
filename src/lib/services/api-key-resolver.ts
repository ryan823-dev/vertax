import { prisma } from '@/lib/prisma';

const ENV_KEY_ALIASES: Record<string, string> = {
  brave_search: 'BRAVE_SEARCH_API_KEY',
  dashscope: 'DASHSCOPE_API_KEY',
  exa: 'EXA_API_KEY',
  firecrawl: 'FIRECRAWL_API_KEY',
  gemini: 'GEMINI_API_KEY',
  google_places: 'GOOGLE_MAPS_API_KEY',
  hunter: 'HUNTER_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  pdl: 'PDL_API_KEY',
  resend: 'RESEND_API_KEY',
  serper: 'SERPAPI_KEY',
  tavily: 'TAVILY_API_KEY',
};

function resolveEnvKey(service: string): string {
  return ENV_KEY_ALIASES[service] || `${service.toUpperCase()}_API_KEY`;
}

export async function resolveApiKey(service: string): Promise<string | null> {
  const normalizedService = service.trim().toLowerCase();
  const envKey = resolveEnvKey(normalizedService);
  const envValue = process.env[envKey];

  if (typeof envValue === 'string' && envValue.trim()) {
    return envValue.trim();
  }

  try {
    const config = await prisma.apiKeyConfig.findUnique({
      where: { service: normalizedService },
      select: {
        apiKey: true,
        isEnabled: true,
      },
    });

    if (config?.isEnabled && config.apiKey?.trim()) {
      return config.apiKey.trim();
    }
  } catch (error) {
    console.warn(`[api-key-resolver] Failed to resolve ${normalizedService}:`, error);
  }

  return null;
}
