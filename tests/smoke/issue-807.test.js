import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #807 service landing metadata and release docs', () => {
  const html = read('index.html');
  const landing = read('src/components/LandingPage.jsx');
  const readme = read('README.md');
  const project = read('project.md');

  it('describes the wedding MC/DJ service in static metadata', () => {
    expect(html).toContain('<html lang="pl"');
    expect(html).toContain('Weselny Żabojad — Konferansjer i DJ weselny FR / PL / EN');
    expect(html).toMatch(/<meta\s+name="description"/);
    expect(html).toContain('konferansjer i DJ weselny');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:url" content="https://deck.weselnyzabojad.pl/"');
    expect(html).toContain('property="og:image" content="https://deck.weselnyzabojad.pl/pwa-512x512.png"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:title"');
  });

  it('keeps a single contact CTA and adds no tracking', () => {
    expect(landing).toContain("const CONTACT_URL = 'https://www.weselnyzabojad.pl/#kontakt';");
    expect(landing).toContain('rel="noopener noreferrer"');
    expect(landing).not.toMatch(/tel:|wa\.me|mailto:|calendly|cal\.com/i);
    expect(landing).not.toMatch(/gtag|analytics|pixel|facebook\.net|hotjar/i);
    expect(html).not.toMatch(/googletagmanager|google-analytics|facebook\.net|hotjar/i);
  });

  it('documents the public route contract', () => {
    expect(readme).toContain('| `/` | Public service landing');
    expect(readme).toContain('| `/join` | Crew entry');
    expect(readme).toContain('| `/<roomCode>/<role>` | Role-scoped production deck |');
    expect(readme).toContain('Existing role QR links keep the');
    expect(project).toContain('### 17.45 Landing release metadata and public route contract');
    expect(project).toContain('single contact link');
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
