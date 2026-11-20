import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSunset } from '../../src/lib/photoPlan.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #635 photo-plan sunset source/timezone cleanup', () => {
  it('removes both fields from the domain and example', () => {
    const domain = json('schema/domains/photo-plan.json');
    const sunset = domain.properties.photoPlan.properties.sunset;
    expect(sunset.properties.source).toBeUndefined();
    expect(sunset.properties.timezone).toBeUndefined();
    const example = json('schema/domains/photo-plan.example.json').photoPlan.sunset;
    expect(example).not.toHaveProperty('source');
    expect(example).not.toHaveProperty('timezone');
  });

  it('removes the fields from demo and fixture data', () => {
    expect(read('src/demo/demoWedding.js')).not.toContain('Sunset source');
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    expect(fixture.photoPlan.sunset).not.toHaveProperty('source');
    expect(fixture.photoPlan.sunset).not.toHaveProperty('timezone');
  });

  it('resolves sunset without source or timezone', () => {
    const sunset = resolveSunset({
      photoPlan: {
        sunset: {
          provider: 'sunrise-sunset.org',
          latitude: 51.05,
          longitude: 16.19,
          sunsetTime: '20:12',
          status: 'LIVE',
        },
      },
    });
    expect(sunset.provider).toBe('sunrise-sunset.org');
    expect(sunset).not.toHaveProperty('source');
    expect(sunset).not.toHaveProperty('timezone');
  });

  it('no longer maps the removed template keys', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.photoPlan.sunset).not.toHaveProperty('source');
    expect(result.cartridge.photoPlan.sunset).not.toHaveProperty('timezone');
  });
});
