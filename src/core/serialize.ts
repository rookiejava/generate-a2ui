import YAML from 'yaml';
import type {SourceFormat} from './types.js';
export function serializeMessages(messages: unknown[], format: SourceFormat = 'json'): string { return format === 'yaml' ? YAML.stringify(messages) : JSON.stringify(messages, null, 2); }
export function parseMessages(source: string): unknown[] { const trimmed = source.trim(); if (!trimmed) return []; const parsed = trimmed.startsWith('[') || trimmed.startsWith('{') ? JSON.parse(trimmed) : YAML.parse(trimmed); return Array.isArray(parsed) ? parsed : [parsed]; }
