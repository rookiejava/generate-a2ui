import type {ProviderId} from './types.js';
export interface ProviderResolution { requested: ProviderId; effective: ProviderId; useModel: boolean; reason: string; }
function hasEnv(name: string): boolean { return Boolean(process.env[name] && String(process.env[name]).trim()); }
function liveProviderFor(requested: ProviderId): ProviderResolution | null {
  if (requested === 'openai' && hasEnv('OPENAI_API_KEY')) return { requested, effective: 'openai', useModel: true, reason: 'OPENAI_API_KEY is configured' };
  if (requested === 'gemini' && hasEnv('GEMINI_API_KEY')) return { requested, effective: 'gemini', useModel: true, reason: 'GEMINI_API_KEY is configured' };
  if (requested === 'claude' && hasEnv('ANTHROPIC_API_KEY')) return { requested, effective: 'claude', useModel: true, reason: 'ANTHROPIC_API_KEY is configured' };
  return null;
}
export function resolveProvider(requested: ProviderId = 'auto'): ProviderResolution {
  if (requested === 'fallback') return { requested, effective: 'fallback', useModel: false, reason: 'explicit fallback' };
  if (requested !== 'auto') return liveProviderFor(requested) ?? { requested, effective: 'fallback', useModel: false, reason: `${requested} credentials are not configured` };
  return liveProviderFor('openai') ?? liveProviderFor('gemini') ?? liveProviderFor('claude') ?? { requested, effective: 'fallback', useModel: false, reason: 'no live provider credentials are configured' };
}
