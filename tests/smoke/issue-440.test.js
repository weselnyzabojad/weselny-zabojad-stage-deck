import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #440 dev switcher mobile access', () => {
  it('keeps only the collapsed DEV chip on phones', () => {
    const switcher = read('src/components/DevViewSwitcher.jsx');
    expect(switcher).toContain('fixed left-3 top-3');
    expect(switcher).toContain('sm:bottom-3');
    expect(switcher).toContain('const [open, setOpen] = useState(defaultOpen)');
  });

  it('stays behind the build-time DEV gate', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('import.meta.env.DEV');
    expect(deck).toContain('DEV_VIEW_SWITCHER');
  });

  it('documents the developer workflow and gate', () => {
    const doc = read('docs/dev-tools.md');
    expect(doc).toContain('import.meta.env.DEV');
    expect(doc).toContain('collapsed');
    expect(doc).toContain('DEV');
  });
});
