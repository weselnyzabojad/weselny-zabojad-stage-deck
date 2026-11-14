import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #820 landing feature copy and centered features', () => {
  it('ships the harmonised hero lead in every locale', () => {
    expect(fr['landing.hero.lead']).toContain('partagent le même planning en direct');
    expect(pl['landing.hero.lead']).toContain('dzielą ten sam plan na żywo');
    expect(en['landing.hero.lead']).toContain('share the same live schedule');
  });

  it('ships the rewritten feature bodies', () => {
    expect(fr['landing.features.1.body']).toContain('planning unique et partagé');
    expect(fr['landing.features.3.body']).toContain('Décalez la première danse');
    expect(fr['landing.features.4.body']).toContain('Sur-mesure pour chaque intervenant');
    expect(fr['landing.features.7.body']).toContain('selon la formule choisie');

    expect(pl['landing.features.3.body']).toContain('zmień tempo');
    expect(pl['landing.features.3.body']).not.toContain('kuchnia potrzebuje');
    expect(en['landing.features.7.body']).toContain('depending on the package');
  });

  it('keeps the included note on one desktop line and centers the features section', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('max-w-5xl');
    expect(landing).toContain('sm:whitespace-nowrap');
    expect(landing).toContain('id="landing-features" className="text-center"');
    expect(landing).toContain('bg-white p-6 text-center');
    expect(landing).not.toContain('id="landing-how" className=');
    expect(landing).not.toContain('id="landing-faq" className=');
  });

  it('renders the new lead and feature copy', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain(fr['landing.hero.lead']);
    expect(html).toContain(fr['landing.features.1.body']);
    expect(html).toContain(fr['landing.features.3.body']);
    expect(html).toContain(fr['landing.features.4.body']);
    expect(html).toContain(fr['landing.features.7.body']);
  });
});
