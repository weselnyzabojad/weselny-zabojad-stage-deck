import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const DEMO_CUES = [
  'Inform guests: NO Sto Lat tonight!',
  'Explain Polish Steak Tartare + Vodka tradition.',
  'Announce Instax + Guestbook + 1st Anniv Bottle.',
];

describe('issue #426 remove hardcoded MC cues and empty fallback', () => {
  it('leaves zero demo cue literals in the MC view', () => {
    const mc = read('src/views/McMasterView.jsx');
    for (const cue of DEMO_CUES) {
      expect(mc).not.toContain(cue);
    }
  });

  it('renders notes only when the step has a note', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('{currentStep.notes ? (');
    expect(mc).not.toContain("t('mc.cues.empty')");
  });

  it('defines the Notes heading in every language', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      expect(read(`src/i18n/${locale}.js`)).toContain("'mc.step.notesTitle'");
    }
  });
});
