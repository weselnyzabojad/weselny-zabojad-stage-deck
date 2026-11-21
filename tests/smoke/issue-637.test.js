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
  it('removes the retired Oczepiny fields and uses songs/decidedByDj', () => {
    const domain = json('schema/domains/oczepiny.json');
    const ocz = domain.properties.oczepiny.properties;
    expect(ocz.winnerPhoto.properties.replacesWinnersDance).toBeUndefined();
    expect(ocz.photographerBriefed).toBeUndefined();
    expect(ocz.subEvents.items.properties.durationMin).toBeUndefined();
    expect(ocz.game.properties.type).toBeUndefined();
    expect(ocz.game.properties.notes).toBeUndefined();
    expect(ocz.variant).toBeUndefined();
    expect(ocz.throwings).toBeUndefined();
    expect(ocz.music.properties.songs.type).toBe('array');
    expect(ocz.music.properties.decidedByDj.type).toBe('boolean');
    expect(ocz.countdown.properties.mode.enum).toEqual(['SONGS', 'MC_MIC_COUNTDOWN']);
  });

  it('updates example, demo and fixture data', () => {
    for (const path of [
      'schema/domains/oczepiny.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const ocz = json(path).oczepiny ?? json(path).photoPlan?.oczepiny;
      expect(ocz.winnerPhoto).not.toHaveProperty('replacesWinnersDance');
      expect(ocz.photographerBriefed).toBeUndefined();
      expect(ocz.subEvents.every((event) => !('durationMin' in event))).toBe(true);
      expect(ocz.game).not.toHaveProperty('type');
      expect(Array.isArray(ocz.music.songs)).toBe(true);
      expect(typeof ocz.music.decidedByDj).toBe('boolean');
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('replacesWinnersDance');
  });

  it('resolves songs as an array and the DJ-choice flag', () => {
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    const oczepiny = resolveOczepiny(fixture, fixture.hardAnchors ?? []);
    expect(oczepiny.music).toEqual({
      songs: expect.any(Array),
      decidedByDj: expect.any(Boolean),
    });
    expect(oczepiny.winnerPhoto).not.toHaveProperty('replacesWinnersDance');
  });

  it('shows songs to MC and DJ VIP when provided', () => {
    const wedding = {
      oczepiny: {
        enabled: true,
        order: 'MIDNIGHT',
        music: { songs: ['Midnight', 'Party'], decidedByDj: false },
        winnerPhoto: { enabled: false },
      },
    };
    expect(render(wedding, 'mc')).toContain('Music: Midnight · Party');
    expect(render(wedding, 'dj-vip')).toContain('Music: Midnight · Party');
    expect(render(wedding, 'photo')).not.toContain('Music:');
  });

  it('shows countdown only to MC when countdown mode is MC_MIC_COUNTDOWN', () => {
    const wedding = {
      oczepiny: {
        enabled: true,
        order: 'MIDNIGHT',
        music: { songs: [], decidedByDj: false },
        countdown: { mode: 'MC_MIC_COUNTDOWN' },
        winnerPhoto: { enabled: false },
      },
    };
    expect(render(wedding, 'mc')).toContain('MC countdown');
    expect(render(wedding, 'mc')).not.toContain('Music:');
    expect(render(wedding, 'dj-vip')).not.toContain('>MC countdown<');
  });
});
