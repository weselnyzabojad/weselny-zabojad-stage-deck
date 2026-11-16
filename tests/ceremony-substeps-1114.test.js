import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CeremonySubSteps from '../src/components/CeremonySubSteps.jsx';
import { ceremonySubStepBodies } from '../src/components/ceremonySubStepBodies.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const rows = [
  {
    id: 'ceremony_entrance',
    time: '17:00',
    title: 'Bridal entrance',
    notes: 'Doors open; guests stand.',
    musicCue: 'Canon in D',
    responsibleRole: 'Musician',
  },
  {
    id: 'ceremony_vows',
    time: '17:15',
    title: 'Vows',
    notes: 'Microphones for the couple.',
    responsibleRole: 'MC',
  },
];

const render = (detail) =>
  renderToStaticMarkup(createElement(CeremonySubSteps, { subSteps: rows, detail }));

describe('issue #1114 reduced Ceremony sub-steps on media and Venue Manager', () => {
  it('shows time, title, music cue and role on media views', () => {
    const html = render('media');
    expect(html).toContain('Ceremony parts (2)');
    expect(html).toContain('17:00');
    expect(html).toContain('Bridal entrance');
    expect(html).toContain('Music cue');
    expect(html).toContain('Canon in D');
    expect(html).toContain('Musician');
    expect(html).not.toContain('Doors open; guests stand.');
  });

  it('shows only time, title and role on the Venue Manager view', () => {
    const html = render('venue');
    expect(html).toContain('Ceremony parts (2)');
    expect(html).toContain('Bridal entrance');
    expect(html).toContain('Musician');
    expect(html).not.toContain('Music cue');
    expect(html).not.toContain('Canon in D');
    expect(html).not.toContain('Doors open; guests stand.');
  });

  it('keeps full detail available for the primary views', () => {
    const html = render('full');
    expect(html).toContain('Doors open; guests stand.');
    expect(html).toContain('Music cue');
  });

  it('stays collapsed, ordered and hides absent fields', () => {
    const html = render('media');
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(html.indexOf('Bridal entrance')).toBeLessThan(html.indexOf('Vows'));
    expect(html).not.toContain('>undefined<');
  });

  it('builds reduced bodies with the requested detail level', () => {
    const entries = [
      { step: { id: 'step_ceremony', ceremony: { subSteps: rows } } },
    ];
    const media = ceremonySubStepBodies(entries, 'media');
    const venue = ceremonySubStepBodies(entries, 'venue');
    expect(renderToStaticMarkup(media.step_ceremony)).not.toContain(
      'Doors open; guests stand.',
    );
    expect(renderToStaticMarkup(venue.step_ceremony)).not.toContain('Canon in D');
  });

  it('wires media and Venue Manager views without touching DJ Standard or Speaker', () => {
    const photo = read('src/components/PhotographerView.jsx');
    const venue = read('src/components/VenueManagerView.jsx');
    const dj = read('src/components/DjBoothView.jsx');
    const speaker = read('src/components/SpeakerView.jsx');
    expect(photo).toContain("ceremonySubStepBodies(timeline, 'media')");
    expect(venue).toContain("ceremonySubStepBodies(timeline, 'venue')");
    expect(photo.match(/entryBodies=\{cueBodies\}/g)).toHaveLength(2);
    expect(dj).toContain('caps.vip ? ceremonySubStepBodies(timeline) : null');
    expect(speaker).not.toContain('CeremonySubSteps');
  });
});
