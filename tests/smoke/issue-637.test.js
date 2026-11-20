import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OczepinyCueCard from '../../src/components/OczepinyCueCard.jsx';
import { resolveOczepiny } from '../../src/lib/photoPlan.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const render = (wedding, audience) =>
  renderToStaticMarkup(createElement(OczepinyCueCard, { wedding, audience }));

describe('issue #637 Oczepiny cleanup and music/countdown modes', () => {
  it('removes the retired Oczepiny fields and makes playlist an array', () => {
    const domain = json('schema/domains/oczepiny.json');
    const ocz = domain.properties.oczepiny.properties;
    expect(ocz.winnerPhoto.properties.replacesWinnersDance).toBeUndefined();
    expect(ocz.photographerBriefed.properties.confirmed).toBeUndefined();
    expect(ocz.photographerBriefed.properties.confirmedAt).toBeUndefined();
    expect(ocz.photographerBriefed.properties.confirmedBy).toBeUndefined();
    expect(ocz.subEvents.items.properties.durationMin).toBeUndefined();
    expect(ocz.game.properties.type).toBeUndefined();
    expect(ocz.game.properties.notes).toBeUndefined();
    expect(ocz.music.properties.playlist.type).toBe('array');
  });

  it('updates example, demo and fixture data', () => {
    for (const path of [
      'schema/domains/oczepiny.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const ocz = json(path).oczepiny ?? json(path).photoPlan?.oczepiny;
      expect(ocz.winnerPhoto).not.toHaveProperty('replacesWinnersDance');
      expect(ocz.photographerBriefed).not.toHaveProperty('confirmed');
      expect(ocz.subEvents.every((event) => !('durationMin' in event))).toBe(true);
      expect(ocz.game).not.toHaveProperty('type');
      expect(Array.isArray(ocz.music.playlist)).toBe(true);
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('replacesWinnersDance');
  });

  it('resolves playlist as an array', () => {
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    const oczepiny = resolveOczepiny(fixture, fixture.hardAnchors ?? []);
    expect(oczepiny.music).toEqual({
      enabled: true,
      track: expect.any(String),
      playlist: expect.any(Array),
    });
    expect(oczepiny.winnerPhoto).not.toHaveProperty('replacesWinnersDance');
  });

  it('shows playlist to MC and DJ VIP when music is enabled', () => {
    const wedding = {
      oczepiny: {
        enabled: true,
        variant: 'MIDNIGHT',
        music: { enabled: true, track: 'Mix', playlist: ['Midnight', 'Party'] },
        winnerPhoto: { enabled: false },
      },
    };
    expect(render(wedding, 'mc')).toContain('Music: Midnight · Party');
    expect(render(wedding, 'dj-vip')).toContain('Music: Midnight · Party');
    expect(render(wedding, 'photo')).not.toContain('Music:');
  });

  it('shows countdown only to MC when music is disabled', () => {
    const wedding = {
      oczepiny: {
        enabled: true,
        variant: 'MIDNIGHT',
        music: { enabled: false, track: 'Mix', playlist: [] },
        countdown: { mode: 'MC' },
        winnerPhoto: { enabled: false },
      },
    };
    expect(render(wedding, 'mc')).toContain('MC countdown');
    expect(render(wedding, 'mc')).not.toContain('Music:');
    expect(render(wedding, 'dj-vip')).not.toContain('>MC countdown<');
  });
});
