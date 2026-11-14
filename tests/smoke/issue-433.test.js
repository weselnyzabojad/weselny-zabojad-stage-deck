import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #433 theme fonts and offline caching', () => {
  it('declares the heading and body font families in @theme', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/--font-heading:\s*"Montserrat"/);
    expect(css).toMatch(/--font-body:\s*"Lora"/);
    expect(css).toContain('system-ui');
    expect(css).toContain('ui-serif');
  });

  it('keeps the heading/body utilities in use', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('font-body');
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('font-heading');
  });

  it('caches Google Fonts at runtime for offline use', () => {
    const config = read('vite.config.js');
    expect(config).toContain('fonts\\.googleapis\\.com');
    expect(config).toContain('fonts\\.gstatic\\.com');
    expect(config).toContain('StaleWhileRevalidate');
    expect(config).toContain('CacheFirst');
    expect(config).toContain('google-fonts-webfonts');
  });
});
