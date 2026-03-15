export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

import {generateA2ui} from '../src/core/agent.js';
export default async function handler(req: any, res: any) { try { const result = await generateA2ui({ version: req.body?.version ?? 'v0.10', provider: req.body?.provider ?? 'auto', prompt: String(req.body?.prompt ?? ''), format: req.body?.format === 'yaml' ? 'yaml' : 'json' }); res.status(200).json(result); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' }); } }
