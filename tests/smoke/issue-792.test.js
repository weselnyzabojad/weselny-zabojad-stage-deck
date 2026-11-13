import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const relative = join(dir, entry);
    const absolute = join(ROOT, relative);
    if (statSync(absolute).isDirectory()) {
      out.push(...sourceFiles(relative));
    } else if (/\.(js|jsx)$/.test(entry)) {
      out.push(relative);
    }
  }
  return out;
}

describe('issue #792 zero-warning release gate', () => {
  it('makes lint warnings fatal in the single npm script', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts.lint).toBe('oxlint --deny-warnings');
  });

  it('runs lint, env validation, tests and the build in CI on Node 22 with npm ci', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('node-version: 22');
    expect(ci).toContain('run: npm ci');
    expect(ci).toContain('run: npm run lint');
    expect(ci).toContain('run: npm run validate:env -- --allow-missing');
    expect(ci).toContain('run: npm test');
    expect(ci).toContain('run: npm run build');
  });

  it('documents a chunk-size limit above the real entry bundle', () => {
    const vite = read('vite.config.js');
    const match = /chunkSizeWarningLimit:\s*(\d+)/.exec(vite);
    expect(match).not.toBeNull();
    // The precached entry bundle is ~1.35 MB minified; the limit must stay above it.
    expect(Number(match[1])).toBeGreaterThanOrEqual(1350);
    expect(vite).toContain('precache');
  });

  it('keeps suppressions narrow and justified', () => {
    const offenders = [];
    for (const dir of ['src', 'public', 'tests']) {
      for (const file of sourceFiles(dir)) {
        const lines = read(file).split(/\r?\n/);
        lines.forEach((line, index) => {
          if (/eslint-disable/.test(line) && !line.includes('--')) {
            offenders.push(`${file}:${index + 1}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
