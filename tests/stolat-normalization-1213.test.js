import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';
import { validateCartridge } from '../schema/validate-lib.mjs';
import { DEMO_WEDDING } from '../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');

function parseStoLat(status) {
  const source = template.replace(
    /^\| stoLat \|.*\|$/m,
    `| stoLat | ${status} |  |  |`,
  );
  const parsed = googleDocTemplateToCartridge(parseGoogleDocTemplate(source));
  return parsed;
}

describe('issue #1213 Sto Lat status normalization', () => {
  it('accepts and normalizes the three product values', () => {
    expect(parseStoLat('YES').cartridge.culturalRules.sto_lat.status).toBe('YES');
    expect(parseStoLat('yes').cartridge.culturalRules.sto_lat.status).toBe('YES');
    expect(parseStoLat('ON_REQUEST').cartridge.culturalRules.sto_lat.status).toBe(
      'ON_REQUEST',
    );
    expect(parseStoLat('ON REQUEST').cartridge.culturalRules.sto_lat.status).toBe(
      'ON_REQUEST',
    );
    expect(parseStoLat('on-request').cartridge.culturalRules.sto_lat.status).toBe(
      'ON_REQUEST',
    );
    expect(parseStoLat('NO').cartridge.culturalRules.sto_lat.status).toBe('NO');
  });

  it('normalizes legacy refusal values to NO without a warning', () => {
    for (const legacy of ['STRICT_NO', 'OFF', 'strict no']) {
      const parsed = parseStoLat(legacy);
      expect(parsed.cartridge.culturalRules.sto_lat.status).toBe('NO');
      expect(parsed.warnings).toEqual([]);
    }
  });

  it('fails safely to NO with a warning for unknown or empty values', () => {
    for (const value of ['MAYBE', '']) {
      const parsed = parseStoLat(value);
      expect(parsed.cartridge.culturalRules.sto_lat.status).toBe('NO');
      expect(
        parsed.warnings.some(
          (warning) =>
            warning.includes('CULTURAL RULES') &&
            warning.includes('mapped to NO'),
        ),
      ).toBe(true);
    }
  });

  it('keeps Gorzko and Bread & Salt unchanged', () => {
    const parsed = parseStoLat('YES');
    expect(parsed.cartridge.culturalRules.gorzko.status).toBe('IF_GUESTS_START');
    expect(parsed.cartridge.culturalRules.bread_salt.status).toBe('YES');
  });

  it('validates only the three Sto Lat values in both schema copies', async () => {
    for (const path of [
      'schema/domains/cultural-rules.json',
      'supabase/functions/_shared/domains/cultural-rules.json',
    ]) {
      const schema = JSON.parse(read(path));
      const status = schema.properties.culturalRules.properties.sto_lat.properties.status;
      expect(status.enum).toEqual(['YES', 'ON_REQUEST', 'NO']);
    }
    for (const path of ['schema/wedding-schema-v1.1.json', 'supabase/functions/_shared/wedding-schema-v1.1.json']) {
      const schema = JSON.parse(read(path));
      expect(schema.$defs.stoLatRule.properties.status.enum).toEqual([
        'YES',
        'ON_REQUEST',
        'NO',
      ]);
    }
    expect(await validateCartridge(parseStoLat('YES').cartridge)).toEqual([]);
    expect(await validateCartridge(parseStoLat('NO').cartridge)).toEqual([]);
    expect(await validateCartridge(parseStoLat('ON_REQUEST').cartridge)).toEqual([]);
  });

  it('ships the normalized fixtures and demo cartridge', () => {
    expect(DEMO_WEDDING.culturalRules.sto_lat.status).toBe('NO');
    const fixture = JSON.parse(read('schema/fixtures/real-jennifer-guillaume.json'));
    expect(fixture.culturalRules.sto_lat.status).toBe('NO');
    expect(['YES', 'ON_REQUEST', 'NO']).toContain(fixture.culturalRules.sto_lat.status);
  });

  it('documents the three Doc values and the KPI counting rule', () => {
    expect(template).toContain('`YES`, `ON_REQUEST` or `NO`');
    expect(template).toContain('counts for the Sto Lat KPI');
    expect(read('src/lib/googleDocCartridge.js')).toContain('YES or ON_REQUEST');
    const readme = read('schema/README.md');
    expect(readme).toContain('| `sto_lat` | `YES`, `ON_REQUEST`, `NO` |');
  });
});
