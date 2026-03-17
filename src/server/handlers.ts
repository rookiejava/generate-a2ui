import {getAllVersionAnalyses} from '../core/analysis.js';
import {generateA2ui} from '../core/agent.js';
import {parseProvider, parseRuntimeConfig, parseVersion} from '../core/input.js';
import {createPreviewDocument} from '../core/preview.js';
import {parseMessages} from '../core/serialize.js';
import {validateMessages} from '../core/validator.js';

export interface AnalysisResponse {
  versions: ReturnType<typeof getAllVersionAnalyses>;
  providers: Array<'auto' | 'fallback' | 'openai' | 'gemini' | 'claude'>;
  defaultCredentials: {
    openai: boolean;
    gemini: boolean;
    claude: boolean;
  };
}

function hasConfiguredEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

export function createAnalysisResponse(): AnalysisResponse {
  return {
    versions: getAllVersionAnalyses(),
    providers: ['auto', 'fallback', 'openai', 'gemini', 'claude'],
    defaultCredentials: {
      openai: hasConfiguredEnv('OPENAI_API_KEY'),
      gemini: hasConfiguredEnv('GEMINI_API_KEY'),
      claude: hasConfiguredEnv('ANTHROPIC_API_KEY'),
    },
  };
}

export async function handleGenerateRequest(body: any, debugRequested = false) {
  const version = parseVersion(body?.version);
  const provider = parseProvider(body?.provider, 'auto');
  const runtime = parseRuntimeConfig(body?.runtime);
  const prompt = String(body?.prompt ?? '');

  const result = await generateA2ui({
    version,
    provider,
    runtime,
    prompt,
    format: body?.format === 'yaml' ? 'yaml' : 'json',
  });

  if (!debugRequested) return result;

  return {
    ...result,
    debug: {
      requestedProvider: provider,
      activeProvider: result.provider,
      activeModel: result.model ?? null,
      usedModel: result.usedModel,
      promptChars: prompt.length,
    },
  };
}

export async function handleValidateRequest(body: any) {
  const version = parseVersion(body?.version);
  const messages = parseMessages(String(body?.source ?? '[]'));
  const validation = await validateMessages(version, messages);

  return {
    validation,
    preview: createPreviewDocument(version, messages as any[]),
  };
}
