import type {A2UIVersion} from './types.js';
import {getAllVersionAnalyses} from './analysis.js';
import {readVersionFile} from './loader.js';
export async function buildSystemPrompt(version: A2UIVersion): Promise<string> {
  const analysis = getAllVersionAnalyses().find((entry) => entry.version === version);
  const protocol = await readVersionFile(version, 'docs/a2ui_protocol.md');
  const rules = version === 'v0.8' ? '' : await readVersionFile(version, 'json/basic_catalog_rules.txt').catch(() => '');
  return [
    `You generate valid ${version} A2UI server-to-client message lists.`,
    'Return only JSON for the final result.',
    'Do not include markdown fences or explanations.',
    'Generate a complete, practical UI matching the user request.',
    'Use surfaceId "main" unless instructed otherwise.',
    version === 'v0.8' ? 'Use v0.8 wrapper-style component objects and beginRendering.' : 'Use modern component discriminator objects and ensure the root component id is "root".',
    '',
    'Version notes:',
    ...(analysis?.summary ?? []).map((line) => `- ${line}`),
    '',
    'Protocol excerpt:',
    protocol.slice(0, 6000),
    rules ? `\nCatalog rules:\n${rules.slice(0, 2500)}` : '',
  ].filter(Boolean).join('\n');
}
export function buildUserPrompt(prompt: string, version: A2UIVersion, surfaceId = 'main', previousIssues: string[] = []): string {
  return [
    `Target version: ${version}`,
    `Surface id: ${surfaceId}`,
    'User request:',
    prompt,
    previousIssues.length > 0 ? `\nValidation issues from previous attempt:\n${previousIssues.map((issue) => `- ${issue}`).join('\n')}` : '',
    '\nReturn a single JSON object with shape {"messages": [...]}.',
  ].filter(Boolean).join('\n');
}
