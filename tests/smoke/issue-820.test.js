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
  it('ships the new hero lead in every locale', () => {
    expect(fr['landing.hero.lead']).toBe(
      'Le maître de cérémonie, le DJ, le photographe, le vidéaste, le manager de la salle et tout autre prestataire voient la même timeline en direct — même quand le réseau de la salle tombe.',
    );
    expect(pl['landing.hero.lead']).toContain('każdy inny usługodawca');
    expect(en['landing.hero.lead']).toContain('and any other vendor');
  });

  it('ships the four rewritten feature bodies', () => {
    expect(fr['landing.features.1.body']).toBe(
      'Chaque prestataire opère autour du même plan, sans partage de versions ni appels « et ensuite ? ».',
    );
    expect(fr['landing.features.3.body']).toBe(
      'Décaler la première danse ou étendre un bloc musical car la cuisine a besoin de temps supplémentaire ? L’information arrive immédiatement sur chaque appareil de chacun des prestataires.',
    );
    expect(fr['landing.features.4.body']).toBe(
      'Chaque prestataire voit uniquement les informations dont il a besoin, sans informations inutiles.',
    );
    expect(fr['landing.features.7.body']).toBe(
      'En fonction de l’offre choisie dans le cadre des services Weselny Żabojad, les invités peuvent envoyer des idées de chansons depuis leur téléphone.',
    );

    expect(pl['landing.features.3.body']).toContain('kuchnia potrzebuje dodatkowego czasu');
    expect(en['landing.features.7.body']).toContain('Depending on the package');
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
