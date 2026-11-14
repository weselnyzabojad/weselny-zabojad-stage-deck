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

describe('issue #830 landing hero glassmorphism card', () => {
  it('fixes the landing to the Mariage Chic light palette', () => {
    const landing = read('src/components/LandingPage.jsx');

    expect(landing).toContain('data-theme="day"');
    expect(landing).toContain('min-h-screen bg-[#FBF9F5] font-heading text-[#1A1A1A]');
    expect(landing).toContain('border-[#C5A059]/30');
    expect(landing).toContain('bg-white/90');
    expect(landing).toContain('shadow-xl shadow-slate-900/5');
    expect(landing).toContain('sm:p-10');
    expect(landing).toContain('font-body text-base italic');
  });

  it('renders a decorative gold SVG ornament above the hero heading', () => {
    const landing = read('src/components/LandingPage.jsx');
    const ornament = landing.indexOf('aria-hidden="true" className="mx-auto mb-5 flex');
    const heading = landing.indexOf('landing.hero.title');

    expect(ornament).toBeGreaterThan(-1);
    expect(ornament).toBeLessThan(heading);
    expect(landing.slice(ornament, heading)).toContain('stroke="currentColor"');
    expect(landing.slice(ornament, heading)).toContain('text-[#C5A059]');
  });

  it('keeps every locale copy and the hero heading intact', () => {
    for (const dictionary of [fr, pl, en]) {
      expect(dictionary['landing.intro.p1'].trim()).not.toBe('');
      expect(dictionary['landing.intro.p2'].trim()).not.toBe('');
      expect(dictionary['landing.hero.title'].trim()).not.toBe('');
    }

    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));
    const text = html.replace(/<[^>]+>/g, '');

    expect(text).toContain(fr['landing.intro.p1']);
    expect(text).toContain(fr['landing.intro.p2']);
    expect(text).toContain(fr['landing.hero.title']);
    expect(html).toContain('data-theme="day"');
  });
});
