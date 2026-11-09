import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #440 hide dev switcher on phones', () => {
  it('hides the switcher below the compact breakpoint', () => {
    const switcher = read('src/components/DevViewSwitcher.jsx');
    expect(switcher).toContain('hidden');
    expect(switcher).toContain('sm:block');
  });

  it('stays behind the build-time DEV gate', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('import.meta.env.DEV');
    expect(deck).toContain('DEV_VIEW_SWITCHER');
  });

  it('documents the developer workflow and gate', () => {
    const doc = read('docs/dev-tools.md');
    expect(doc).toContain('import.meta.env.DEV');
    expect(doc).toContain('hidden');
    expect(doc).toContain('640px');
  });
});
