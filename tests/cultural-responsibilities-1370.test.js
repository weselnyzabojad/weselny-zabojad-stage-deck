import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VenueCulturalRules from '../src/components/VenueCulturalRules.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1370 Venue Manager cultural-rule responsibilities', () => {
  it('shows only VENUE rules with rule and status', () => {
    const html = renderToStaticMarkup(
      createElement(VenueCulturalRules, {
        rules: {
          sto_lat: { status: 'YES', actor: 'VENUE' },
          gorzko: { status: 'STRICT_NO', actor: 'PARENTS' },
          bread_salt: { status: 'YES' },
        },
      }),
    );
    expect(html).toContain('Sto Lat');
    expect(html).toContain('YES');
    expect(html).not.toContain('Gorzko');
    expect(html).not.toContain('Bread &amp; Salt');
    expect(html).not.toContain('PARENTS');
  });

  it('shows an empty state when no rule is venue-owned', () => {
    const html = renderToStaticMarkup(
      createElement(VenueCulturalRules, {
        rules: {
          sto_lat: { status: 'YES', actor: 'PARENTS' },
          gorzko: { status: 'YES' },
        },
      }),
    );
    expect(html).toBe('');
  });

  it('is read-only and has no completion or mutation control', () => {
    const html = renderToStaticMarkup(
      createElement(VenueCulturalRules, {
        rules: { sto_lat: { status: 'YES', actor: 'VENUE' } },
      }),
    );
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('type="checkbox"');
  });

  it('is wired into the Venue Manager secondary bar', () => {
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).toContain('center={<VenueCulturalRules rules={wedding?.culturalRules} />}');
  });
});
