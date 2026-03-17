import type {A2UIVersion} from './types.js';
import {getAllVersionAnalyses} from './analysis.js';
import {readVersionFile} from './loader.js';

function outputExamples(version: A2UIVersion, surfaceId: string): string[] {
  if (version === 'v0.8') {
    return [
      'Canonical response example:',
      '```json',
      '{"messages":[',
      `  {"beginRendering":{"surfaceId":"${surfaceId}","root":"root","styles":{"primaryColor":"#1d4ed8"}}},`,
      '  {"surfaceUpdate":{"surfaceId":"main","components":[',
      '    {"id":"root","component":{"Column":{"children":{"explicitList":["title","confirm"]}}}},',
      '    {"id":"title","component":{"Text":{"text":{"literalString":"경고"}}}},',
      '    {"id":"confirm_label","component":{"Text":{"text":{"literalString":"확인"}}}},',
      '    {"id":"confirm","component":{"Button":{"child":"confirm_label","action":{"name":"confirm"}}}}',
      '  ]}}',
      ']}',
      '```',
    ];
  }

  return [
    'Canonical response example:',
    '```json',
    '{"messages":[',
    `  {"version":"${version}","createSurface":{"surfaceId":"${surfaceId}","catalogId":"https://a2ui.org/specification/${version.replace('.', '_')}/basic_catalog.json","sendDataModel":true}},`,
    `  {"version":"${version}","updateComponents":{"surfaceId":"${surfaceId}","components":[`,
    '    {"id":"root","component":"Column","children":["title","message","confirm"]},',
    '    {"id":"title","component":"Text","text":"경고","variant":"h3"},',
    '    {"id":"message","component":"Text","text":"계속 진행할지 선택해 주세요.","variant":"body"},',
    '    {"id":"confirm","component":"Button","child":"confirm_label","action":{"event":{"name":"confirm"}},"variant":"primary"},',
    '    {"id":"confirm_label","component":"Text","text":"확인","variant":"body"}',
    '  ]}}',
    ']}',
    '```',
    'Invalid patterns to avoid:',
    '- Do NOT use "discriminator". Use "component".',
    '- Do NOT nest child component objects inside "children", "child", "content", or "trigger". Reference component ids only.',
    '- Do NOT use {"label":"확인"} directly on Button. Create a Text component and point Button.child to that id.',
    '- Do NOT use {"action":{"name":"confirm"}} on modern versions. Use {"action":{"event":{"name":"confirm"}}}.',
  ];
}

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
      '- Components must be declared as separate entries in the surfaceUpdate.components array.',
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
    '- updateComponents.components MUST be a flat array of component objects.',
    '- Layout relationships must use component ids in children/child/content/trigger, not nested objects.',
    '- Do NOT wrap in markdown. Return pure JSON only.',
    `- surfaceId must be "${surfaceId}" unless explicitly requested otherwise.`,
  ];
}

export async function buildSystemPrompt(version: A2UIVersion): Promise<string> {
  const analysis = getAllVersionAnalyses().find((entry) => entry.version === version);
  const rules = version === 'v0.8' ? '' : await readVersionFile(version, 'json/basic_catalog_rules.txt').catch(() => '');
  const trimmedRules = rules
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 16)
    .join('\n');

  return [
    `You generate valid ${version} A2UI server-to-client message lists.`,
    'Return only JSON for the final result.',
    'Do not include markdown fences or explanations.',
    'Generate a complete, practical UI matching the user request.',
    'Use surfaceId "main" unless instructed otherwise.',
    version === 'v0.8'
      ? 'Use v0.8 wrapper-style component objects and beginRendering.'
      : 'Use the modern "component" field, not "discriminator", and ensure the root component id is "root".',
    '',
    'Version notes:',
    ...(analysis?.summary ?? []).map((line) => `- ${line}`),
    '',
    'Core rules:',
    '- Use only A2UI message keys and catalog component names.',
    '- Prefer flat component arrays with explicit ids.',
    '- Link layout using component ids only.',
    '- Buttons should reference a Text component via child.',
    '- Keep output compact and deterministic.',
    trimmedRules ? '\nCatalog rules:\n' + trimmedRules : '',
  ].filter(Boolean).join('\n');
}

export function buildUserPrompt(prompt: string, version: A2UIVersion, surfaceId = 'main', previousIssues: string[] = []): string {
  return [
    `Target version: ${version}`,
    `Surface id: ${surfaceId}`,
    '',
    ...outputContract(version, surfaceId),
    '',
    ...outputExamples(version, surfaceId),
    '',
    'User request:',
    prompt,
    previousIssues.length > 0 ? `\nValidation issues from previous attempt:\n${previousIssues.slice(0, 3).map((issue) => `- ${issue}`).join('\n')}` : '',
    '',
    'Final response must be one JSON object with shape {"messages": [...]}.',
  ].filter(Boolean).join('\n');
}
