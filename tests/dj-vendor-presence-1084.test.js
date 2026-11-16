import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ActiveVendorsBar from '../src/components/ActiveVendorsBar.jsx';
import { buildActiveVendors } from '../src/lib/endHours.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

const wedding = {
  musicians: {
    items: [
      { id: 'anna', name: 'Anna', instrument: 'violin', startTime: '15:00', endTime: '21:00', active: true },
    ],
  },
  mediaTeam: [
    { id: 'photo', role: 'PHOTO', name: 'Magda', startTime: '14:00', endTime: '21:30' },
    { id: 'video', role: 'VIDEO', name: 'Ola', startTime: '14:30', endTime: '23:15' },
    { id: 'late', role: 'VIDEO', name: 'Late', startTime: '22:00', endTime: '00:30' },
    { id: 'end-only', role: 'PHOTO2', name: 'No start', endTime: '23:00' },
  ],
};

describe('issue #1142 active vendors bar', () => {
  it('keeps only vendors whose full window contains the live clock', () => {
    const rows = buildActiveVendors(wedding, '16:00');
    expect(rows.map((row) => row.name)).toEqual(['Anna', 'Magda', 'Ola']);
    expect(rows.map((row) => row.name)).not.toContain('Late');
    expect(rows.map((row) => row.name)).not.toContain('No start');
  });

  it('handles the end boundary and cross-midnight windows', () => {
    expect(buildActiveVendors(wedding, '21:30').map((row) => row.name)).toContain('Magda');
    expect(buildActiveVendors(wedding, '21:31').map((row) => row.name)).not.toContain('Magda');
    expect(buildActiveVendors(wedding, '23:00').map((row) => row.name)).toContain('Late');
    expect(buildActiveVendors(wedding, '00:45').map((row) => row.name)).not.toContain('Late');
  });

  it('collapses to nothing without a clock or active rows', () => {
    expect(buildActiveVendors(wedding, null)).toEqual([]);
    expect(buildActiveVendors({}, '12:00')).toEqual([]);
    expect(render(createElement(ActiveVendorsBar, { wedding: {}, nowClock: '12:00' }))).toBe('');
  });

  it('renders horizontal badges with name, role and departure/countdown', () => {
    const html = render(createElement(ActiveVendorsBar, { wedding, nowClock: '16:00' }));
    expect(html).toContain('Magda');
    expect(html).toContain('Photographer');
    expect(html).toContain('Until 21:30');
    expect(html.match(/<li/g) ?? []).toHaveLength(3);

    const countdown = render(createElement(ActiveVendorsBar, { wedding, nowClock: '21:10' }));
    expect(countdown).toContain('Ends in 20 min');
    expect(countdown).toContain('Until 23:15');
  });

  it('wires DJ VIP and Musician without the old surfaces', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const musician = read('src/components/MusicianView.jsx');
    expect(dj).toContain("import ActiveVendorsBar from './ActiveVendorsBar'");
    expect(dj).not.toContain('VendorPresenceBars');
    expect(dj).toContain('currentFooter={activeVendors}');
    expect(musician).toContain('<ActiveVendorsBar');
    expect(musician).toContain('currentFooter={<ActiveVendorsBar');
    expect(musician).not.toContain('<EndHoursCard');
  });
});
