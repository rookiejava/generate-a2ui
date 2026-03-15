export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

import {generateA2ui} from '../src/core/agent.js';
import {parseProvider, parseRuntimeConfig, parseVersion} from '../src/core/input.js';
import {getSpecificationRoot, readVersionFile} from '../src/core/loader.js';

export default async function handler(req: any, res: any) {
  try {
    const version = parseVersion(req.body?.version);
    const provider = parseProvider(req.body?.provider, 'auto');
    const runtime = parseRuntimeConfig(req.body?.runtime);
    const prompt = String(req.body?.prompt ?? '');
    const debugRequested = Boolean(req.body?.debug);

    const result = await generateA2ui({
      version,
      provider,
      runtime,
      prompt,
      format: req.body?.format === 'yaml' ? 'yaml' : 'json',
    });

    if (!debugRequested) {
      res.status(200).json(result);
      return;
    }

    const protocol = await readVersionFile(version, 'docs/a2ui_protocol.md').catch(() => '');
    const rules = version === 'v0.8'
      ? ''
      : await readVersionFile(version, 'json/basic_catalog_rules.txt').catch(() => '');

    const specificationRoot = (() => {
      try {
        return getSpecificationRoot();
      } catch {
        return null;
      }
    })();

    res.status(200).json({
      ...result,
      debug: {
        requestedProvider: provider,
        activeProvider: result.provider,
        activeModel: result.model ?? null,
        usedModel: result.usedModel,
        promptChars: prompt.length,
        systemPromptProtocolChars: protocol.length,
        systemPromptRulesChars: rules.length,
        specificationRoot,
      },
    });
  } catch (error) {
    res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
}
