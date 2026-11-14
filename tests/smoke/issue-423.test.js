import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #423 pinch zoom / WCAG 1.4.4', () => {
  it('leaves the viewport zoomable', () => {
    const html = read('index.html');
    const viewport = html.match(/<meta name="viewport"[^>]*>/)?.[0] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1.0');
    expect(viewport).not.toContain('user-scalable=no');
    expect(viewport).not.toContain('maximum-scale');
  });

  it('documents the zoom and resize-text check', () => {
    const doc = read('docs/accessibility-audit.md');
    expect(doc).toContain('WCAG 1.4.4');
    expect(doc).toContain('Pinch zoom');
  });
});
