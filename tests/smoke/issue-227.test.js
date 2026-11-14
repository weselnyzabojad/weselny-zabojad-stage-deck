import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #227 Photographer section cleanup', () => {
  const photo = read('src/components/PhotographerView.jsx');

  it('removes Oczepini, Media team, Venue access and Stage ping UI', () => {
    expect(photo).not.toContain('Oczepini cue');
    expect(photo).not.toContain('Media team');
    expect(photo).not.toContain('Venue access');
    expect(photo).not.toContain('StagePingBanner');
    expect(photo).not.toContain('stagePing');
  });

  it('removes the old timeline wrapper and keeps the main step stack', () => {
    expect(photo).not.toContain('Read-only timeline');
    expect(photo).toContain('<TimelineFocusStack');
  });

  it('keeps the footer and sunset view', () => {
    expect(photo).toContain('Read-only media view');
    expect(photo).toContain('photo.sunsetGolden');
  });
});
