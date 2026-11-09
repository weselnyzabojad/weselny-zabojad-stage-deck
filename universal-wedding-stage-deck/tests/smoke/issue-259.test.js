import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #259 DJ current-step song info', () => {
  const dj = read('src/components/DjBoothView.jsx');
  it('removes generic playlist and track chips', () => {
    expect(dj).not.toContain('step.dj.playlist');
    expect(dj).not.toContain('step.dj.track');
  });
  it('keeps cutoff and projected timing', () => {
    expect(dj).toContain('step.dj.cutoff');
    expect(dj).toContain("t('dj.projected')");
  });
  it('shows a main song only for flagged steps', () => {
    expect(dj).toContain('isMainSongRequired');
    expect(dj).toContain('Main song');
    expect(dj).toContain('getImportantSongs');
    expect(dj).toContain('song.stepId');
  });
});
