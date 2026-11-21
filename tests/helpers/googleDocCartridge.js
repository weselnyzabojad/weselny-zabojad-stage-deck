import * as cartridge from '../../src/lib/googleDocCartridge.js';

export * from '../../src/lib/googleDocCartridge.js';

const DEFAULT_CONTEXT = Object.freeze({
  weddingId: 'Test&Couple-UM-2026-01-001',
  servicePackage: 'HOST_AND_DJ_VIP',
  brideFirstName: 'Jennifer',
  groomFirstName: 'Guillaume',
});

// Test wrapper: the canonical template no longer carries identity or package
// (they are app/runtime values). Most parser tests are not about those fields,
// so provide a stable context; tests for missing values pass explicit nulls.
export function googleDocTemplateToCartridge(parsed, options = {}) {
  return cartridge.googleDocTemplateToCartridge(parsed, {
    ...DEFAULT_CONTEXT,
    ...options,
  });
}
