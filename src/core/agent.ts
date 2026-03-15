import type {GenerateOptions, GenerationOutput} from './types.js';
import {generateFallbackMessages} from './fallback.js';
import {generateWithLiveProvider, getLiveProviderModel} from './live-providers.js';
import {resolveProvider} from './providers.js';
import {serializeMessages} from './serialize.js';
import {validateMessages} from './validator.js';

function issuesToLines(issues: {instancePath: string; message: string}[]): string[] {
  return issues.map((issue) => `${issue.instancePath}: ${issue.message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeComponent(value: unknown): value is Record<string, unknown> {
  return isObject(value) && typeof value.id === 'string' && value.component != null;
}

function normalizeLiveMessages(version: GenerateOptions['version'], surfaceId: string, messages: unknown[]): unknown[] {
  if (version === 'v0.8') return messages;

  const catalogId = `https://a2ui.org/specification/${version.replace('.', '_')}/basic_catalog.json`;
  const normalized = messages.map((entry) => (isObject(entry) ? {...entry} : entry));

  if (normalized.length > 0 && normalized.every((item) => looksLikeComponent(item))) {
    return [
      {version, createSurface: {surfaceId, catalogId, sendDataModel: true}},
      {version, updateComponents: {surfaceId, components: normalized}},
    ];
  }

  if (normalized.length === 1 && isObject(normalized[0]) && Array.isArray((normalized[0] as any).components)) {
    const components = (normalized[0] as any).components;
    if (components.every((item: unknown) => looksLikeComponent(item))) {
      return [
        {version, createSurface: {surfaceId, catalogId, sendDataModel: true}},
        {version, updateComponents: {surfaceId, components}},
      ];
    }
  }

  return normalized.map((entry) => {
    if (!isObject(entry)) return entry;

    const next = {...entry} as Record<string, unknown>;
    if (!('version' in next)) next.version = version;

    if (isObject(next.createSurface) && !('surfaceId' in next.createSurface)) {
      next.createSurface = {...next.createSurface, surfaceId};
    }
    if (isObject(next.updateComponents) && !('surfaceId' in next.updateComponents)) {
      next.updateComponents = {...next.updateComponents, surfaceId};
    }
    if (isObject(next.updateDataModel) && !('surfaceId' in next.updateDataModel)) {
      next.updateDataModel = {...next.updateDataModel, surfaceId};
    }

    return next;
  });
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
      messages = normalizeLiveMessages(options.version, surfaceId, messages);
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
        messages = normalizeLiveMessages(options.version, surfaceId, messages);
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
