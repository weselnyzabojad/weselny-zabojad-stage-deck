import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../../src/components/CulturalRulesBar.jsx';
import { resolveOczepinyIndicator } from '../../src/lib/oczepinyIndicator.js';

const wedding = {
  dateISO: '2026-08-20',
  venueDetails: { timezone: 'Europe/Warsaw' },
  oczepiny: {
    enabled: true,
    anchorId: 'oczepiny_midnight',
    subEvents: [
      { id: 'toss', durationMin: 10 },
      { id: 'ties', durationMin: 15 },
    ],
  },
  hardAnchors: [
    { id: 'oczepiny_midnight', time: '00:00', label: 'Oczepiny' },
  ],
};

describe('issue #73 Oczepiny indicator', () => {
  it('shows OFF when Oczepiny is not enabled', () => {
    const status = resolveOczepinyIndicator({
      wedding: { ...wedding, oczepiny: { ...wedding.oczepiny, enabled: false } },
      now: new Date('2026-08-20T22:10:00Z'),
    });

    expect(status.state).toBe('OFF');
    expect(status.active).toBe(false);
  });

  it('shows ON before the midnight block', () => {
    const status = resolveOczepinyIndicator({
      wedding,
      now: new Date('2026-08-20T21:50:00Z'), // 23:50 in Warsaw
    });

    expect(status.state).toBe('ON');
    expect(status.active).toBe(false);
  });

  it('shows ACTIVE inside the Oczepiny block', () => {
    const status = resolveOczepinyIndicator({
      wedding,
      now: new Date('2026-08-20T22:10:00Z'), // 00:10 in Warsaw
    });

    expect(status.state).toBe('ACTIVE');
    expect(status.active).toBe(true);
    expect(status.blockMinutes).toBe(25);
  });

  it('returns to ON after the block ends', () => {
    const status = resolveOczepinyIndicator({
      wedding,
      now: new Date('2026-08-20T22:30:00Z'), // 00:30 in Warsaw
    });

    expect(status.state).toBe('ON');
    expect(status.active).toBe(false);
  });

  it('renders Oczepiny and keeps Bread & Salt out of the bar', () => {
    const html = renderToStaticMarkup(
      createElement(CulturalRulesBar, {
        rules: {
          sto_lat: { status: 'YES' },
          gorzko: { status: 'STRICT_NO' },
          bread_salt: { status: 'YES' },
        },
        oczepinyStatus: { state: 'ACTIVE' },
      }),
    );

    expect(html).toContain('Sto Lat');
    expect(html).toContain('Gorzko');
    expect(html).toContain('Oczepiny');
    expect(html).toContain('ACTIVE');
    expect(html).not.toContain('Bread');
  });
});
