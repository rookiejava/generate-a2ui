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

function normalizeLegacyComponent(component: unknown): unknown {
  if (!isObject(component) || typeof component.id !== 'string' || !isObject(component.component)) return component;

  const entries = Object.entries(component.component);
  if (entries.length !== 1) return component;
  const [kind, props] = entries[0];
  if (!isObject(props)) return component;

  if (kind === 'Image') {
    const nextProps = {...props};
    if (typeof nextProps.imageUrl === 'string' && !isObject(nextProps.url)) {
      nextProps.url = {literalString: nextProps.imageUrl};
    } else if (typeof nextProps.url === 'string') {
      nextProps.url = {literalString: nextProps.url};
    }
    delete nextProps.imageUrl;
    return {...component, component: {Image: nextProps}};
  }

  if (kind === 'Badge') {
    const text = firstStringField(props as Record<string, unknown>, ['text', 'label', 'title', 'content', 'message', 'value']);
    return {
      ...component,
      component: {
        Text: {
          text: {literalString: text ?? ''},
          usageHint: 'caption',
        },
      },
    };
  }

  return component;
}

function normalizeLegacyLiveMessages(messages: unknown[]): unknown[] {
  return messages.map((entry) => {
    if (!isObject(entry)) return entry;
    if (!isObject(entry.surfaceUpdate) || !Array.isArray(entry.surfaceUpdate.components)) return entry;
    return {
      ...entry,
      surfaceUpdate: {
        ...entry.surfaceUpdate,
        components: entry.surfaceUpdate.components.map((component: unknown) => normalizeLegacyComponent(component)),
      },
    };
  });
}

function cloneObject(value: unknown): Record<string, unknown> | null {
  return isObject(value) ? {...value} : null;
}

function toComponentId(value: unknown): string | null {
  return isObject(value) && typeof value.id === 'string' ? value.id : null;
}

function firstStringField(node: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (typeof node[key] === 'string' && String(node[key]).trim()) return String(node[key]);
  }
  return null;
}

function normalizeTextVariant(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const variant = value.toLowerCase();
  if (['h1', 'h2', 'h3', 'body', 'caption'].includes(variant)) return variant;
  if (variant === 'h4' || variant === 'h5' || variant === 'h6') return 'h3';
  if (variant === 'button' || variant === 'label' || variant === 'badge') return 'caption';
  return 'body';
}

function flattenInlineComponents(components: unknown[]): Record<string, unknown>[] {
  const flattened: Record<string, unknown>[] = [];
  let syntheticId = 0;

  const visit = (input: unknown): string | null => {
    const node = cloneObject(input);
    if (!node) return null;

    const id = typeof node.id === 'string' && node.id.trim() ? node.id : `generated_${++syntheticId}`;
    node.id = id;

    if (typeof node.discriminator === 'string' && typeof node.component !== 'string') {
      node.component = node.discriminator;
    }
    delete node.discriminator;

    if (typeof node.component === 'string') {
      const normalizedComponent = node.component.toLowerCase();
      if (['label', 'span', 'paragraph', 'heading', 'title', 'message', 'description', 'caption', 'subtitle', 'body'].includes(normalizedComponent)) {
        node.component = 'Text';
      } else if (normalizedComponent === 'badge') {
        node.component = 'Text';
      } else if (normalizedComponent === 'textbutton') {
        node.component = 'Button';
      }
    } else if (firstStringField(node, ['text', 'label', 'title', 'content', 'message', 'value']) && !Array.isArray(node.children) && !node.child) {
      node.component = 'Text';
    }

    if (Array.isArray(node.children)) {
      node.children = node.children.map((child) => {
        const childId = visit(child);
        return childId ?? child;
      });
    }

    for (const key of ['child', 'content', 'trigger'] as const) {
      const nestedId = visit(node[key]);
      if (nestedId) node[key] = nestedId;
    }

    if (Array.isArray(node.tabs)) {
      node.tabs = node.tabs.map((tab) => {
        if (!isObject(tab)) return tab;
        const childId = visit(tab.child);
        return childId ? {...tab, child: childId} : tab;
      });
    }

    if (node.component === 'Button' && typeof node.label === 'string' && !node.child) {
      const labelId = `${id}_label`;
      flattened.push({id: labelId, component: 'Text', text: node.label, variant: 'body'});
      node.child = labelId;
      delete node.label;
    }

    if (node.component === 'Button' && typeof node.text === 'string' && !node.child) {
      const labelId = `${id}_label`;
      flattened.push({id: labelId, component: 'Text', text: node.text, variant: 'body'});
      node.child = labelId;
      delete node.text;
    }

    if (node.component === 'Button' && !node.child) {
      const buttonText = firstStringField(node, ['label', 'text', 'title', 'content', 'message', 'value']);
      if (buttonText) {
        const labelId = `${id}_label`;
        flattened.push({id: labelId, component: 'Text', text: buttonText, variant: 'body'});
        node.child = labelId;
        delete node.label;
        delete node.text;
        delete node.title;
        delete node.content;
        delete node.message;
        delete node.value;
      }
    }

    if (node.component === 'Text') {
      const textValue = firstStringField(node, ['text', 'label', 'title', 'content', 'message', 'value']);
      if (textValue) {
        node.text = textValue;
        delete node.label;
        delete node.title;
        delete node.content;
        delete node.message;
        delete node.value;
      }
      node.variant = normalizeTextVariant(node.variant);
    }

    if (node.component === 'Button' && isObject(node.action) && typeof node.action.name === 'string' && !isObject(node.action.event)) {
      node.action = {event: {name: node.action.name}};
    }

    delete node.style;

    flattened.push(node);
    return id;
  };

  for (const component of components) visit(component);
  return flattened;
}

function normalizeLiveMessages(version: GenerateOptions['version'], surfaceId: string, messages: unknown[]): unknown[] {
  if (version === 'v0.8') return normalizeLegacyLiveMessages(messages);

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

    if (isObject(next.createSurface)) {
      next.createSurface = {
        catalogId,
        sendDataModel: true,
        ...next.createSurface,
        surfaceId: typeof next.createSurface.surfaceId === 'string' ? next.createSurface.surfaceId : surfaceId,
      };
    }
    if (isObject(next.updateComponents) && !('surfaceId' in next.updateComponents)) {
      next.updateComponents = {...next.updateComponents, surfaceId};
    }
    if (isObject(next.updateDataModel) && !('surfaceId' in next.updateDataModel)) {
      next.updateDataModel = {...next.updateDataModel, surfaceId};
    }

    if (isObject(next.updateComponents) && Array.isArray(next.updateComponents.components)) {
      next.updateComponents = {
        ...next.updateComponents,
        components: flattenInlineComponents(next.updateComponents.components),
      };
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

      if (!validation.valid && resolution.effective !== 'gemini') {
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
