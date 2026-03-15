const baseUrl = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? '').replace(/\/$/, '');
const provider = process.argv[3] ?? 'fallback';
const version = process.argv[4] ?? 'v0.10';
const prompt = process.argv.slice(5).join(' ') || '로그인 화면 만들어줘';

if (!baseUrl) {
  process.stderr.write('Usage: tsx scripts/deployment-smoke.ts <baseUrl> [provider] [version] [prompt]\n');
  process.exit(1);
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    throw new Error(`Request failed: ${url} ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  const startedAt = Date.now();
  const analysisResponse = await fetch(`${baseUrl}/api/analysis`);
  const analysis = await analysisResponse.json();
  if (!analysisResponse.ok) throw new Error(`/api/analysis failed with ${analysisResponse.status}`);

  const generation = await postJson(`${baseUrl}/api/generate`, {provider, version, prompt});
  const validation = await postJson(`${baseUrl}/api/validate`, {version, source: generation.serialized});

  const summary = {
    baseUrl,
    providerRequested: provider,
    providerUsed: generation.provider,
    usedModel: generation.usedModel,
    version,
    analysisOk: Array.isArray(analysis?.versions) && Array.isArray(analysis?.providers),
    generateValid: Boolean(generation?.validation?.valid),
    validateValid: Boolean(validation?.validation?.valid),
    previewRootId: validation?.preview?.rootId ?? null,
    elapsedMs: Date.now() - startedAt,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (!summary.analysisOk || !summary.generateValid || !summary.validateValid) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
