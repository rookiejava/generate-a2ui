import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import type {A2UIVersion} from './types.js';

const VERSION_DIRS: Record<A2UIVersion, string> = {
  'v0.8': 'v0_8',
  'v0.9': 'v0_9',
  'v0.10': 'v0_10',
};

function isValidSpecificationRoot(candidate: string): boolean {
  return fsSync.existsSync(path.join(candidate, 'v0_10', 'json', 'server_to_client_list.json'));
}

export function getSpecificationRoot(): string {
  const candidates = [
    process.env.A2UI_SPEC_ROOT,
    path.resolve('.tmp-a2ui-upstream/specification'),
    path.resolve('specification'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (isValidSpecificationRoot(candidate)) return candidate;
  }

  throw new Error(`Unable to locate A2UI specification root. Tried: ${candidates.join(', ')}`);
}

export function getVersionSpecificationPath(version: A2UIVersion): string {
  return path.join(getSpecificationRoot(), VERSION_DIRS[version]);
}

export async function readVersionFile(version: A2UIVersion, relativePath: string): Promise<string> {
  return fs.readFile(path.join(getVersionSpecificationPath(version), relativePath), 'utf8');
}

export async function readVersionJson(version: A2UIVersion, relativePath: string): Promise<any> {
  return JSON.parse(await readVersionFile(version, relativePath));
}
