import {SUPPORTED_VERSIONS, type A2UIVersion, type ProviderId, type ProviderRuntimeConfig} from './types.js';

const SUPPORTED_PROVIDERS: ProviderId[] = ['auto', 'fallback', 'openai', 'gemini', 'claude'];

export function isA2UIVersion(value: unknown): value is A2UIVersion {
  return typeof value === 'string' && SUPPORTED_VERSIONS.includes(value as A2UIVersion);
}

export function parseVersion(value: unknown, fallback: A2UIVersion = 'v0.10'): A2UIVersion {
  if (value == null || value === '') return fallback;
  if (isA2UIVersion(value)) return value;
  throw new Error(`Unsupported A2UI version "${String(value)}". Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`);
}

export function parseProvider(value: unknown, fallback: ProviderId = 'auto'): ProviderId {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string' && SUPPORTED_PROVIDERS.includes(value as ProviderId)) {
    return value as ProviderId;
  }
  throw new Error(`Unsupported provider "${String(value)}". Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`);
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseRuntimeConfig(value: unknown): ProviderRuntimeConfig | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;
  const config: ProviderRuntimeConfig = {
    openaiApiKey: normalizeString(raw.openaiApiKey),
    geminiApiKey: normalizeString(raw.geminiApiKey),
    anthropicApiKey: normalizeString(raw.anthropicApiKey),
    openaiModel: normalizeString(raw.openaiModel),
    geminiModel: normalizeString(raw.geminiModel),
    anthropicModel: normalizeString(raw.anthropicModel),
    openaiBaseUrl: normalizeString(raw.openaiBaseUrl),
    anthropicVersion: normalizeString(raw.anthropicVersion),
  };

  const hasAny = Object.values(config).some((entry) => Boolean(entry));
  return hasAny ? config : undefined;
}
