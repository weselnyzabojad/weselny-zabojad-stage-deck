import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import fr from '../../src/i18n/fr.js';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const CONTACT_URL = 'https://www.weselnyzabojad.pl/#kontakt';

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #831 landing luxury contact CTA', () => {
  it('uses the champagne-gold finish with motion-safe hover and focus states', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf('function ContactCta');
    const end = landing.indexOf('function HighlightedText');
    const cta = landing.slice(start, end);

    expect(cta).toContain('bg-[#C5A059]');
    expect(cta).toContain('text-[#1A1A1A]');
    expect(cta).toContain('border border-[#D4AF37]/60');
    expect(cta).toContain('rounded-full');
    expect(cta).toContain('min-h-12');
    expect(cta).toContain('hover:bg-[#D4AF37]');
    expect(cta).toContain('shadow-lg shadow-[#C5A059]/20');
    expect(cta).toContain('transition-all duration-300');
    expect(cta).toContain('motion-safe:hover:-translate-y-0.5');
    expect(cta).toContain('motion-reduce:transition-none');
    expect(cta).toContain('active:translate-y-0');
  });

  it('renders an accessible sliding arrow and keeps copy and destination', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf('function ContactCta');
    const end = landing.indexOf('function HighlightedText');
    const cta = landing.slice(start, end);

    expect(cta).toContain('aria-hidden="true"');
    expect(cta).toContain('motion-safe:group-hover:translate-x-0.5');
    expect(cta).toContain('<path d="M4 10h11m-4-4 4 4-4 4" />');

    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html.split(fr['landing.hero.cta'])).toHaveLength(3);
    expect(html.split(`href="${CONTACT_URL}"`)).toHaveLength(3);
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
