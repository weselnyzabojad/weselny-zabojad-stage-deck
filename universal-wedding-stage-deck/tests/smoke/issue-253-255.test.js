import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBarCenterIdentity from '../../src/components/TopBarCenterIdentity.jsx';
import { formatWeekdayDate } from '../../src/i18n/index.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = {
  dateISO: '2026-11-09',
  coupleProfile: {
    bride: { firstName: 'Jennifer', nationalities: ['FR'] },
    groom: { firstName: 'Guillaume', nationalities: ['PL'] },
    commonLanguages: ['FR', 'PL'],
  },
};

describe('issue #253 unified top bar shell', () => {
  it('uses the shared shell in every role view', () => {
    for (const file of ['src/views/McMasterView.jsx','src/components/DjBoothView.jsx','src/components/PhotographerView.jsx','src/components/SpeakerView.jsx']) {
      expect(read(file)).toContain('TopBarShell');
      expect(read(file)).toContain('TopBarCenterIdentity');
    }
  });
  it('uses the larger clock and spacing', () => {
    expect(read('src/components/TopBarClock.jsx')).toContain('text-2xl');
    expect(read('src/components/TopBarShell.jsx')).toContain('gap-4');
  });
});

describe('issue #254 center identity layout', () => {
  it('renders ring logo, names, languages and date', () => {
    const html = renderToStaticMarkup(createElement(TopBarCenterIdentity, { wedding }));
    expect(html).toContain('Jennifer');
    expect(html).toContain('Guillaume');
    expect(html).toContain('💍');
    expect(html).toContain('French');
    expect(html).toContain('Polish');
    expect(html).toContain('2026');
  });
});

describe('issue #255 localized weekday date', () => {
  it('formats weekday in EN/FR/PL', () => {
    const en = formatWeekdayDate('2026-11-09T12:00:00Z', { locale: 'en' });
    const fr = formatWeekdayDate('2026-11-09T12:00:00Z', { locale: 'fr' });
    const pl = formatWeekdayDate('2026-11-09T12:00:00Z', { locale: 'pl' });
    expect(en.toLowerCase()).toContain('monday');
    expect(fr.toLowerCase()).toContain('lundi');
    expect(pl.toLowerCase()).toContain('poniedziałek');
  });
});
