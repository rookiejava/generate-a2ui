export type A2UIVersion = 'v0.8' | 'v0.9' | 'v0.10';
export type SourceFormat = 'json' | 'yaml';
export type ProviderId = 'auto' | 'fallback' | 'openai' | 'gemini' | 'claude';
export interface ValidationIssue { instancePath: string; message: string; keyword?: string; }
export interface ValidationResult { valid: boolean; issues: ValidationIssue[]; }
export interface GenerateOptions { version: A2UIVersion; prompt: string; provider?: ProviderId; surfaceId?: string; format?: SourceFormat; }
export interface GenerationOutput { version: A2UIVersion; prompt: string; provider: ProviderId; messages: unknown[]; serialized: string; validation: ValidationResult; usedModel: boolean; }
export interface VersionAnalysis { version: A2UIVersion; summary: string[]; rendererNotes: string[]; }
