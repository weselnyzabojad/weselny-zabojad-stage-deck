import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VendorPresenceBars from '../src/components/VendorPresenceBars.jsx';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';
import { buildVendorPresence } from '../src/lib/endHours.js';

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

describe('issue #1084 DJ vendor presence bars', () => {
  it('keeps upcoming and active rows and hides ended rows', () => {
    const rows = buildVendorPresence(wedding, '16:00');
    expect(rows.map((row) => row.name)).toEqual(['Anna', 'Magda', 'Ola', 'Late']);
    expect(rows[1].state).toBe('active');
    expect(rows[2].state).toBe('active');
    expect(rows[3].state).toBe('upcoming');
  });

  it('requires both start and end and handles the end boundary', () => {
    const atEnd = buildVendorPresence(wedding, '21:30');
    expect(atEnd.map((row) => row.name)).toContain('Magda');

    const afterEnd = buildVendorPresence(wedding, '21:31');
    expect(afterEnd.map((row) => row.name)).not.toContain('Magda');
    expect(afterEnd.map((row) => row.name)).not.toContain('No start');
  });

  it('keeps cross-midnight windows until their next-day end', () => {
    expect(buildVendorPresence(wedding, '23:00').map((row) => row.name)).toContain('Late');
    expect(buildVendorPresence(wedding, '00:45').map((row) => row.name)).not.toContain('Late');
  });

  it('collapses to nothing without a live clock or qualifying rows', () => {
    expect(buildVendorPresence(wedding, null)).toEqual([]);
    expect(buildVendorPresence({}, '12:00')).toEqual([]);
    expect(
      render(createElement(VendorPresenceBars, { wedding: {}, nowClock: '12:00' })),
    ).toBe('');
  });

  it('renders one horizontal bar per vendor with role, window and status', () => {
    const html = render(createElement(VendorPresenceBars, { wedding, nowClock: '16:00' }));
    expect(html).toContain('Magda');
    expect(html).toContain('Photographer');
    expect(html).toContain('14:00');
    expect(html).toContain('21:30');
    expect(html).toContain('On site');
    expect(html).toContain('Upcoming');
    expect(html.match(/<li/g) ?? []).toHaveLength(4);
  });

  it('renders the footer inside the current column of the shared stack', () => {
    const html = render(
      createElement(TimelineFocusStack, {
        entries: [
          {
            index: 0,
            step: { id: 's1', title: 'Dinner', type: 'FLEXIBLE', durationMin: 15 },
            isActive: true,
            isDone: false,
            projectedStart: '16:00',
            projectedEnd: '16:15',
          },
        ],
        activeIndex: 0,
        currentFooter: createElement('span', { 'data-testid': 'footer' }, 'presence'),
      }),
    );
    expect(html).toContain('data-testid="footer"');
    expect(html).toContain('presence');
  });

  it('wires the presence stack and removes the old lane', () => {
    const view = read('src/components/DjBoothView.jsx');
    expect(view).toContain("import VendorPresenceBars from './VendorPresenceBars'");
    expect(view).toContain('currentFooter={vendorPresence}');
    expect(view).toContain('currentFooter={currentColumnFooter}');
    expect(view).not.toContain('DjEndHourLane');
    expect(view).not.toContain('dj-end-hour-lane');
  });
});
