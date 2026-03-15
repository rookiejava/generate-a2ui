import type {A2UIVersion, GenerationOutput, ProviderId, ValidationResult, VersionAnalysis} from '../../src/core/types';

export interface PreviewDocument {
  surfaceId: string;
  version: A2UIVersion;
  theme: Record<string, string>;
  data: Record<string, unknown>;
  components: Record<string, Record<string, unknown>>;
  rootId: string;
  functionCalls: unknown[];
}

export interface RuntimeProviderInput {
  openaiApiKey?: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  openaiModel?: string;
  geminiModel?: string;
  anthropicModel?: string;
  openaiBaseUrl?: string;
  anthropicVersion?: string;
}

async function parseJsonOrText(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await parseJsonOrText(response);

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.error
      ? String(payload.error)
      : typeof payload === 'string'
        ? payload
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchAnalysis(): Promise<{versions: VersionAnalysis[]; providers: ProviderId[]}> {
  return requestJson('/api/analysis');
}

export async function generate(
  prompt: string,
  version: A2UIVersion,
  provider: ProviderId,
  runtime?: RuntimeProviderInput,
): Promise<GenerationOutput> {
  return requestJson('/api/generate', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({prompt, version, provider, runtime}),
  });
}

export async function validate(version: A2UIVersion, source: string): Promise<{validation: ValidationResult; preview: PreviewDocument}> {
  return requestJson('/api/validate', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({version, source}),
  });
}
