import type {GenerateOptions, GenerationOutput} from './types.js';
import {generateFallbackMessages} from './fallback.js';
import {resolveProvider} from './providers.js';
import {serializeMessages} from './serialize.js';
import {validateMessages} from './validator.js';
export async function generateA2ui(options: GenerateOptions): Promise<GenerationOutput> {
  const surfaceId = options.surfaceId ?? 'main';
  const provider = resolveProvider(options.provider ?? 'auto');
  const messages = generateFallbackMessages(options.version, options.prompt, surfaceId);
  const validation = await validateMessages(options.version, messages);
  return { version: options.version, prompt: options.prompt, provider: provider.effective, messages, serialized: serializeMessages(messages, options.format ?? 'json'), validation, usedModel: provider.useModel };
}
