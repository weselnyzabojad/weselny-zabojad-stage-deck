#!/usr/bin/env node
// Validate every committed schema fixture.
//
// Naming contract:
//   valid-*.json   must pass structural + semantic validation
//   real-*.json    real wedding cartridges; must pass
//   invalid-*.json must fail at least one structural or semantic rule
//
// Usage:
//   node schema/validate-fixtures.mjs

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  FIXTURES_DIR,
  formatValidationErrors,
  validateCartridgeFile,
} from './validate-lib.mjs';

const files = (await readdir(FIXTURES_DIR))
  .filter((name) => name.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error('✗ No fixtures found in schema/fixtures.');
  process.exit(1);
}

const failures = [];
const counts = { valid: 0, real: 0, invalid: 0 };

for (const name of files) {
  const filePath = path.join(FIXTURES_DIR, name);
  let result;

  try {
    result = await validateCartridgeFile(filePath);
  } catch (error) {
    failures.push(`${name}: could not read/parse fixture (${error.message})`);
    continue;
  }

  const expectInvalid = name.startsWith('invalid-');
  const isReal = name.startsWith('real-');

  if (expectInvalid) {
    counts.invalid += 1;
    if (result.errors.length === 0) {
      failures.push(`${name}: expected validation to fail, but it passed`);
    } else {
      console.log(`✓ ${name} rejected as expected (${result.errors[0].message})`);
    }
    continue;
  }

  if (isReal) counts.real += 1;
  else counts.valid += 1;

  if (result.errors.length > 0) {
    failures.push(`${name}: expected valid, but failed\n${formatValidationErrors(result.errors)}`);
  } else {
    console.log(`✓ ${name} is valid`);
  }
}

if (counts.valid === 0 || counts.invalid === 0 || counts.real === 0) {
  failures.push(
    `Fixture coverage incomplete: ${counts.valid} valid, ${counts.real} real, ${counts.invalid} invalid.`,
  );
}

if (failures.length > 0) {
  console.error('\n✗ Fixture validation failed\n');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `\n✓ Fixtures valid: ${counts.valid} edge cases, ${counts.real} real weddings, ` +
    `${counts.invalid} expected failures.`,
);
