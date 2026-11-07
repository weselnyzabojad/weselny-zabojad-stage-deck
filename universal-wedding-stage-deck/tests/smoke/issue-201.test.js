import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url));

describe('issue #201 Speeches as the only card below the MC timeline', () => {
  const mc = read('src/views/McMasterView.jsx');

  it('removes the duplicate Reel Clock card and operational cards from MC', () => {
    expect(mc).not.toContain('<ReelClock');
    expect(mc).not.toContain('<BufferAccordionCard');
    expect(mc).not.toContain('<HardAnchorRadar');
    expect(mc).not.toContain('<StagePingControls');
    expect(mc).not.toContain('Remote Stage Ping Ready');
  });

  it('keeps the top hard-anchor banner', () => {
    expect(mc).toContain('<HardAnchorAlertBanner');
  });

  it('deletes the now-unused MC-only components', () => {
    expect(exists('src/components/BufferAccordionCard.jsx')).toBe(false);
    expect(exists('src/components/HardAnchorRadar.jsx')).toBe(false);
    expect(exists('src/components/StagePingControls.jsx')).toBe(false);
  });

  it('keeps Reel Clock in the remaining role views', () => {
    expect(read('src/components/DjBoothView.jsx')).not.toContain('<ReelClock');
    expect(read('src/components/PhotographerView.jsx')).toContain('<ReelClock');
  });
});
