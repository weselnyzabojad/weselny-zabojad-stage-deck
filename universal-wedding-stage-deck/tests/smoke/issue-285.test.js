import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #285 wedding closure step', () => {
  it('does not add closure as a predefined timeline step', () => {
    const titles = DEMO_WEDDING.steps.map((step) => step.title);
    expect(titles).not.toContain('Wedding closure');
    expect(DEMO_WEDDING.steps.map((step) => step.id)).not.toContain('step_12');
  });
  it('stores closure/extension/last song data', () => {
    expect(DEMO_WEDDING.mandatorySteps.closureTime).toBe('02:00');
    expect(DEMO_WEDDING.mandatorySteps.closureExtensionAllowed).toBe(true);
    expect(DEMO_WEDDING.mandatorySteps.lastSong).toBeTruthy();
  });
  it('shows closure on MC and DJ VIP only, with last song on DJ VIP', () => {
    const banner = read('src/components/WeddingClosureBanner.jsx');
    expect(banner).toContain("role === 'mc'");
    expect(banner).toContain("role === 'dj' && isVipDj");
    expect(banner).toContain('closure.lastSong');
  });
});
