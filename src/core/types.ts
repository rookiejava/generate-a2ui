export type A2UIVersion = 'v0.8' | 'v0.9' | 'v0.10';
export type SourceFormat = 'json' | 'yaml';
export type ProviderId = 'auto' | 'fallback' | 'openai' | 'gemini' | 'claude';
export const SUPPORTED_VERSIONS: A2UIVersion[] = ['v0.8', 'v0.9', 'v0.10'];

export interface ProviderRuntimeConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  openaiModel?: string;
  geminiModel?: string;
  anthropicModel?: string;
  openaiBaseUrl?: string;
  anthropicVersion?: string;
}

export interface ValidationIssue {
  instancePath: string;
  message: string;
  keyword?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface GenerateOptions {
  version: A2UIVersion;
  prompt: string;
  provider?: ProviderId;
  surfaceId?: string;
  format?: SourceFormat;
  runtime?: ProviderRuntimeConfig;
}

export interface GenerationOutput {
  version: A2UIVersion;
  prompt: string;
  requestedProvider: ProviderId;
  provider: ProviderId;
  providerReason: string;
  model?: string;
  messages: unknown[];
  serialized: string;
  validation: ValidationResult;
  usedModel: boolean;
}

export interface VersionAnalysis {
  version: A2UIVersion;
  summary: string[];
  rendererNotes: string[];
}
