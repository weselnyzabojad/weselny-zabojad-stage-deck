import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSunset } from '../../src/lib/photoPlan.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #638 mini-session duration cleanup', () => {
  it('removes durationMin from the domain, example and main schema', () => {
    expect(
      json('schema/domains/mini-session.json').properties.miniSession.properties.durationMin,
    ).toBeUndefined();
    expect(json('schema/domains/mini-session.example.json').miniSession).not.toHaveProperty(
      'durationMin',
    );
    expect(
      json('schema/wedding-schema-v1.1.json').$defs.photoPlan.properties.miniSession
        .properties.durationMin,
    ).toBeUndefined();
  });

  it('keeps the remaining mini-session fields in demo and fixture data', () => {
    const demo = read('src/demo/demoWedding.js');
    expect(demo).not.toContain('miniSession: {\n      enabled: true,\n      latestStartMinutesBeforeSunset: 30,\n      durationMin');
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    expect(fixture.photoPlan.miniSession.durationMin).toBeUndefined();
    expect(fixture.photoPlan.miniSession.latestStartMinutesBeforeSunset).toBe(30);
  });

  it('no longer reads miniSession.durationMin', () => {
    expect(read('src/lib/photoPlan.js')).not.toContain('raw.durationMin');
    expect(read('src/lib/googleDocCartridge.js')).not.toContain('Mini session duration');
    expect(read('src/components/PhotographerView.jsx')).not.toContain(
      'miniSession?.durationMin',
    );
    expect(read('schema/google-doc-template.md')).not.toContain('Mini session duration');
  });

  it('does not map the removed template field', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.photoPlan.miniSession).not.toHaveProperty('durationMin');
    expect(result.cartridge.photoPlan.miniSession.location).toBeTruthy();
  });

  it('resolves the remaining mini-session fields', () => {
    const sunset = resolveSunset(json('schema/fixtures/real-jennifer-guillaume.json'));
    expect(sunset.miniSession.enabled).toBe(true);
    expect(sunset.miniSession).not.toHaveProperty('durationMin');
    expect(sunset.miniSession.location).toBeTruthy();
  });
});
