import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #396 full-width DJ layout', () => {
  it('removes the max-width cap from the DJ main content', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).not.toContain('mx-auto max-w-5xl');
    expect(dj).toContain('className="w-full space-y-4"');
  });

  it('keeps responsive padding on the DJ main area', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('<main id="main-content" tabIndex={-1} className="flex-1 p-4">');
  });
});
