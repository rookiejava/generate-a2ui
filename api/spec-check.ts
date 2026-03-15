export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
};

import fs from 'node:fs';
import path from 'node:path';
import {SUPPORTED_VERSIONS, type A2UIVersion} from '../src/core/types.js';
import {getSpecificationRoot, getVersionSpecificationPath, readVersionFile} from '../src/core/loader.js';

async function checkVersion(version: A2UIVersion) {
  const versionPath = getVersionSpecificationPath(version);
  const protocolPath = path.join(versionPath, 'docs', 'a2ui_protocol.md');
  const rulesPath = path.join(versionPath, 'json', 'basic_catalog_rules.txt');

  const protocol = await readVersionFile(version, 'docs/a2ui_protocol.md').catch(() => '');
  const rules = version === 'v0.8'
    ? ''
    : await readVersionFile(version, 'json/basic_catalog_rules.txt').catch(() => '');

  return {
    version,
    versionPath,
    protocolPath,
    protocolExists: fs.existsSync(protocolPath),
    protocolChars: protocol.length,
    rulesPath,
    rulesExists: fs.existsSync(rulesPath),
    rulesChars: rules.length,
  };
}

export default async function handler(_req: any, res: any) {
  try {
    const specificationRoot = getSpecificationRoot();
    const versions = await Promise.all(SUPPORTED_VERSIONS.map((version) => checkVersion(version)));

    res.status(200).json({
      ok: true,
      cwd: process.cwd(),
      specificationRoot,
      versions,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cwd: process.cwd(),
    });
  }
}
