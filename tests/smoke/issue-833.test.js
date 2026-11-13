import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import fr from '../../src/i18n/fr.js';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #833 landing feature grid cards', () => {
  it('styles seven white cards with gold hover borders and generous padding', () => {
    const landing = read('src/components/LandingPage.jsx');

    expect(landing).toContain('const FEATURE_ICON_PATHS = [');
    expect(landing.match(/^  'M/gm)).toHaveLength(7);
    expect(landing).toContain('rounded-2xl border border-[#C5A059]/20 bg-white p-6 text-center');
    expect(landing).toContain('hover:border-[#C5A059]/60');
    expect(landing).toContain('hover:-translate-y-0.5');
    expect(landing).toContain('transition-all duration-300');
    expect(landing).toContain('motion-reduce:transition-none');
    expect(landing).toContain('sm:p-8');
  });

  it('renders one minimalist gold line icon per card', () => {
    const landing = read('src/components/LandingPage.jsx');

    expect(landing).toContain('function FeatureIcon({ index })');
    expect(landing).toContain('bg-[#C5A059]/10 text-[#C5A059]');
    expect(landing).toContain('aria-hidden="true"');
    expect(landing).toContain('strokeWidth="1.5"');

    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html.match(/rounded-full bg-\[#C5A059\]\/10/g)).toHaveLength(7);
    for (let index = 1; index <= 7; index += 1) {
      expect(html).toContain(fr[`landing.features.${index}.title`]);
      expect(html).toContain(fr[`landing.features.${index}.body`]);
    }
  });
});
