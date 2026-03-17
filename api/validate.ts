export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

import {handleValidateRequest} from '../src/server/handlers.js';

export default async function handler(req: any, res: any) {
  try {
    res.status(200).json(await handleValidateRequest(req.body));
  } catch (error) {
    res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
}
