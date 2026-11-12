import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/i18n/index.js';
import SpeakerView from '../../src/components/SpeakerView.jsx';

const speechText = 'Drodzy Państwo — Zdrówko! 🥂\nLine two stays verbatim.';
const wedding = {
  weddingId: 'w1',
  coupleProfile: {
    bride: { firstName: 'A', nationalities: [] },
    groom: { firstName: 'B', nationalities: [] },
    commonLanguages: [],
  },
  date: '20.08.2026',
};
const activeSpeech = {
  speakerVisible: true,
  scriptAllowed: true,
  speaker: { name: 'Anna', relationship: 'Witness' },
  script: { text: speechText },
};

const render = (locale) => {
  setLocale(locale, { persist: false });
  return renderToStaticMarkup(
    createElement(SpeakerView, {
      wedding,
      clock: { nowClock: '21:45' },
      speechMode: 'COMPLEX',
      speechCount: 1,
      activeSpeech,
      theme: 'night',
      onToggleTheme: () => {},
    }),
  );
};

afterEach(() => setLocale('en', { persist: false }));

describe('issue #349 speaker view localization', () => {
  it('localizes speaker UI labels in FR and PL', () => {
    expect(render('fr')).toContain('Au micro');
    expect(render('fr')).toContain('Script en lecture seule');
    expect(render('pl')).toContain('Teraz mówi');
    expect(render('pl')).toContain('Skrypt tylko do odczytu');
  });

  it('keeps the speech text byte-for-byte identical in every locale', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const html = render(locale);
      expect(html).toContain(speechText.split('\n')[0]);
      expect(html).toContain('Line two stays verbatim.');
    }
  });

  it('localizes missing-script and empty states', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(
      createElement(SpeakerView, {
        wedding,
        clock: { nowClock: '21:45' },
        speechMode: 'COMPLEX',
        speechCount: 1,
        activeSpeech: {
          ...activeSpeech,
          script: { text: '' },
        },
        theme: 'night',
        onToggleTheme: () => {},
      }),
    );
    expect(html).toContain('Script pas encore fourni');
  });
});
