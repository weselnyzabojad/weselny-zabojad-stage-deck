import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import ComingSoonPage from '../src/components/ComingSoonPage.jsx';
import LandingPage from '../src/components/LandingPage.jsx';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import { setLocale } from '../src/i18n/index.js';
import { getMainSiteUrl } from '../src/lib/mainSite.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const DICTIONARIES = { en, fr, pl };

const EXPECTED = {
  en: {
    title: 'Coming soon',
    subtitle:
      'We are putting the finishing touches on this page. It will be live very soon. In the meantime, feel free to get in touch.',
    cta: "Let's talk about your event",
  },
  fr: {
    title: 'Bientôt disponible',
    subtitle:
      "Nous apportons les dernières touches à cette page. Elle sera disponible très prochainement. En attendant, n'hésitez pas à nous contacter.",
    cta: 'Parlons de votre événement',
  },
  pl: {
    title: 'Już wkrótce',
    subtitle:
      'Dopracowujemy ostatnie szczegóły tej strony. Wkrótce będzie dostępna. W międzyczasie zapraszamy do kontaktu.',
    cta: 'Porozmawiajmy o Waszym wydarzeniu',
  },
};

const normalise = (html) => html.replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
const renderDefault = () => normalise(renderToStaticMarkup(createElement(ComingSoonPage)));

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1297 reusable under-construction page', () => {
  it('defines the default copy in every locale', () => {
    for (const [locale, expected] of Object.entries(EXPECTED)) {
      expect(DICTIONARIES[locale]['underConstruction.title']).toBe(expected.title);
      expect(DICTIONARIES[locale]['underConstruction.subtitle']).toBe(expected.subtitle);
      expect(DICTIONARIES[locale]['underConstruction.cta']).toBe(expected.cta);
    }
  });

  it('renders the default page with one localized main-site CTA in every locale', () => {
    for (const [locale, expected] of Object.entries(EXPECTED)) {
      setLocale(locale, { persist: false });
      const html = renderDefault();
      expect(html).toContain(expected.title);
      expect(html).toContain(expected.subtitle);
      expect(html).toContain(expected.cta);
      expect(html).toContain(`href="${getMainSiteUrl(locale)}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html.match(/<a\s/g)).toHaveLength(1);
    }
  });

  it('supports optional title and subtitle keys', () => {
    setLocale('en', { persist: false });
    const html = normalise(
      renderToStaticMarkup(
        createElement(ComingSoonPage, {
          titleKey: 'landing.hero.title',
          subtitleKey: 'landing.hero.lead',
        }),
      ),
    );
    expect(html).toContain(en['landing.hero.title']);
    expect(html).toContain(en['landing.hero.lead']);
    expect(html).not.toContain(en['underConstruction.title']);
    expect(html).not.toContain(en['underConstruction.subtitle']);
  });

  it('updates title, subtitle and CTA immediately when the locale changes', () => {
    setLocale('fr', { persist: false });
    const french = renderDefault();
    expect(french).toContain(EXPECTED.fr.title);
    expect(french).toContain(EXPECTED.fr.cta);
    expect(french).not.toContain(EXPECTED.en.title);

    setLocale('pl', { persist: false });
    const polish = renderDefault();
    expect(polish).toContain(EXPECTED.pl.title);
    expect(polish).toContain(EXPECTED.pl.cta);
    expect(polish).not.toContain(EXPECTED.fr.title);
  });

  it('uses the shared public header and keeps the landing header contract', () => {
    const landing = read('src/components/LandingPage.jsx');
    const header = read('src/components/PublicHeader.jsx');
    const page = read('src/components/ComingSoonPage.jsx');

    expect(landing).toContain('<PublicHeader />');
    expect(landing).not.toContain('<header');
    expect(landing).not.toContain("from './LanguageToggle'");
    expect(page).toContain('<PublicHeader />');
    expect(header).toContain('LanguageToggle variant="desktop"');
    expect(header).toContain("from '../assets/img/logo.png'");
    expect(header).toContain("t('landing.hero.eyebrow')");
  });

  it('keeps the centered, responsive card contract and no hardcoded copy', () => {
    const page = read('src/components/ComingSoonPage.jsx');
    expect(page).toContain('flex min-h-screen flex-col');
    expect(page).toContain('flex flex-1 items-center justify-center p-6');
    expect(page).toContain('max-w-lg');
    expect(page).toContain('p-8');
    expect(page).toContain('sm:p-12');
    expect(page).toContain('rounded-full');
    expect(page).toContain('w-full');
    expect(page).toContain('sm:w-auto');
    expect(page).toContain('Sparkles');
    expect(page).toContain('aria-hidden="true"');
    expect(page).toContain("t('underConstruction.cta')");
    for (const expected of Object.values(EXPECTED)) {
      expect(page).not.toContain(expected.title);
      expect(page).not.toContain(expected.subtitle);
      expect(page).not.toContain(expected.cta);
    }
  });

  it('renders the under-construction page without the landing ribbon', () => {
    const html = renderDefault();
    expect(html).toContain('<header');
    expect(html).not.toContain(en['landing.ribbon.prefix']);
  });

  it('keeps the landing header in the rendered output after the extraction', () => {
    setLocale('en', { persist: false });
    const html = normalise(renderToStaticMarkup(createElement(LandingPage)));
    expect(html).toContain('<header');
    expect(html).toContain('Stage Deck');
    expect(html).toContain(en['landing.hero.eyebrow']);
    expect(html).toContain('role="radiogroup"');
  });
});
