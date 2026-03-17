export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

import {handleGenerateRequest} from '../src/server/handlers.js';

export default async function handler(req: any, res: any) {
  try {
    res.status(200).json(await handleGenerateRequest(req.body, Boolean(req.body?.debug)));
  } catch (error) {
    res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
}
