import {getAllVersionAnalyses} from '../src/core/analysis.js';
export default async function handler(_req: any, res: any) { res.status(200).json({ versions: getAllVersionAnalyses(), providers: ['auto', 'fallback', 'openai', 'gemini', 'claude'] }); }
