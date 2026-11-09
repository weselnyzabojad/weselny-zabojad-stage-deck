import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../src/', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (name.endsWith('.jsx')) out.push(path);
  }
  return out;
}

function sourceFiles() {
  return walk(ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1')).map((path) =>
    readFileSync(path, 'utf8'),
  );
}

describe('issue #430 day theme ink tokens', () => {
  it('defines semantic muted and on-accent utilities', () => {
    const css = read('index.css');
    expect(css).toContain('--color-ink: var(--text-primary)');
    expect(css).toContain('--color-muted: var(--text-muted)');
    expect(css).toContain('--color-on-accent: var(--on-accent)');
  });

  it('removes the day-theme text-white bridge and slate bridge', () => {
    const css = read('index.css');
    expect(css).not.toContain('[data-theme="day"] .text-white');
    expect(css).not.toContain('.bg-brand.text-white');
    expect(css).not.toContain('.stage-ping-flash.text-white');
    expect(css).not.toContain('--color-slate-');
  });

  it('leaves no legacy text-white or text-slate utilities in JSX', () => {
    for (const source of sourceFiles()) {
      expect(source).not.toMatch(/text-white/);
      expect(source).not.toMatch(/text-slate-(100|200|300|400|500|600)\b/);
    }
  });

  it('uses on-accent on solid accent surfaces', () => {
    expect(read('components/StagePingBanner.jsx')).toContain('text-on-accent');
    expect(read('components/HardAnchorAlertBanner.jsx')).toContain('text-on-accent');
    expect(read('components/DjNowPlayingOverlay.jsx')).toContain('text-on-accent');
  });
});
