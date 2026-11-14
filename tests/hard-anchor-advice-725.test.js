import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #725 hard-anchor swap/defer advice removal', () => {
  it('removes the advice from the banner and radar details', () => {
    expect(read('src/components/HardAnchorAlertBanner.jsx')).not.toContain('swapOrDefer');
    const radar = read('src/lib/hardAnchorRadar.js');
    expect(radar).not.toContain('Swap or defer a block');
  });

  it('removes the i18n key from every locale', () => {
    for (const dictionary of [en, fr, pl]) {
      expect(dictionary).not.toHaveProperty('anchor.swapOrDefer');
    }
  });
});
