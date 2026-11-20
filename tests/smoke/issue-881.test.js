import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { resolveServicePackage } from '../../src/lib/importantSongs.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');
const parse = (source = template, options = {}) =>
  googleDocTemplateToCartridge(parseGoogleDocTemplate(source), options);

describe('issue #881 service-package contract', () => {
  it('uses one canonical servicePackage field with three valid values', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.required).toContain('servicePackage');
    expect(schema.required).not.toContain('hostingMode');
    expect(schema.properties.hostingMode).toBeUndefined();
    expect(schema.properties.servicePackage.enum).toEqual([
      'HOST_AND_DJ_VIP',
      'HOST_ONLY',
      'DJ_MC',
    ]);
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
  });

  it('round-trips the three valid Document values unchanged', () => {
    for (const value of ['HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP']) {
      const parsed = parse(template, { servicePackage: value });
      expect(parsed.errors).toEqual([]);
      expect(parsed.cartridge.servicePackage).toBe(value);
      expect(parsed.cartridge.extensions?.servicePackage).toBeUndefined();
    }
  });

  it('rejects legacy variants and an empty value with an actionable error', () => {
    for (const value of [
      'HOST_AND_DJ',
      'HOST_AND_DJ_STANDARD',
      'HOST_AND_DJ_SOLO',
      'MC_DJ',
      '',
    ]) {
      const parsed = parse(template, { servicePackage: value });
      expect(parsed.errors.join(' ')).toContain('Service package must be provided by the admin');
      expect(parsed.cartridge?.servicePackage ?? null).toBeNull();
    }
  });

  it('removes servicePackage from the Doc contract and keeps it in the schema', () => {
    expect(template).not.toContain('Service package:');
    const map = json('schema/google-doc-field-map.json');
    expect(map.files['wedding-cartridge.example.json']).not.toHaveProperty('servicePackage');
    expect(map.files['wedding-cartridge.example.json']).not.toHaveProperty('hostingMode');
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.required).toContain('servicePackage');
  });

  it('keeps a read-only legacy fallback for old cached cartridges', () => {
    expect(resolveServicePackage({ hostingMode: 'HOST_ONLY' })).toBe('HOST_ONLY');
    expect(resolveServicePackage({ hostingMode: 'HOST_AND_DJ' })).toBe('HOST_AND_DJ_VIP');
    expect(resolveServicePackage({ servicePackage: 'DJ_MC', hostingMode: 'HOST_ONLY' })).toBe(
      'DJ_MC',
    );
  });

  it('uses valid service packages in every fixture and example', () => {
    const valid = new Set(['HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP']);
    const files = [
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ];
    for (const file of files) {
      expect(valid.has(json(file).servicePackage)).toBe(true);
    }
  });
});
