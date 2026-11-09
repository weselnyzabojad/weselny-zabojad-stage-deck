import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const DEMO_CUES = [
  'Inform guests: NO Sto Lat tonight!',
  'Explain Polish Steak Tartare + Vodka tradition.',
  'Announce Instax + Guestbook + 1st Anniv Bottle.',
];

describe('issue #426 remove hardcoded MC demo cues', () => {
  it('leaves zero demo cue literals in the MC view', () => {
    const mc = read('src/views/McMasterView.jsx');
    for (const cue of DEMO_CUES) {
      expect(mc).not.toContain(cue);
    }
  });

  it('renders the translated empty state when the cartridge has no cue', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("t('mc.cues.empty')");
    expect(mc).toContain('useI18n');
  });

  it('defines the empty state in every language', () => {
    expect(read('src/i18n/en.js')).toContain("'mc.cues.empty': 'No MC cue'");
    expect(read('src/i18n/fr.js')).toContain("'mc.cues.empty':");
    expect(read('src/i18n/pl.js')).toContain("'mc.cues.empty':");
  });
});
