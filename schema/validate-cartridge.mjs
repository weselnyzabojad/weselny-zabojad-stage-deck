#!/usr/bin/env node
// Structural + semantic validation for WeddingSchema v1.1 cartridges.
//
// Usage:
//   node schema/validate-cartridge.mjs
//   node schema/validate-cartridge.mjs path/to/cartridge.json

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatValidationErrors,
  validateCartridgeFile,
} from './validate-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cartridgePath = process.argv[2] ?? path.join(here, 'wedding-cartridge.example.json');

const { cartridge, errors } = await validateCartridgeFile(cartridgePath);

if (errors.length > 0) {
  console.error(`✗ ${cartridgePath} is not a valid WeddingSchema v1.1 cartridge\n`);
  console.error(formatValidationErrors(errors));
  process.exit(1);
}

console.log(
  `✓ ${path.basename(cartridgePath)} is a valid WeddingSchema v1.1 cartridge ` +
    `(${cartridge.steps?.length ?? 0} steps, ${cartridge.hardAnchors?.length ?? 0} hard anchors).`,
);
