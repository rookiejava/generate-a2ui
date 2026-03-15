import {generateA2ui} from '../src/core/agent.js';
import type {A2UIVersion, ProviderId} from '../src/core/types.js';

const provider = (process.argv[2] ?? 'openai') as ProviderId;
const version = (process.argv[3] ?? 'v0.10') as A2UIVersion;
const prompt = process.argv.slice(4).join(' ') || '로그인 화면 만들어줘';

async function main() {
  const startedAt = Date.now();
  const result = await generateA2ui({ provider, version, prompt, format: 'json' });
  const elapsedMs = Date.now() - startedAt;

  const summary = {
    providerRequested: provider,
    providerUsed: result.provider,
    usedModel: result.usedModel,
    version: result.version,
    valid: result.validation.valid,
    issues: result.validation.issues,
    messageCount: result.messages.length,
    elapsedMs,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (!result.validation.valid) {
    process.stderr.write('Generated payload failed validation.\n');
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${result.serialized}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
