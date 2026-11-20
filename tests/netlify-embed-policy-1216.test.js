import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const netlify = read('netlify.toml');
const docs = read('docs/wordpress-embed-snippet.md');

function block(prefix) {
  const start = netlify.indexOf(`for = "${prefix}"`);
  const next = netlify.indexOf('[[headers]]', start);
  return netlify.slice(start, next === -1 ? undefined : next);
}

const embed = block('/embed/*');
const global = block('/*');
const cspOf = (source) => /Content-Security-Policy = "([^"]+)"/.exec(source)?.[1] ?? '';

describe('issue #1216 Netlify embed policy and WordPress handoff', () => {
  it('places the embed rule before the global rule so the first match wins', () => {
    expect(embed.length).toBeGreaterThan(0);
    expect(global.length).toBeGreaterThan(0);
    expect(netlify.indexOf('for = "/embed/*"')).toBeLessThan(
      netlify.indexOf('for = "/*"'),
    );
  });

  it('allows only the two WordPress origins to frame /embed/*', () => {
    const csp = cspOf(embed);
    expect(csp).toContain(
      "frame-ancestors 'self' https://www.weselnyzabojad.pl https://weselnyzabojad.pl;",
    );
    expect(csp).not.toMatch(/frame-ancestors[^;]*\*/);
    expect(csp).not.toContain('http://');
  });

  it('keeps frame-ancestors none everywhere else', () => {
    expect(cspOf(global)).toContain("frame-ancestors 'none';");
  });

  it('removes the global X-Frame-Options header', () => {
    expect(netlify).not.toContain('X-Frame-Options =');
    expect(netlify).not.toContain('X-Frame-Options:');
  });

  it('keeps every other CSP directive identical', () => {
    const stripAncestors = (csp) => csp.replace(/frame-ancestors [^;]+;\s*/, '');
    expect(stripAncestors(cspOf(embed))).toBe(stripAncestors(cspOf(global)));
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "script-src 'self'",
      "frame-src 'none'",
      "form-action 'self'",
      'upgrade-insecure-requests',
      "worker-src 'self' blob:",
    ]) {
      expect(cspOf(embed)).toContain(directive);
      expect(cspOf(global)).toContain(directive);
    }
  });

  it('keeps the other security headers on both paths', () => {
    for (const header of [
      'Strict-Transport-Security',
      'X-Content-Type-Options = "nosniff"',
      'Referrer-Policy = "strict-origin-when-cross-origin"',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy = "same-origin"',
      'Cross-Origin-Resource-Policy = "same-origin"',
    ]) {
      expect(embed).toContain(header);
      expect(global).toContain(header);
    }
  });

  it('documents a responsive iframe, language, theme, heights and security', () => {
    expect(docs).toContain('<iframe');
    expect(docs).toContain('https://deck.weselnyzabojad.pl/embed/season-stats?lang=pl');
    expect(docs).toContain('?lang=fr');
    expect(docs).toContain('?lang=en');
    expect(docs).toContain('?theme=transparent');
    expect(docs).toContain('| Mobile (< 768px) | 240px | 200px |');
    expect(docs).toContain('| Desktop (≥ 768px) | 160px | 130px |');
    expect(docs).toContain('next-wedding strip');
    expect(docs).toContain('https://www.weselnyzabojad.pl');
    expect(docs).toContain('https://weselnyzabojad.pl');
    expect(docs).toContain("frame-ancestors 'none'");
    expect(docs).toContain('no global `X-Frame-Options`');
    expect(docs).toContain('never returns couple names');
    expect(docs).toContain('loading="lazy"');
    expect(docs).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });
});
