import {SUPPORTED_VERSIONS, type A2UIVersion, type ProviderId} from './types.js';

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
