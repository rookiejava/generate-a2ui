import fs from 'node:fs/promises';
import path from 'node:path';
import type {A2UIVersion} from './types.js';
const VERSION_DIRS: Record<A2UIVersion, string> = { 'v0.8': 'v0_8', 'v0.9': 'v0_9', 'v0.10': 'v0_10' };
export function getSpecificationRoot(): string { return process.env.A2UI_SPEC_ROOT ?? path.resolve('.tmp-a2ui-upstream/specification'); }
export function getVersionSpecificationPath(version: A2UIVersion): string { return path.join(getSpecificationRoot(), VERSION_DIRS[version]); }
export async function readVersionFile(version: A2UIVersion, relativePath: string): Promise<string> { return fs.readFile(path.join(getVersionSpecificationPath(version), relativePath), 'utf8'); }
