#!/usr/bin/env node
// Structural + semantic validation for WeddingSchema v1.1 cartridges.
//
// Usage:
//   node schema/validate-cartridge.mjs
//   node schema/validate-cartridge.mjs path/to/cartridge.json

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { collectSemanticErrors } from '../src/lib/cartridgeValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, 'wedding-schema-v1.1.json');
const cartridgePath = process.argv[2] ?? path.join(here, 'wedding-cartridge.example.json');

const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const cartridge = JSON.parse(await readFile(cartridgePath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
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

if (errors.length > 0) {
  console.error(`✗ ${cartridgePath} is not a valid WeddingSchema v1.1 cartridge\n`);
  for (const error of errors) {
    console.error(`  ${error.location}: ${error.message}`);
  }
  process.exit(1);
}

console.log(
  `✓ ${path.basename(cartridgePath)} is a valid WeddingSchema v1.1 cartridge ` +
    `(${cartridge.steps?.length ?? 0} steps, ${cartridge.hardAnchors?.length ?? 0} hard anchors).`,
);
