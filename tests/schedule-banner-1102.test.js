import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ScheduleChangeBanner from '../src/components/ScheduleChangeBanner.jsx';

const update = {
  value: [{ id: 'first_dance', time: '22:15' }],
  updatedAt: '2026-08-20T21:00:00.000Z',
  role: 'mc',
  deviceId: 'device-mc',
  change: {
    kind: 'reschedule',
    stepId: 'first_dance',
    stepTitle: 'First Dance',
    from: '21:45',
    to: '22:15',
    authorRole: 'mc',
  },
};

const render = (role, next = update) =>
  renderToStaticMarkup(
    createElement(ScheduleChangeBanner, {
      weddingId: 'W-UM-2026-08-001',
      role,
      update: next,
    }),
  );

describe('issue #1102 schedule-change banner', () => {
  it('renders for DJ VIP, DJ Standard and media roles', () => {
    for (const role of ['dj', 'photo1', 'photo2', 'video']) {
      const html = render(role);
      expect(html).toContain('First Dance');
      expect(html).toContain('21:45');
      expect(html).toContain('22:15');
      expect(html).toContain('Dismiss');
    }
  });

  it('does not render for MC, Venue Manager, Speaker or DJ + MC', () => {
    for (const role of ['mc', 'dj_mc', 'venue_manager', 'speaker']) {
      expect(render(role)).toBe('');
    }
  });

  it('does not render for undo or a missing change payload', () => {
    expect(render('dj', { ...update, change: { ...update.change, kind: 'undo' } })).toBe('');
    expect(render('dj', { ...update, change: null })).toBe('');
    expect(render('dj', { ...update, value: null })).toBe('');
  });

  it('has no timeout and uses the acknowledgement pattern', () => {
    const html = render('dj');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('setTimeout');
    expect(readBanner()).toContain('acknowledgeUpdate');
    expect(readBanner()).toContain('isUpdateAcknowledged');
  });
});

function readBanner() {
  return readFileSync(
    new URL('../src/components/ScheduleChangeBanner.jsx', import.meta.url),
    'utf8',
  );
}
