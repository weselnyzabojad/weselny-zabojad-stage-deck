import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(entry) ? [path] : [];
  });
}

describe('issue #798 demo data stays out of production', () => {
  const vite = read('vite.config.js');
  const app = read('src/App.jsx');
  const stage = read('src/StageDeck.jsx');

  it('aliases @demo to the empty stub for ordinary production builds', () => {
    expect(vite).toContain("alias:");
    expect(vite).toContain("'@demo'");
    expect(vite).toContain("command === 'serve' || process.env.VITE_DECK_MODE === 'local'");
    expect(vite).toContain('./src/demo/demoWedding.empty.js');
    expect(vite).toContain('./src/demo/demoWedding.js');
  });

  it('only reaches demo data through the alias', () => {
    expect(app).toContain("from '@demo'");
    expect(stage).toContain("from '@demo'");
    const direct = sourceFiles(fileURLToPath(new URL('../../src', import.meta.url))).filter(
      (file) => readFileSync(file, 'utf8').includes('./demo/demoWedding'),
    );
    expect(direct).toEqual([]);
  });

  it('ships a production-safe stub with the expected exports', () => {
    const stub = read('src/demo/demoWedding.empty.js');
    expect(stub).toContain('export const DEFAULT_WEDDING');
    expect(stub).toContain('export function buildInitialLiveState');
    expect(stub).not.toContain('jennifer');
    expect(stub).not.toContain('coupleProfile');
  });

  it('gates the production cartridge fetch behind a valid session', () => {
    expect(app).toContain('enabled: IS_PRODUCTION && sessionValid');
    expect(app).toContain('if (IS_PRODUCTION && !sessionValid)');
    expect(app).toContain('IS_PRODUCTION ? activeCartridgeState.wedding : DEFAULT_WEDDING');
    expect(app.indexOf('if (IS_PRODUCTION && !sessionValid)')).toBeLessThan(
      app.indexOf('const wedding = IS_PRODUCTION'),
    );
  });
});
