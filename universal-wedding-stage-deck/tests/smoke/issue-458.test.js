import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SongRequestSimulator from '../../src/dev/SongRequestSimulator.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #458 dev-only song request simulator', () => {
  it('is gated behind import.meta.env.DEV and dynamically imported', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain("const SongRequestSimulator = import.meta.env.DEV");
    expect(dj).toContain("lazy(() => import('../dev/SongRequestSimulator.jsx'))");
    expect(dj).toContain('{caps.devSimulator && SongRequestSimulator ? (');
    expect(dj).not.toMatch(/^import SongRequestSimulator/m);
  });

  it('renders a clearly marked local simulator', () => {
    const html = renderToStaticMarkup(createElement(SongRequestSimulator));
    expect(html).toContain('DEV — Song request simulator');
    expect(html).toContain('local only');
    expect(html).toContain('Add fake pending');
    expect(html).toContain('Guest-side preview');
  });

  it('supports two fake device ids and an independent cooldown', () => {
    const source = read('src/dev/SongRequestSimulator.jsx');
    expect((source.match(/createGuestDeviceId\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('COOLDOWN_MS = 10 * 60 * 1000');
    expect(source).toContain('lastCreated[deviceId]');
    expect(source).toContain('Reset device id');
    expect(source).toContain('resetCooldown');
  });

  it('simulates accept, deny and played without cloud calls', () => {
    const source = read('src/dev/SongRequestSimulator.jsx');
    for (const label of ['Accept', 'Deny', 'Played']) {
      expect(source).toContain(label);
    }
    expect(source).toContain("t('songRequest.acceptedTitle')");
    expect(source).toContain("t('songRequest.declinedTitle')");
    expect(source).toContain("t('songRequest.playedTitle')");
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('supabase');
    expect(source).not.toContain('submitSongRequest');
    expect(source).not.toContain('updateSongRequestStatus');
  });
});
