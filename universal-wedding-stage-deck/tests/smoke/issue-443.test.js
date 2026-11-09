import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #443 MC footer ergonomics', () => {
  it('keeps a 12px gap and 48px Undo next to HOLD', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('flex flex-wrap items-center gap-3');
    expect(mc).toContain('min-h-12 px-3 py-2');
  });

  it('moves Swap into the current-step overflow menu', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<CurrentStepOverflow');
    const footer = mc.slice(mc.indexOf('<footer'), mc.indexOf('</footer>'));
    expect(footer).not.toContain('Swap w/ Next');
    expect(footer).not.toContain('onClick={handleSwap}');
  });

  it('uses a keyboard-accessible native disclosure', () => {
    const overflow = read('src/components/CurrentStepOverflow.jsx');
    expect(overflow).toContain('<details');
    expect(overflow).toContain('<summary');
    expect(overflow).toContain('min-h-11');
    expect(overflow).toContain("t('mc.step.swapNext')");
  });

  it('keeps the 1.2s hold interaction', () => {
    expect(read('src/components/HoldToConfirmButton.jsx')).toContain('holdMs = 1200');
  });

  it('defines overflow labels in every locale', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of ['mc.step.more', 'mc.step.swapNext', 'mc.step.swapWith', 'mc.step.noNext']) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
