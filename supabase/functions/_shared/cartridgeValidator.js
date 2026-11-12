// Ajv-backed structural + semantic validation for `admin_api` (issue #165).
//
// The factory receives the Ajv 2020 class and the schema, so this module stays
// free of Deno/npm-only imports. `admin_api/index.ts` supplies the bundled
// `ajv` npm module and the schema copy; Vitest supplies the local Ajv build to
// test the exact same validation logic offline.

import { collectSemanticErrors, sanitizeCartridge } from './cartridgeSemantics.js';

export function makeCartridgeValidator(Ajv2020, schema, extraSchemas = []) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  for (const extra of extraSchemas) ajv.addSchema(extra);
  const validate = ajv.compile(schema);

  // Normalize first (strip retired fields), then run the same structural and
  // cross-field rules as the browser/CLI validator. Returns the sanitized
  // cartridge so the caller publishes exactly what was validated.
  return async function validateCartridge(input) {
    const cartridge = sanitizeCartridge(input);
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
    return { valid: errors.length === 0, errors, cartridge };
  };
}
