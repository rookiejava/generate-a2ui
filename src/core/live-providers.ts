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

const GEMINI_OUTPUT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    messages: {
      type: 'ARRAY',
      items: {type: 'OBJECT'},
    },
  },
  required: ['messages'],
};


function getOpenAIModel(runtime?: ProviderRuntimeConfig): string {
  return runtime?.openaiModel ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
}

function getGeminiModel(runtime?: ProviderRuntimeConfig): string {
  return runtime?.geminiModel ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
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

async function readErrorDetail(response: Response): Promise<string> {
  const fallback = `${response.status}`;
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
      if (typeof detail === 'string' && detail.trim()) return `${response.status}: ${detail.trim()}`;
      return `${response.status}: ${text.slice(0, 240)}`;
    } catch {
      return `${response.status}: ${text.slice(0, 240)}`;
    }
  } catch {
    return fallback;
  }
}

async function callOpenAI(system: string, user: string, runtime?: ProviderRuntimeConfig): Promise<unknown[]> {
  const apiKey = runtime?.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is missing');

  const response = await fetch(`${runtime?.openaiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`, {
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
  return parseJson(payload.choices?.[0]?.message?.content ?? '');
}

async function callGemini(system: string, user: string, runtime?: ProviderRuntimeConfig): Promise<unknown[]> {
  const apiKey = runtime?.geminiApiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel(runtime)}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      system_instruction: {parts: [{text: system}]},
      contents: [{role: 'user', parts: [{text: user}]}],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_OUTPUT_SCHEMA,
      },
    }),
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error('Gemini request failed (' + detail + ')');
  }
  const payload: any = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? '';
  return parseJson(text);
}

async function callClaude(system: string, user: string, runtime?: ProviderRuntimeConfig): Promise<unknown[]> {
  const apiKey = runtime?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Claude API key is missing');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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





