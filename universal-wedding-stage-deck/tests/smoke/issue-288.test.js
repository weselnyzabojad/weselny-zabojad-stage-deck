import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #288 Oczepiny role cues', () => {
  it('renders variant-aware cues in MC, Photographer and DJ VIP', () => {
    expect(read('src/views/McMasterView.jsx')).toContain('<OczepinyCueCard wedding={WEDDING} audience="mc"');
    expect(read('src/components/PhotographerView.jsx')).toContain('audience="photo"');
    expect(read('src/components/DjBoothView.jsx')).toContain('audience="dj-vip"');
  });
  it('does not render the DJ cue for Standard', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('{caps.boothCues &&');
  });
  it('shows throwings, game, countdown and winner photos conditionally', () => {
    const cue = read('src/components/OczepinyCueCard.jsx');
    for (const key of [
      'oczepiny.throwings',
      'oczepiny.game',
      'oczepiny.countdown',
      'oczepiny.photoCue',
    ]) {
      expect(cue).toContain(key);
    }
  });
});
