import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1026 Photo light-window refinement', () => {
  it('gives every light-window card more internal padding on wide and compact layouts', () => {
    const photo = read('src/components/PhotographerView.jsx');
    const padded = photo.match(/rounded-xl border border-line bg-page p-4 shadow-sm/g) ?? [];
    expect(padded.length).toBeGreaterThanOrEqual(8);
    expect(photo).toContain("t('photo.sunsetGolden')");
    expect(photo).toContain("t('photo.lightWindows')");
  });

  it('turns the Mini Session override into a refined white card', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('rounded-xl border border-line-strong bg-white p-4 text-center shadow-sm');
    expect(photo).toContain('focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/30');
    expect(photo).toContain("t('photo.chosenMiniHour')");
    expect(photo).toContain("t('photo.saveForAllMedia')");
  });

  it('keeps timing, countdown and override behaviour unchanged', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('buildSunsetCountdowns');
    expect(photo).toContain('resolveSunset');
    expect(photo).toContain('onMiniSessionOverride');
    expect(photo).not.toContain('fetch(');
  });
});
