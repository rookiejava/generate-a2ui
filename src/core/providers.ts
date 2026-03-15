import type {ProviderId} from './types.js';
export interface ProviderResolution { requested: ProviderId; effective: ProviderId; useModel: boolean; reason: string; }
function hasEnv(name: string): boolean { return Boolean(process.env[name] && String(process.env[name]).trim()); }
export function resolveProvider(requested: ProviderId = 'auto'): ProviderResolution {
  if (requested === 'fallback') return { requested, effective: 'fallback', useModel: false, reason: 'explicit fallback' };
  if (requested === 'openai' && hasEnv('OPENAI_API_KEY')) return { requested, effective: 'openai', useModel: false, reason: 'adapter placeholder, falling back in current build' };
  if (requested === 'gemini' && hasEnv('GEMINI_API_KEY')) return { requested, effective: 'gemini', useModel: false, reason: 'adapter placeholder, falling back in current build' };
  if (requested === 'claude' && hasEnv('ANTHROPIC_API_KEY')) return { requested, effective: 'claude', useModel: false, reason: 'adapter placeholder, falling back in current build' };
  if (requested === 'auto') {
    if (hasEnv('OPENAI_API_KEY')) return { requested, effective: 'openai', useModel: false, reason: 'auto matched openai, adapter placeholder so fallback used' };
    if (hasEnv('GEMINI_API_KEY')) return { requested, effective: 'gemini', useModel: false, reason: 'auto matched gemini, adapter placeholder so fallback used' };
    if (hasEnv('ANTHROPIC_API_KEY')) return { requested, effective: 'claude', useModel: false, reason: 'auto matched claude, adapter placeholder so fallback used' };
  }
  return { requested, effective: 'fallback', useModel: false, reason: 'no live provider configured' };
}
