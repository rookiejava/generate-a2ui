import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {A2UIVersion, ValidationResult, ValidationIssue} from './types.js';
import {getVersionSpecificationPath} from './loader.js';
const cache = new Map<A2UIVersion, Promise<Ajv2020>>();
async function loadJson(filePath: string): Promise<any> { return JSON.parse(await fs.readFile(filePath, 'utf8')); }
function schemaBase(version: A2UIVersion): string { return `https://a2ui.org/specification/${version.replace('.', '_')}`; }
async function createAjv(version: A2UIVersion): Promise<Ajv2020> {
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const jsonPath = path.join(getVersionSpecificationPath(version), 'json');
  const fileNames = (await fs.readdir(jsonPath)).filter((entry) => entry.endsWith('.json'));
  for (const fileName of fileNames) {
    const schema = await loadJson(path.join(jsonPath, fileName));
    const id = schema.$id ?? `${schemaBase(version)}/${fileName}`;
    ajv.addSchema({...schema, $id: id}, id);
  }
  if (version === 'v0.8') {
    ajv.addSchema({
      $id: `${schemaBase(version)}/server_to_client_list.json`,
      type: 'array',
      items: {$ref: `${schemaBase(version)}/server_to_client_with_standard_catalog.json`},
    });
  }
  if (version === 'v0.9' || version === 'v0.10') {
    const basicCatalog = await loadJson(path.join(jsonPath, 'basic_catalog.json'));
    ajv.addSchema({ ...basicCatalog, $id: `https://a2ui.org/specification/${version.replace('.', '_')}/catalog.json` });
  }
  return ajv;
}
async function getAjv(version: A2UIVersion): Promise<Ajv2020> { if (!cache.has(version)) cache.set(version, createAjv(version)); return cache.get(version)!; }
function normalizeIssues(errors: any[] | null | undefined): ValidationIssue[] { return (errors ?? []).map((error) => ({ instancePath: error.instancePath || '/', message: error.message ?? 'Unknown validation error', keyword: error.keyword })); }
export async function validateMessages(version: A2UIVersion, messages: unknown[]): Promise<ValidationResult> {
  const ajv = await getAjv(version);
  const schemaId = `https://a2ui.org/specification/${version.replace('.', '_')}/server_to_client_list.json`;
  const validate = ajv.getSchema(schemaId);
  if (!validate) throw new Error(`Unable to load schema for ${version}`);
  const valid = Boolean(validate(messages));
  return { valid, issues: valid ? [] : normalizeIssues(validate.errors as any[]) };
}
