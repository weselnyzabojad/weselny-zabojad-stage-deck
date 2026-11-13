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

describe('issue #826 landing intro vision card', () => {
  it('keeps the full copy and adds a highlight phrase in every locale', () => {
    expect(fr['landing.intro.p1']).toContain(fr['landing.intro.p1.highlight']);
    expect(fr['landing.intro.p2']).toContain('Stage Deck');

    for (const dictionary of [fr, pl, en]) {
      expect(dictionary['landing.intro.p1'].trim()).not.toBe('');
      expect(dictionary['landing.intro.p1.highlight'].trim()).not.toBe('');
      expect(dictionary['landing.intro.p2'].trim()).not.toBe('');
      expect(dictionary['landing.intro.p2.highlight']).toBe('Stage Deck');
    }

    expect(fr['landing.intro.p1.highlight']).toBe('projet coconstruit');
    expect(pl['landing.intro.p1.highlight']).toBe('wspólnie tworzony projekt');
    expect(en['landing.intro.p1.highlight']).toBe('co-created project');
  });

  it('renders a layered card with both highlights in strong tags', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('rounded-3xl');
    expect(landing).toContain('bg-white/90 p-6 text-left shadow-xl shadow-slate-900/5');
    expect(landing).toContain('border-[#C5A059]/25 bg-[#FBF9F5]/80');
    expect(landing).toContain('viewBox="0 0 24 24"');
    expect(landing).toContain('function HighlightedText');

    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain(
      '<strong class="font-semibold not-italic text-[#8A6A2F]">projet coconstruit</strong>',
    );
    expect(html).toContain('<strong class="font-semibold text-[#8A6A2F]">Stage Deck</strong>');

    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain(fr['landing.intro.p1']);
    expect(text).toContain(fr['landing.intro.p2']);
  });

  it('keeps decorative visuals out of the accessibility tree', () => {
    const landing = read('src/components/LandingPage.jsx');
    const introStart = landing.indexOf('relative overflow-hidden rounded-3xl');
    const introEnd = landing.indexOf(
      '<section className="mx-auto w-full max-w-6xl',
      introStart,
    );
    const introBlock = landing.slice(introStart, introEnd);

    expect(introBlock).toContain('aria-hidden="true"');
    expect(introBlock).toContain('pointer-events-none');
    expect(introBlock).not.toContain('<a');
  });
});
