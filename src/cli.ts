#!/usr/bin/env node
import fs from 'node:fs/promises';
import {Command} from 'commander';
import {generateA2ui} from './core/agent.js';
import {parseMessages} from './core/serialize.js';
import {validateMessages} from './core/validator.js';
import {createServer} from './server/index.js';
import type {A2UIVersion, ProviderId} from './core/types.js';
const program = new Command();
program.name('a2ui-cli').description('Generate, validate, and preview versioned A2UI payloads.');
program.command('generate').requiredOption('-p, --prompt <prompt>').option('-v, --version <version>', 'target version', 'v0.10').option('--provider <provider>', 'auto|fallback|openai|gemini|claude', 'auto').option('-o, --output <file>').option('-f, --format <format>', 'json or yaml', 'json').action(async (options) => { const result = await generateA2ui({ prompt: options.prompt, version: options.version as A2UIVersion, provider: options.provider as ProviderId, format: options.format }); if (options.output) await fs.writeFile(options.output, result.serialized, 'utf8'); else process.stdout.write(`${result.serialized}\n`); if (!result.validation.valid) { process.stderr.write('Validation failed\n'); for (const issue of result.validation.issues) process.stderr.write(`- ${issue.instancePath}: ${issue.message}\n`); process.exitCode = 1; } });
program.command('validate').requiredOption('-i, --input <file>').option('-v, --version <version>', 'target version', 'v0.10').action(async (options) => { const source = await fs.readFile(options.input, 'utf8'); const validation = await validateMessages(options.version as A2UIVersion, parseMessages(source)); process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`); if (!validation.valid) process.exitCode = 1; });
program.command('serve').option('-p, --port <port>', 'port', '8080').action((options) => { const port = Number(options.port); createServer().listen(port, () => { process.stdout.write(`A2UI Studio available at http://localhost:${port}\n`); }); });
program.parseAsync(process.argv);
