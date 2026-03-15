import type {ProviderId, ProviderRuntimeConfig} from './types.js';

export interface ProviderResolution {
  requested: ProviderId;
  effective: ProviderId;
  useModel: boolean;
  reason: string;
}

function hasConfigured(raw: unknown): boolean {
  return typeof raw === 'string' && raw.trim().length > 0;
}

function keyAvailable(runtimeValue: unknown, envName: string): {ok: boolean; source: 'request' | 'env' | 'none'} {
  if (hasConfigured(runtimeValue)) return {ok: true, source: 'request'};
  if (hasConfigured(process.env[envName])) return {ok: true, source: 'env'};
  return {ok: false, source: 'none'};
}

function liveProviderFor(requested: ProviderId, runtime?: ProviderRuntimeConfig): ProviderResolution | null {
  if (requested === 'openai') {
    const availability = keyAvailable(runtime?.openaiApiKey, 'OPENAI_API_KEY');
    if (availability.ok) return {
      requested,
      effective: 'openai',
      useModel: true,
      reason: availability.source === 'request' ? 'request OpenAI key is configured' : 'OPENAI_API_KEY is configured',
    };
  }

  if (requested === 'gemini') {
    const availability = keyAvailable(runtime?.geminiApiKey, 'GEMINI_API_KEY');
    if (availability.ok) return {
      requested,
      effective: 'gemini',
      useModel: true,
      reason: availability.source === 'request' ? 'request Gemini key is configured' : 'GEMINI_API_KEY is configured',
    };
  }

  if (requested === 'claude') {
    const availability = keyAvailable(runtime?.anthropicApiKey, 'ANTHROPIC_API_KEY');
    if (availability.ok) return {
      requested,
      effective: 'claude',
      useModel: true,
      reason: availability.source === 'request' ? 'request Claude key is configured' : 'ANTHROPIC_API_KEY is configured',
    };
  }

  return null;
}

export function resolveProvider(requested: ProviderId = 'auto', runtime?: ProviderRuntimeConfig): ProviderResolution {
  if (requested === 'fallback') {
    return {requested, effective: 'fallback', useModel: false, reason: 'explicit fallback'};
  }

  if (requested !== 'auto') {
    return liveProviderFor(requested, runtime) ?? {
      requested,
      effective: 'fallback',
      useModel: false,
      reason: `${requested} credentials are not configured`,
    };
  }

  return liveProviderFor('openai', runtime)
    ?? liveProviderFor('gemini', runtime)
    ?? liveProviderFor('claude', runtime)
    ?? {requested, effective: 'fallback', useModel: false, reason: 'no live provider credentials are configured'};
}
