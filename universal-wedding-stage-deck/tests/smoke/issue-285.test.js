import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #285 wedding closure step', () => {
  it('stores closure/extension/last song data on the closure step', () => {
    const closure = DEMO_WEDDING.steps.find(
      (step) => step.mandatory?.kind === 'CLOSURE',
    );
    expect(closure.time).toBe('02:00');
    expect(closure.mandatory.closureExtensionAllowed).toBe(true);
    expect(closure.mandatory.lastSong).toBeTruthy();
    expect(DEMO_WEDDING.steps.map((step) => step.id)).not.toContain('step_12');
  });
  it('shows closure on MC and DJ VIP only, with last song on DJ VIP', () => {
    const banner = read('src/components/WeddingClosureBanner.jsx');
    expect(banner).toContain("role === 'mc'");
    expect(banner).toContain("role === 'dj' && isVipDj");
    expect(banner).toContain('closure.lastSong');
  });
});
