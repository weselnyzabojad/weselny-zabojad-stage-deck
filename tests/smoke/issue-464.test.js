import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AttractionStrip from '../../src/components/AttractionStrip.jsx';
import {
  resolveAttractionReminder,
  resolveActiveAttractions,
} from '../../src/lib/attractionReminders.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const at = (time) => new Date(`2026-08-20T${time}:00Z`);
const context = { eventDateISO: '2026-08-20', timeZone: 'UTC' };
const attraction = (overrides = {}) => ({
  id: 'photobooth',
  type: 'PHOTO_BOOTH',
  name: 'Fotobudka',
  startTime: '20:00',
  endTime: '23:30',
  location: 'Garden',
  provider: 'Foto Fun',
  ...overrides,
});

describe('issue #464 MC parallel attraction reminders', () => {
  it('derives every timing state from the shared clock', () => {
    expect(resolveAttractionReminder(attraction(), at('19:44'), context).state).toBe('UPCOMING');
    const announce = resolveAttractionReminder(attraction(), at('19:45'), context);
    expect(announce.state).toBe('ANNOUNCE');
    expect(announce.minutes).toBe(15);
    const available = resolveAttractionReminder(attraction(), at('20:00'), context);
    expect(available.state).toBe('AVAILABLE');
    expect(available.minutes).toBe(210);
    expect(resolveAttractionReminder(attraction(), at('23:30'), context).state).toBe('ENDED');
  });

  it('fails to a scheduled state without a usable clock', () => {
    expect(resolveAttractionReminder(attraction(), null, context).state).toBe('SCHEDULED');
    expect(
      resolveAttractionReminder(attraction(), at('19:50'), {
        eventDateISO: null,
        timeZone: 'UTC',
      }).state,
    ).toBe('SCHEDULED');
  });

  it('keeps active rows and hides ended reminders', () => {
    const items = resolveActiveAttractions(
      [
        attraction(),
        attraction({ id: 'guestbook', type: 'GUEST_BOOK', name: 'Guest book' }),
        attraction({ id: 'past', startTime: '18:00', endTime: '19:00', name: 'Past' }),
      ],
      { now: at('20:00'), ...context },
    );
    expect(items.map((item) => item.id)).toEqual(['photobooth', 'guestbook']);
  });

  it('supports multiple attractions with independent states', () => {
    const items = resolveActiveAttractions(
      [
        attraction(),
        attraction({ id: 'guestbook', type: 'GUEST_BOOK', name: 'Guest book', startTime: '22:00', endTime: '23:45' }),
      ],
      { now: at('20:00'), ...context },
    );
    expect(items.map((item) => item.reminder.state)).toEqual(['AVAILABLE', 'UPCOMING']);
  });

  it('renders announce, available and metadata text with a polite live region', () => {
    const announce = renderToStaticMarkup(
      createElement(AttractionStrip, {
        attractions: [attraction()],
        now: at('19:50'),
        ...context,
      }),
    );
    expect(announce).toContain('Parallel attractions');
    expect(announce).toContain('Photobooth');
    expect(announce).toContain('Fotobudka');
    expect(announce).toContain('20:00–23:30');
    expect(announce).toContain('Garden · Foto Fun');
    expect(announce).toContain('Announce now');
    expect(announce).toContain('Starts in 10 min');
    expect(announce).toContain('role="status"');
    expect(announce).toContain('aria-live="polite"');

    const available = renderToStaticMarkup(
      createElement(AttractionStrip, {
        attractions: [attraction({ type: 'POLAROIDS', name: 'Polaroids / Instax' })],
        now: at('20:10'),
        ...context,
      }),
    );
    expect(available).toContain('Polaroids / Instax');
    expect(available).toContain('Available now');
    expect(available).toContain('Available until 23:30');
    expect(available).toContain('Ends in 200 min');
  });

  it('renders nothing when every reminder has ended or no attractions exist', () => {
    expect(
      renderToStaticMarkup(
        createElement(AttractionStrip, {
          attractions: [attraction()],
          now: at('23:45'),
          ...context,
        }),
      ),
    ).toBe('');
    expect(
      renderToStaticMarkup(createElement(AttractionStrip, { attractions: [], now: at('20:00'), ...context })),
    ).toBe('');
  });

  it('mounts only in the MC view and persists nothing', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect((mc.match(/<AttractionStrip/g) ?? []).length).toBe(2);
    for (const file of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      expect(read(file), file).not.toContain('AttractionStrip');
    }
    const strip = read('src/components/AttractionStrip.jsx');
    expect(strip).not.toContain('localStorage');
    expect(strip).not.toContain('fetch(');
    expect(strip).not.toContain('supabase');
  });

  it('localizes all attraction labels', () => {
    for (const file of ['src/i18n/en.js', 'src/i18n/fr.js', 'src/i18n/pl.js']) {
      const source = read(file);
      for (const key of [
        'attraction.heading',
        'attraction.type.PHOTO_BOOTH',
        'attraction.type.GUEST_BOOK',
        'attraction.type.POLAROIDS',
        'attraction.type.OTHER',
        'attraction.announce',
        'attraction.startsIn',
        'attraction.available',
        'attraction.availableUntil',
        'attraction.endsIn',
      ]) {
        expect(source, `${file} ${key}`).toContain(`'${key}'`);
      }
    }
  });
});
