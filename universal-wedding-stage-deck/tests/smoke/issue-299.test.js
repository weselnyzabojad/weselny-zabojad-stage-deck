import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBarCenterIdentity from '../../src/components/TopBarCenterIdentity.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = {
  dateISO: '2026-11-09',
  coupleProfile: {
    bride: { firstName: 'Jennifer', nationalities: ['FR'] },
    groom: { firstName: 'Guillaume', nationalities: ['PL'] },
    commonLanguages: ['FR', 'PL'],
  },
};

describe('issue #299 couple languages vs UI language switch', () => {
  it('labels the couple languages explicitly with conversational icon and names', () => {
    const html = renderToStaticMarkup(createElement(TopBarCenterIdentity, { wedding }));
    expect(html).toContain('Couple common languages');
    expect(html).toContain('🗣️');
    expect(html).toContain('French');
    expect(html).toContain('Polish');
    expect(html).not.toContain('🌐');
  });

  it('can be hidden without touching the rest of the identity block', () => {
    const html = renderToStaticMarkup(
      createElement(TopBarCenterIdentity, { wedding, showCoupleLanguages: false }),
    );
    expect(html).not.toContain('Couple common languages');
    expect(html).toContain('Jennifer');
    expect(html).toContain('Guillaume');
    expect(html).toContain('2026');
  });

  it('hides the indicator on DJ Standard and keeps it on DJ VIP', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('showCoupleLanguages={isVip}');
  });

  it('localizes the label in EN/FR/PL', () => {
    expect(read('src/i18n/en.js')).toContain("'couple.languages': 'Couple common languages'");
    expect(read('src/i18n/fr.js')).toContain("'couple.languages': 'Langues communes du couple'");
    expect(read('src/i18n/pl.js')).toContain("'couple.languages': 'Wspólne języki pary'");
  });
});
