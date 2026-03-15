export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

import {parseMessages} from '../src/core/serialize.js';
import {validateMessages} from '../src/core/validator.js';
import {createPreviewDocument} from '../src/core/preview.js';
import {parseVersion} from '../src/core/input.js';
export default async function handler(req: any, res: any) { try { const version = parseVersion(req.body?.version); const messages = parseMessages(String(req.body?.source ?? '[]')); const validation = await validateMessages(version, messages); res.status(200).json({ validation, preview: createPreviewDocument(version, messages as any[]) }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' }); } }
