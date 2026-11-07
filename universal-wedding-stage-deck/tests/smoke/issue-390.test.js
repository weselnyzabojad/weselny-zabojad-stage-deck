import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #390 sunset data is photographer decision support only', () => {
  it('does not use photoPlan in planning, drift, durations or mandatory logic', () => {
    for (const file of [
      'src/lib/driftEngine.js',
      'src/lib/stepDurations.js',
      'src/lib/mandatorySteps.js',
      'src/lib/liveStageState.js',
    ]) {
      expect(read(file)).not.toContain('photoPlan');
      expect(read(file)).not.toMatch(/goldenHour|civilTwilight|latestMiniStart/);
    }
  });

  it('does not seed sunset hard anchors in demo or fixtures', () => {
    expect(DEMO_WEDDING.hardAnchors.map((anchor) => anchor.id)).not.toContain('sunset');
    for (const file of [
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      expect(read(file)).not.toContain('"id": "sunset"');
      expect(read(file)).not.toContain('"kind": "SUNSET"');
    }
  });

  it('keeps the photographer sunset card data available', () => {
    expect(DEMO_WEDDING.photoPlan.sunset.sunsetTime).toBe('20:12');
    expect(DEMO_WEDDING.photoPlan.sunset.goldenHourStart).toBe('19:32');
    expect(DEMO_WEDDING.photoPlan.sunset.civilTwilightEnd).toBe('20:48');
    expect(DEMO_WEDDING.photoPlan.miniSession.latestStartMinutesBeforeSunset).toBe(30);
  });
});
