import type {GenerateOptions, GenerationOutput} from './types.js';
import {generateFallbackMessages} from './fallback.js';
import {generateWithLiveProvider, getLiveProviderModel} from './live-providers.js';
import {resolveProvider} from './providers.js';
import {serializeMessages} from './serialize.js';
import {validateMessages} from './validator.js';

function issuesToLines(issues: {instancePath: string; message: string}[]): string[] {
  return issues.map((issue) => `${issue.instancePath}: ${issue.message}`);
}

export async function generateA2ui(options: GenerateOptions): Promise<GenerationOutput> {
  const surfaceId = options.surfaceId ?? 'main';
  const resolution = resolveProvider(options.provider ?? 'auto', options.runtime);

  let messages: unknown[];
  let actualProvider = resolution.effective;
  let usedModel = resolution.useModel;
  let providerReason = resolution.reason;
  let model = resolution.useModel ? getLiveProviderModel(resolution.effective, options.runtime) : undefined;

  if (resolution.useModel && resolution.effective !== 'fallback') {
    try {
      messages = await generateWithLiveProvider(resolution.effective, options.version, options.prompt, surfaceId, options.runtime);
      let validation = await validateMessages(options.version, messages);

      if (!validation.valid) {
        messages = await generateWithLiveProvider(
          resolution.effective,
          options.version,
          options.prompt,
          surfaceId,
          options.runtime,
          issuesToLines(validation.issues),
        );
        validation = await validateMessages(options.version, messages);
      }

      if (!validation.valid) {
        const summary = issuesToLines(validation.issues).slice(0, 5).join('; ');
        throw new Error(`Live provider output failed schema validation after retry (${summary})`);
      }

      return {
        version: options.version,
        prompt: options.prompt,
        requestedProvider: resolution.requested,
        provider: actualProvider,
        providerReason,
        model,
        messages,
        serialized: serializeMessages(messages, options.format ?? 'json'),
        validation,
        usedModel,
      };
    } catch (error) {
      actualProvider = 'fallback';
      usedModel = false;
      model = undefined;
      const detail = error instanceof Error ? error.message : 'Unknown runtime error';
      providerReason = `Live call to ${resolution.effective} failed at runtime (${detail}); fallback generator was used`;
    }
  }

  messages = generateFallbackMessages(options.version, options.prompt, surfaceId);
  const validation = await validateMessages(options.version, messages);

  return {
    version: options.version,
    prompt: options.prompt,
    requestedProvider: resolution.requested,
    provider: actualProvider,
    providerReason,
    model,
    messages,
    serialized: serializeMessages(messages, options.format ?? 'json'),
    validation,
    usedModel,
  };
}




