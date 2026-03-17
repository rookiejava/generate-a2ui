import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {getAllVersionAnalyses} from '../core/analysis.js';
import {generateA2ui} from '../core/agent.js';
import {createPreviewDocument} from '../core/preview.js';
import {parseMessages} from '../core/serialize.js';
import type {A2UIVersion, ProviderId, ProviderRuntimeConfig} from '../core/types.js';
import {validateMessages} from '../core/validator.js';

function parseRuntimeConfig(value: unknown): ProviderRuntimeConfig | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as ProviderRuntimeConfig
    : undefined;
}

function hasConfiguredEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function getDefaultProviderAvailability() {
  return {
    openai: hasConfiguredEnv('OPENAI_API_KEY'),
    gemini: hasConfiguredEnv('GEMINI_API_KEY'),
    claude: hasConfiguredEnv('ANTHROPIC_API_KEY'),
  };
}

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({limit: '2mb'}));

  app.get('/api/analysis', (_req, res) => {
    res.json({
      versions: getAllVersionAnalyses(),
      providers: ['auto', 'fallback', 'openai', 'gemini', 'claude'],
      defaultCredentials: getDefaultProviderAvailability(),
    });
  });

  app.post('/api/generate', async (req, res) => {
    try {
      const version = (req.body.version ?? 'v0.10') as A2UIVersion;
      const provider = (req.body.provider ?? 'auto') as ProviderId;
      const runtime = parseRuntimeConfig(req.body.runtime);

      res.json(await generateA2ui({
        version,
        provider,
        runtime,
        prompt: String(req.body.prompt ?? ''),
        format: req.body.format === 'yaml' ? 'yaml' : 'json',
      }));
    } catch (error) {
      res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.post('/api/validate', async (req, res) => {
    try {
      const version = (req.body.version ?? 'v0.10') as A2UIVersion;
      const messages = parseMessages(String(req.body.source ?? '[]'));
      const validation = await validateMessages(version, messages);

      res.json({
        validation,
        preview: createPreviewDocument(version, messages as any[]),
      });
    } catch (error) {
      res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  const webDist = path.resolve('web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  return app;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const port = Number(process.env.PORT ?? 8080);
  createServer().listen(port, () => console.log(`A2UI Studio listening on http://localhost:${port}`));
}
