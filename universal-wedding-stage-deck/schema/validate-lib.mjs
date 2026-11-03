// Shared cartridge validation used by the CLI, fixture suite and Vitest.
//
// Structural errors come from the Draft 2020-12 JSON Schema; cross-field rules
// come from the same `collectSemanticErrors` used by the browser importer.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { collectSemanticErrors } from '../src/lib/cartridgeValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = path.join(here, 'wedding-schema-v1.1.json');
export const FIXTURES_DIR = path.join(here, 'fixtures');

let compiledValidator = null;

async function getValidator() {
  if (compiledValidator) return compiledValidator;
  const schema = JSON.parse(await readFile(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  compiledValidator = ajv.compile(schema);
  return compiledValidator;
}

export async function validateCartridge(cartridge) {
  const validate = await getValidator();
  const errors = [];

  if (!validate(cartridge)) {
    for (const error of validate.errors ?? []) {
      errors.push({
        location: error.instancePath || '/',
        message: error.message ?? 'schema validation failed',
      });
    }
  }

  errors.push(...collectSemanticErrors(cartridge));
  return errors;
}

export async function validateCartridgeFile(cartridgePath) {
  const cartridge = JSON.parse(await readFile(cartridgePath, 'utf8'));
  return { cartridge, errors: await validateCartridge(cartridge) };
}

export function formatValidationErrors(errors = []) {
  return errors.map((error) => `  ${error.location}: ${error.message}`).join('\n');
}
