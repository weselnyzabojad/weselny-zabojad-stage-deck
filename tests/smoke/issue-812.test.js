import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #812 deck landing metadata and release docs', () => {
  const html = read('index.html');
  const landing = read('src/components/LandingPage.jsx');
  const readme = read('README.md');
  const project = read('project.md');

  it('describes the Stage Deck product in static metadata', () => {
    expect(html).toContain('<html lang="pl"');
    expect(html).toContain('<title>Stage Deck — wspólny plan wesela dla Was i całej ekipy</title>');
    expect(html).toMatch(/<meta\s+name="description"/);
    expect(html).toContain('Stage Deck to jeden wspólny, działający offline plan dnia');
    expect(html).toContain('property="og:site_name" content="Stage Deck"');
    expect(html).toContain('property="og:title" content="Stage Deck');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:url" content="https://deck.weselnyzabojad.pl/"');
    expect(html).toContain('name="twitter:card"');
    expect(html).not.toMatch(/konferansjer|MC\/DJ|DJ weselny/i);
  });

  it('keeps the single contact CTA and no tracking', () => {
    expect(landing).toContain("url.searchParams.set('prefill'");
    expect(landing).toContain("url.hash = 'kontakt'");
    expect(landing).not.toContain('https://www.weselnyzabojad.pl/#kontakt');
    expect(landing).toContain('rel="noopener noreferrer"');
    expect(landing).not.toMatch(/tel:|wa\.me|mailto:|calendly|cal\.com/i);
    expect(landing).not.toMatch(/gtag|analytics|pixel|facebook\.net|hotjar/i);
    expect(html).not.toMatch(/googletagmanager|google-analytics|facebook\.net|hotjar/i);
  });

  it('documents the deck landing and public route contract', () => {
    expect(readme).toContain('| `/` | Public Stage Deck product landing');
    expect(readme).toContain('| `/join` | Crew entry');
    expect(readme).toContain('| `/<roomCode>/<role>` | Role-scoped production deck |');
    expect(readme).toContain('The public root presents the Stage Deck product');
    expect(project).toContain('### 17.47 Deck landing metadata and release contract');
    expect(project).toContain('Stage Deck product for future newlyweds');
  });

  it('adds no new third-party origin beyond the existing font hosts', () => {
    const origins = [...html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((match) =>
      match[1].toLowerCase(),
    );
    const allowed = new Set([
      'www.weselnyzabojad.pl',
      'deck.weselnyzabojad.pl',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ]);
    for (const origin of origins) expect(allowed.has(origin)).toBe(true);
  });
});
