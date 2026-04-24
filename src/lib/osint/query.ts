import type { OSINTLayer } from './types';

const VALID_DEPTHS = new Set(['BASIC', 'STANDARD', 'DEEP'] as const);
const VALID_LAYERS = new Set<OSINTLayer>([
  'IDENTITY',
  'REGISTRATION',
  'ASSOCIATION',
  'RISK',
  'BUSINESS',
]);

export function normalizeInvestigationDepth(value: unknown): 'BASIC' | 'STANDARD' | 'DEEP' {
  if (typeof value !== 'string') {
    return 'STANDARD';
  }

  const normalized = value.trim().toUpperCase() as 'BASIC' | 'STANDARD' | 'DEEP';
  return VALID_DEPTHS.has(normalized) ? normalized : 'STANDARD';
}

export function normalizeInvestigationLayers(value: unknown): OSINTLayer[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : null))
    .filter((entry): entry is OSINTLayer => Boolean(entry) && VALID_LAYERS.has(entry as OSINTLayer));

  return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}
