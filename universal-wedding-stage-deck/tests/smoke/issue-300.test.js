import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MusicPolicyCard from '../../src/components/MusicPolicyCard.jsx';
import { resolveMusicPolicy } from '../../src/lib/musicPolicy.js';

const importantSongs = [
  { id: 'first_dance', stepId: 'step_08', title: 'Perfect', artist: 'Ed Sheeran' },
  { id: 'grand_entrance', stepId: 'step_03', title: 'Marry You', artist: 'Bruno Mars' },
];
const wedding = {
  musicPolicy: {
    mustPlay: [{ id: 'first_dance', track: 'Perfect - Ed Sheeran' }],
    doNotPlay: [{ id: 'no_sto_lat', track: 'Sto lat' }],
    importantSongs,
  },
};
const timeline = [
  { step: { id: 'step_01', title: 'Cocktail', isMainSongRequired: false } },
  { step: { id: 'step_03', title: 'Grand Entrance', isMainSongRequired: true } },
  { step: { id: 'step_05', title: 'Wedding cake', isMainSongRequired: true } },
  { step: { id: 'step_08', title: 'First Dance', isMainSongRequired: true } },
];

describe('issue #300 main songs from flagged steps', () => {
  it('collects every flagged step in timeline order with resolved songs', () => {
    const policy = resolveMusicPolicy(wedding, new Date('2026-11-07T18:00:00Z'), { timeline });
    expect(policy.mainSongs.map((song) => song.stepId)).toEqual([
      'step_03',
      'step_05',
      'step_08',
    ]);
    expect(policy.mainSongs[0]).toMatchObject({
      stepTitle: 'Grand Entrance',
      title: 'Marry You',
      artist: 'Bruno Mars',
      missing: false,
    });
    expect(policy.mainSongs[2].title).toBe('Perfect');
  });

  it('keeps a visible missing state for flagged steps without a song', () => {
    const policy = resolveMusicPolicy(wedding, new Date('2026-11-07T18:00:00Z'), { timeline });
    expect(policy.mainSongs[1]).toMatchObject({
      stepId: 'step_05',
      stepTitle: 'Wedding cake',
      missing: true,
    });
  });

  it('does not duplicate a step that appears twice', () => {
    const policy = resolveMusicPolicy(wedding, new Date('2026-11-07T18:00:00Z'), {
      timeline: [...timeline, timeline[1]],
    });
    expect(policy.mainSongs.filter((song) => song.stepId === 'step_03')).toHaveLength(1);
  });

  it('shows the main songs and missing state in the Music Policy card', () => {
    const policy = resolveMusicPolicy(wedding, new Date('2026-11-07T18:00:00Z'), { timeline });
    const html = renderToStaticMarkup(createElement(MusicPolicyCard, { policy }));
    expect(html).toContain('Main songs by step');
    expect(html).toContain('Marry You');
    expect(html).toContain('Wedding cake');
    expect(html).toContain('Main song not set for this step.');
  });

  it('still works when the cartridge has no musicPolicy object', () => {
    const policy = resolveMusicPolicy(
      { musicPolicy: { importantSongs } },
      new Date('2026-11-07T18:00:00Z'),
      { timeline },
    );
    expect(policy.hasData).toBe(true);
    expect(policy.mainSongs).toHaveLength(3);
  });
});
