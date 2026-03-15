import type {A2UIVersion, ProviderId} from './types.js';
import {buildSystemPrompt, buildUserPrompt} from './prompts.js';
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    messages: {
      type: 'array',
      description: 'Ordered list of A2UI server-to-client messages.',
      items: { type: 'object' }
    }
  },
  required: ['messages']
};
function getOpenAIModel(): string { return process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'; }
function getGeminiModel(): string { return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'; }
function getClaudeModel(): string { return process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest'; }
function parseJson(text: string): unknown[] { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed; if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).messages)) return (parsed as any).messages; throw new Error('Model response was not a valid A2UI message list'); }
async function callOpenAI(system: string, user: string): Promise<unknown[]> {
  const response = await fetch(`${process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: getOpenAIModel(), temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_schema', json_schema: { name: 'a2ui_message_bundle', strict: true, schema: OUTPUT_SCHEMA } } }) });
  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
  const payload: any = await response.json();
  return parseJson(payload.choices?.[0]?.message?.content ?? '');
}
async function callGemini(system: string, user: string): Promise<unknown[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: OUTPUT_SCHEMA } }) });
  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
  const payload: any = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? '';
  return parseJson(text);
}
async function callClaude(system: string, user: string): Promise<unknown[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': String(process.env.ANTHROPIC_API_KEY ?? ''), 'anthropic-version': process.env.ANTHROPIC_VERSION ?? '2023-06-01' }, body: JSON.stringify({ model: getClaudeModel(), max_tokens: 8192, system, messages: [{ role: 'user', content: user }], tools: [{ name: 'emit_a2ui_messages', description: 'Return the final A2UI payload as JSON.', input_schema: OUTPUT_SCHEMA }], tool_choice: { type: 'tool', name: 'emit_a2ui_messages' } }) });
  if (!response.ok) throw new Error(`Claude request failed with status ${response.status}`);
  const payload: any = await response.json();
  const toolUse = payload.content?.find((item: any) => item.type === 'tool_use' && item.name === 'emit_a2ui_messages');
  if (!toolUse?.input) throw new Error('Claude did not return tool output');
  if (Array.isArray(toolUse.input.messages)) return toolUse.input.messages;
  throw new Error('Claude tool output did not include messages');
}
export async function generateWithLiveProvider(provider: ProviderId, version: A2UIVersion, prompt: string, surfaceId: string, previousIssues: string[] = []): Promise<unknown[]> {
  const system = await buildSystemPrompt(version);
  const user = buildUserPrompt(prompt, version, surfaceId, previousIssues);
  if (provider === 'openai') return callOpenAI(system, user);
  if (provider === 'gemini') return callGemini(system, user);
  if (provider === 'claude') return callClaude(system, user);
  throw new Error(`Unsupported live provider: ${provider}`);
}
