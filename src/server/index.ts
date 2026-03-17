import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {createAnalysisResponse, handleGenerateRequest, handleValidateRequest} from './handlers.js';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({limit: '2mb'}));

  app.get('/api/analysis', (_req, res) => {
    res.json(createAnalysisResponse());
  });

  app.post('/api/generate', async (req, res) => {
    try {
      res.json(await handleGenerateRequest(req.body, Boolean(req.body?.debug)));
    } catch (error) {
      res.status(400).json({error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.post('/api/validate', async (req, res) => {
    try {
      res.json(await handleValidateRequest(req.body));
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
