import type {A2UIVersion} from './types.js';
import {getAllVersionAnalyses} from './analysis.js';
import {readVersionFile} from './loader.js';

function outputContract(version: A2UIVersion, surfaceId: string): string[] {
  if (version === 'v0.8') {
    return [
      'Output contract (strict):',
      '- Return exactly one JSON object: {"messages": [...]}.',
      '- messages MUST be an array of server-to-client message objects.',
      '- The first message MUST include beginRendering with surfaceId and root.',
      '- A following message MUST include surfaceUpdate with components.',
      '- Optional dataModelUpdate is allowed when needed.',
      '- Do NOT return components-only arrays. Do NOT return {} entries.',
      '- Every message object must use valid v0.8 keys only.',
      `- surfaceId must be "${surfaceId}" unless explicitly requested otherwise.`,
    ];
  }

  return [
    'Output contract (strict):',
    '- Return exactly one JSON object: {"messages": [...]}.',
    '- messages MUST be an array of server-to-client message objects.',
    '- Include at least these message types in order:',
    '  1) {"version":"' + version + '","createSurface":{...}}',
    '  2) {"version":"' + version + '","updateComponents":{...}}',
    '- Optional: {"version":"' + version + '","updateDataModel":{...}}',
    '- Every message object MUST include "version":"' + version + '".',
    '- Do NOT return components-only arrays. Do NOT return {} entries.',
    '- Do NOT wrap in markdown. Return pure JSON only.',
    `- surfaceId must be "${surfaceId}" unless explicitly requested otherwise.`,
  ];
}

export async function buildSystemPrompt(version: A2UIVersion): Promise<string> {
  const analysis = getAllVersionAnalyses().find((entry) => entry.version === version);
  const protocol = await readVersionFile(version, 'docs/a2ui_protocol.md').catch(() => '');
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
    protocol ? 'Protocol excerpt:' : 'Protocol excerpt: (unavailable in runtime bundle; using schema/rules guidance)',
    protocol ? protocol.slice(0, 6000) : '',
    rules ? `\nCatalog rules:\n${rules.slice(0, 2500)}` : '',
  ].filter(Boolean).join('\n');
}

export function buildUserPrompt(prompt: string, version: A2UIVersion, surfaceId = 'main', previousIssues: string[] = []): string {
  return [
    `Target version: ${version}`,
    `Surface id: ${surfaceId}`,
    '',
    ...outputContract(version, surfaceId),
    '',
    'User request:',
    prompt,
    previousIssues.length > 0 ? `\nValidation issues from previous attempt:\n${previousIssues.map((issue) => `- ${issue}`).join('\n')}` : '',
    '',
    'Final response must be one JSON object with shape {"messages": [...]}.',
  ].filter(Boolean).join('\n');
}
