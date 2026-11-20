import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #854 build-time dependency risk', () => {
  it('documents the accepted PWA toolchain risk and upgrade trigger', () => {
    const doc = read('docs/security-build-dependencies.md');

    expect(doc).toContain('2 low, 4 moderate, 0 high, 0 critical');
    expect(doc).toContain('vite-plugin-pwa@2.0.0');
    expect(doc).toContain('not shipped to the browser');
    expect(doc).toContain('Do not downgrade to `1.1.0`');
    expect(doc).toContain('npm audit');
  });
});
