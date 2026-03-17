import type {A2UIVersion, ProviderId, ProviderRuntimeConfig} from './types.js';
import {buildSystemPrompt, buildUserPrompt} from './prompts.js';

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    messages: {
      type: 'array',
      description: 'Ordered list of A2UI server-to-client messages.',
      items: {type: 'object'},
    },
  },
  required: ['messages'],
};

function getProviderTimeoutMs(): number {
  const parsed = Number(process.env.PROVIDER_TIMEOUT_MS ?? '45000');
  if (!Number.isFinite(parsed)) return 45000;
  return Math.max(5000, Math.min(55000, Math.trunc(parsed)));
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Request timeout after');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = getProviderTimeoutMs()): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout after ' + timeoutMs + 'ms');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function getOpenAIModel(runtime?: ProviderRuntimeConfig): string {
  return runtime?.openaiModel ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
}

function getGeminiModel(runtime?: ProviderRuntimeConfig): string {
  return runtime?.geminiModel ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
}

function getClaudeModel(runtime?: ProviderRuntimeConfig): string {
  return runtime?.anthropicModel ?? process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest';
}

export function getLiveProviderModel(provider: ProviderId, runtime?: ProviderRuntimeConfig): string | undefined {
  if (provider === 'openai') return getOpenAIModel(runtime);
  if (provider === 'gemini') return getGeminiModel(runtime);
  if (provider === 'claude') return getClaudeModel(runtime);
  return undefined;
}

function parseJson(text: string): unknown[] {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).messages)) return (parsed as any).messages;
  throw new Error('Model response was not a valid A2UI message list');
}

function previewRaw(text: string, max = 400): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '<empty>';
  return compact.length > max ? compact.slice(0, max) + '...' : compact;
}

function buildGeminiJsonRepairPrompt(user: string): string {
  return [
    user,
    '',
    'IMPORTANT RETRY INSTRUCTIONS:',
    '- Your previous answer was invalid JSON.',
    '- Return one valid JSON object only.',
    '- Do not include trailing commas.',
    '- Do not include markdown fences.',
    '- Ensure every array and object is properly closed.',
  ].join('\n');
}

async function readErrorDetail(response: Response): Promise<string> {
  const fallback = String(response.status);
  try {
    const text = await response.text();
    if (!text) return fallback;

    try {
      const payload = JSON.parse(text) as any;
      const detail =
        payload?.error?.message
        ?? payload?.error?.status
        ?? payload?.message
        ?? payload?.error;
      if (typeof detail === 'string' && detail.trim()) return response.status + ': ' + detail.trim();
      return response.status + ': ' + text.slice(0, 240);
    } catch {
      return response.status + ': ' + text.slice(0, 240);
    }
  } catch {
    return fallback;
  }
}

async function callOpenAI(system: string, user: string, runtime?: ProviderRuntimeConfig): Promise<unknown[]> {
  const apiKey = runtime?.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is missing');

  const response = await fetchWithTimeout(`${runtime?.openaiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(runtime),
      temperature: 0.2,
      messages: [
        {role: 'system', content: system},
        {role: 'user', content: user},
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'a2ui_message_bundle',
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error('OpenAI request failed (' + detail + ')');
  }

  const payload: any = await response.json();
  const raw = String(payload.choices?.[0]?.message?.content ?? '');
  try {
    return parseJson(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Invalid JSON payload';
    throw new Error('OpenAI parse failure (' + reason + '); raw=' + previewRaw(raw));
  }
}

async function requestGemini(endpoint: string, system: string, user: string): Promise<Response> {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: 'application/json',
  };

  return fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      system_instruction: {parts: [{text: system}]},
      contents: [{role: 'user', parts: [{text: user}]}],
      generationConfig,
    }),
  });
}

async function callGemini(system: string, user: string, runtime?: ProviderRuntimeConfig): Promise<unknown[]> {
  const apiKey = runtime?.geminiApiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel(runtime)}:generateContent?key=${apiKey}`;

  const requestAndParse = async (prompt: string): Promise<unknown[]> => {
    const response = await requestGemini(endpoint, system, prompt).catch((error) => {
      if (isTimeoutError(error)) throw error;
      throw error;
    });

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new Error('Gemini request failed (' + detail + ')');
    }

    const payload: any = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? '';
    try {
      return parseJson(text);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid JSON payload';
      throw new Error('Gemini parse failure (' + reason + '); raw=' + previewRaw(text));
    }
  };

  try {
    return await requestAndParse(user);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('Gemini parse failure')) throw error;
    return requestAndParse(buildGeminiJsonRepairPrompt(user)).catch((retryError) => {
      if (retryError instanceof Error) throw retryError;
      throw error;
    });
  }
}

async function callClaude(system: string, user: string, runtime?: ProviderRuntimeConfig): Promise<unknown[]> {
  const apiKey = runtime?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Claude API key is missing');

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': String(apiKey),
      'anthropic-version': runtime?.anthropicVersion ?? process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    },
    body: JSON.stringify({
      model: getClaudeModel(runtime),
      max_tokens: 8192,
      system,
      messages: [{role: 'user', content: user}],
      tools: [{
        name: 'emit_a2ui_messages',
        description: 'Return the final A2UI payload as JSON.',
        input_schema: OUTPUT_SCHEMA,
      }],
      tool_choice: {type: 'tool', name: 'emit_a2ui_messages'},
    }),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error('Claude request failed (' + detail + ')');
  }

  const payload: any = await response.json();
  const toolUse = payload.content?.find((item: any) => item.type === 'tool_use' && item.name === 'emit_a2ui_messages');
  if (!toolUse?.input) throw new Error('Claude did not return tool output');
  if (Array.isArray(toolUse.input.messages)) return toolUse.input.messages;
  throw new Error('Claude tool output did not include messages');
}

export async function generateWithLiveProvider(
  provider: ProviderId,
  version: A2UIVersion,
  prompt: string,
  surfaceId: string,
  runtime?: ProviderRuntimeConfig,
  previousIssues: string[] = [],
): Promise<unknown[]> {
  const system = await buildSystemPrompt(version);
  const user = buildUserPrompt(prompt, version, surfaceId, previousIssues);

  if (provider === 'openai') return callOpenAI(system, user, runtime);
  if (provider === 'gemini') return callGemini(system, user, runtime);
  if (provider === 'claude') return callClaude(system, user, runtime);

  throw new Error(`Unsupported live provider: ${provider}`);
}
