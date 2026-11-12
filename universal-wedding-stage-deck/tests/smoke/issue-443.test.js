import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #443 MC footer ergonomics', () => {
  it('keeps a 12px gap and 48px Undo next to HOLD', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('flex flex-wrap items-center gap-3');
    expect(mc).toContain('min-h-12 px-3 py-2');
  });

  it('removes the current-step overflow menu and swap control', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('CurrentStepOverflow');
    expect(mc).not.toContain('onSwap={handleSwap}');
    expect(mc).not.toContain("t('mc.step.more')");
  });

  it('deletes the obsolete overflow component', () => {
    expect(
      existsSync(new URL('../../src/components/CurrentStepOverflow.jsx', import.meta.url)),
    ).toBe(false);
  });

  it('keeps the 1.2s hold interaction', () => {
    expect(read('src/components/HoldToConfirmButton.jsx')).toContain('holdMs = 1200');
  });

  it('defines overflow labels in every locale', () => {
    // The labels are no longer rendered, but the dictionaries keep the keys for
    // older clients and tests.
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of ['mc.step.more', 'mc.step.swapNext', 'mc.step.swapWith', 'mc.step.noNext']) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
