import type {GenerateOptions, GenerationOutput} from './types.js';
import {generateFallbackMessages} from './fallback.js';
import {generateWithLiveProvider} from './live-providers.js';
import {resolveProvider} from './providers.js';
import {serializeMessages} from './serialize.js';
import {validateMessages} from './validator.js';
function issuesToLines(issues: {instancePath: string; message: string}[]): string[] { return issues.map((issue) => `${issue.instancePath}: ${issue.message}`); }
export async function generateA2ui(options: GenerateOptions): Promise<GenerationOutput> {
  const surfaceId = options.surfaceId ?? 'main';
  const provider = resolveProvider(options.provider ?? 'auto');
  let messages: unknown[];
  let actualProvider = provider.effective;
  let usedModel = provider.useModel;
  if (provider.useModel && provider.effective !== 'fallback') {
    try {
      messages = await generateWithLiveProvider(provider.effective, options.version, options.prompt, surfaceId);
      let validation = await validateMessages(options.version, messages);
      if (!validation.valid) {
        messages = await generateWithLiveProvider(provider.effective, options.version, options.prompt, surfaceId, issuesToLines(validation.issues));
        validation = await validateMessages(options.version, messages);
      }
      return { version: options.version, prompt: options.prompt, provider: actualProvider, messages, serialized: serializeMessages(messages, options.format ?? 'json'), validation, usedModel };
    } catch {
      actualProvider = 'fallback';
      usedModel = false;
    }
  }
  messages = generateFallbackMessages(options.version, options.prompt, surfaceId);
  const validation = await validateMessages(options.version, messages);
  return { version: options.version, prompt: options.prompt, provider: actualProvider, messages, serialized: serializeMessages(messages, options.format ?? 'json'), validation, usedModel };
}
