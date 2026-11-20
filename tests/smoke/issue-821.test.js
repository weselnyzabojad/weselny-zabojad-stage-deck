import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { setLocale } from '../../src/i18n/index.js';

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #821 FAQ partner copy', () => {
  it('states that Stage Deck is included through Weselny Żabojad and its partners', () => {
    expect(fr['landing.faq.5.a']).toContain('sans le moindre frais supplémentaire');
    expect(fr['landing.faq.5.a']).toContain('partenaires privilégiés');
    expect(fr['landing.faq.5.a']).not.toContain('formulaire de contact');

    expect(pl['landing.faq.5.a']).toContain('sprawdzonych partnerów');
    expect(en['landing.faq.5.a']).toContain('trusted partners');
  });

  it('renders the updated FAQ answer', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain(fr['landing.faq.5.a']);
    expect(html).not.toContain('Écrivez via le formulaire de contact pour parler de votre mariage.');
  });
});
