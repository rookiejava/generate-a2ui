export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
};

import {createAnalysisResponse} from '../src/server/handlers.js';

export default async function handler(_req: any, res: any) {
  res.status(200).json(createAnalysisResponse());
}
