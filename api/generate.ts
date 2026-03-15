export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

import {generateA2ui} from '../src/core/agent.js';
import {parseProvider, parseRuntimeConfig, parseVersion} from '../src/core/input.js';

export default async function handler(req: any, res: any) {
  try {
    const result = await generateA2ui({
      version: parseVersion(req.body?.version),
      provider: parseProvider(req.body?.provider, 'auto'),
      runtime: parseRuntimeConfig(req.body?.runtime),
      prompt: String(req.body?.prompt ?? ''),
      format: req.body?.format === 'yaml' ? 'yaml' : 'json',
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
}
