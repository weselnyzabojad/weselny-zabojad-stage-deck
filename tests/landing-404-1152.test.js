import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('landing-only branded 404 (part of #1152)', () => {
  const html = read('release/landing/404.html');
  const css = read('release/landing/404.css');

  it('is a standalone Polish-first page with French and English support', () => {
    expect(html).toContain('<html lang="pl"');
    expect(html).toContain('<p class="eyebrow">Strona nie znaleziona</p>');
    expect(html).toContain('Tej strony nie ma na planie.');
    expect(html).toContain('<section class="translation" lang="fr">');
    expect(html).toContain('Cette page n’est pas au planning.');
    expect(html).toContain('<section class="translation" lang="en">');
    expect(html).toContain('This page isn’t on the schedule.');
  });

  it('stays out of search results', () => {
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).toContain('<title>404');
  });

  it('links back to the landing page and the contact site', () => {
    expect(html).toMatch(/href="\/">\s*Wróć na stronę główną/);
    expect(html).toContain('href="https://www.weselnyzabojad.pl/"');
    expect(html).toContain('Back to the landing page');
    expect(html).toContain('Contact us');
    expect(html).toContain('Revenir à la page d’accueil');
    expect(html).toContain('Nous contacter');
  });

  it('uses same-origin styling so the production CSP stays strict', () => {
    expect(html).toContain('<link rel="stylesheet" href="404.css" />');
    expect(html).not.toContain('<style');
    expect(html).not.toContain('<script');
    expect(css).toContain('--night: #070b19');
    expect(css).toContain('--gold: #c5a059');
  });

  it('keeps the page accessible and responsive', () => {
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('aria-labelledby="not-found-title"');
    expect(html).toContain('<main id="main" class="stage">');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 34rem)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
