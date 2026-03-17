export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
};

import {getAllVersionAnalyses} from '../src/core/analysis.js';

function hasConfiguredEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

export default async function handler(_req: any, res: any) {
  res.status(200).json({
    versions: getAllVersionAnalyses(),
    providers: ['auto', 'fallback', 'openai', 'gemini', 'claude'],
    defaultCredentials: {
      openai: hasConfiguredEnv('OPENAI_API_KEY'),
      gemini: hasConfiguredEnv('GEMINI_API_KEY'),
      claude: hasConfiguredEnv('ANTHROPIC_API_KEY'),
    },
  });
}
