import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #437 overlay z-index scale', () => {
  it('defines the named z-index tokens and utilities', () => {
    const css = read('src/index.css');
    for (const token of ['base', 'raised', 'banner', 'toast', 'modal', 'critical']) {
      expect(css).toContain(`--z-${token}:`);
      expect(css).toContain(`@utility z-${token}`);
    }
  });

  it('keeps critical above modal above toast above banner', () => {
    const css = read('src/index.css');
    const value = (name) => Number(css.match(new RegExp(`--z-${name}:\\s*(\\d+)`))[1]);
    expect(value('critical')).toBeGreaterThan(value('modal'));
    expect(value('modal')).toBeGreaterThan(value('toast'));
    expect(value('toast')).toBeGreaterThan(value('banner'));
    expect(value('banner')).toBeGreaterThan(value('raised'));
  });

  it('removes arbitrary z-index values from overlay components', () => {
    const files = [
      'src/admin/AdminApp.jsx',
      'src/admin/AdminToast.jsx',
      'src/components/ChildrenExpectedBadge.jsx',
      'src/StageDeck.jsx',
      'src/components/DevViewSwitcher.jsx',
      'src/components/DjNowPlayingOverlay.jsx',
      'src/components/KeySongsCard.jsx',
      'src/components/MandatoryUpdatePopup.jsx',
      'src/components/ModalShell.jsx',
      'src/components/PwaUpdateNotice.jsx',
      'src/components/StagePingBanner.jsx',
      'src/components/UndoToast.jsx',
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/\bz-\[\d+\]/);
    }
  });

  it('wires modals and the critical popup to the scale', () => {
    expect(read('src/components/ModalShell.jsx')).toContain('z-modal');
    expect(read('src/components/KeySongsCard.jsx')).toContain('z-modal');
    expect(read('src/components/UndoToast.jsx')).toContain('z-toast');
    expect(read('src/components/MandatoryUpdatePopup.jsx')).toContain('z-critical');
  });

  it('documents the manual stacking check', () => {
    expect(read('docs/overlay-stacking.md')).toContain('## Manual stacking check');
  });
});
