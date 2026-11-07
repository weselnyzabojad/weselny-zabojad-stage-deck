import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CeremonyCueCard from '../../src/components/CeremonyCueCard.jsx';
import MandatoryConstraintsCard from '../../src/components/MandatoryConstraintsCard.jsx';
import {
  ceremonyVisibleToMc,
  firstArrivalCeremonyNote,
  resolveCeremony,
} from '../../src/lib/ceremony.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const weddingWith = (ceremony) => ({
  weddingId: 'w1',
  couple: 'A & B',
  mandatorySteps: { firstGuestsArrival: '15:30' },
  ceremony,
});

describe('issue #303 ceremony variants', () => {
  it('validates RELIGIOUS, CIVIL and HUMANIST in the schema', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.properties.ceremony.properties.type.enum).toEqual([
      'RELIGIOUS',
      'CIVIL',
      'HUMANIST',
    ]);
  });

  it('parses the Google Doc ceremony contract', () => {
    const template = read('schema/google-doc-template.md');
    for (const line of [
      'Ceremony type: RELIGIOUS',
      'Ceremony MC support: yes',
      'Ceremony MC translation help: no',
      'Ceremony location:',
      'Ceremony notes:',
    ]) {
      expect(template).toContain(line);
    }
  });

  it('shows full religious ceremony detail only when MC support is requested', () => {
    const supported = resolveCeremony(
      weddingWith({ type: 'RELIGIOUS', mcSupportRequested: true, location: 'St. Mary' }),
    );
    expect(ceremonyVisibleToMc(supported)).toBe(true);
    const html = renderToStaticMarkup(createElement(CeremonyCueCard, {
      wedding: weddingWith({ type: 'RELIGIOUS', mcSupportRequested: true, location: 'St. Mary' }),
      role: 'mc',
    }));
    expect(html).toContain('Religious ceremony');
    expect(html).toContain('MC support requested');
    expect(html).toContain('St. Mary');

    const unsupported = resolveCeremony(
      weddingWith({ type: 'RELIGIOUS', mcSupportRequested: false, location: 'St. Mary' }),
    );
    expect(ceremonyVisibleToMc(unsupported)).toBe(false);
    expect(renderToStaticMarkup(createElement(CeremonyCueCard, {
      wedding: weddingWith({ type: 'RELIGIOUS', mcSupportRequested: false }),
      role: 'mc',
    }))).toBe('');
  });

  it('adds a religious note to First arrival when MC support is not requested', () => {
    const wedding = weddingWith({
      type: 'RELIGIOUS',
      mcSupportRequested: false,
      location: 'St. Mary',
    });
    expect(firstArrivalCeremonyNote(resolveCeremony(wedding))).toContain(
      'Religious wedding ceremony at St. Mary',
    );
    const html = renderToStaticMarkup(createElement(MandatoryConstraintsCard, {
      wedding,
      role: 'mc',
    }));
    expect(html).toContain('Religious wedding ceremony at St. Mary');
  });

  it('shows civil ceremony and translation help in MC view', () => {
    const html = renderToStaticMarkup(createElement(CeremonyCueCard, {
      wedding: weddingWith({
        type: 'CIVIL',
        mcTranslationHelpRequested: true,
        location: 'Town Hall',
      }),
      role: 'mc',
    }));
    expect(html).toContain('Civil ceremony');
    expect(html).toContain('MC translation help requested');
  });

  it('shows humanist ceremony in MC view', () => {
    const html = renderToStaticMarkup(createElement(CeremonyCueCard, {
      wedding: weddingWith({ type: 'HUMANIST', location: 'Garden' }),
      role: 'mc',
    }));
    expect(html).toContain('Humanist ceremony');
  });

  it('never exposes ceremony details outside MC', () => {
    const wedding = weddingWith({ type: 'CIVIL', mcTranslationHelpRequested: true });
    for (const role of ['dj', 'photographer_1', 'speaker', 'venue_manager']) {
      expect(renderToStaticMarkup(createElement(CeremonyCueCard, { wedding, role }))).toBe('');
    }
  });
});
