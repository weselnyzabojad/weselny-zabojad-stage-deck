import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';
import { collectSemanticErrors } from '../src/lib/cartridgeValidation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const template = () => read('schema/google-doc-template.md');

function map(doc) {
  return googleDocTemplateToCartridge(parseGoogleDocTemplate(doc));
}

describe('issue #930 required content-language contract', () => {
  it('defines the ordered language domain and references it from extensions', () => {
    const domain = json('schema/domains/languages.json');
    expect(domain.$id).toContain('languages.json');
    expect(domain.properties.languages.required).toEqual(['supported']);
    expect(domain.properties.languages.properties.supported.minItems).toBe(1);
    expect(domain.properties.languages.properties.supported.uniqueItems).toBe(true);
    expect(json('schema/wedding-schema-v1.1.json').properties.extensions.properties.languages.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/languages.json#/properties/languages',
    );
    expect(
      json('supabase/functions/_shared/wedding-schema-v1.1.json').properties.extensions.properties
        .languages.$ref,
    ).toContain('languages.json');
  });

  it('maps and uppercases the ordered Supported list', () => {
    const result = map(template().replace('Supported: PL, FR, EN', 'Supported: pl, fr, en'));
    expect(result.errors).toEqual([]);
    expect(result.cartridge.extensions.languages.supported).toEqual(['PL', 'FR', 'EN']);
  });

  it('rejects a missing or empty Supported list with a clear error', () => {
    const missing = map(template().replace(/Supported: PL, FR, EN\r?\n/, ''));
    expect(missing.errors.join('\n')).toContain('LANGUAGES: Supported must list at least one');
    const empty = map(template().replace('Supported: PL, FR, EN', 'Supported:'));
    expect(empty.errors.join('\n')).toContain('LANGUAGES: Supported must list at least one');
  });

  it('rejects non ISO 639-1 codes', () => {
    const result = map(template().replace('Supported: PL, FR, EN', 'Supported: Polish, EN'));
    expect(result.errors.join('\n')).toContain('two-letter ISO 639-1');
  });

  it('blocks publication when an existing cartridge lacks languages', () => {
    const errors = collectSemanticErrors({ steps: [] });
    expect(errors).toContainEqual({
      location: '/extensions/languages/supported',
      message: 'extensions.languages.supported must list at least one language',
    });
  });

  it('allows any two-letter code and normalizes uppercase on publish', () => {
    const semantics = read('supabase/functions/_shared/cartridgeSemantics.js');
    expect(semantics).toContain("code.trim().toUpperCase()");
    expect(semantics).toContain("'extensions.languages.supported must list at least one language'");
    expect(json('schema/domains/languages.json').properties.languages.properties.supported.items.pattern).toBe(
      '^[A-Za-z]{2}$',
    );
  });

  it('keeps every valid fixture publishable and every invalid fixture language-complete', () => {
    for (const file of [
      'schema/fixtures/valid-minimal.json',
      'schema/fixtures/valid-speeches.json',
      'schema/fixtures/valid-timeline.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      expect(json(file).extensions.languages.supported.length).toBeGreaterThan(0);
    }
    expect(json('schema/fixtures/invalid-missing-languages.json').extensions).toBeUndefined();
  });

  it('warns admins when a wedding cannot publish without languages', () => {
    expect(read('supabase/functions/admin_api/index.ts')).toContain('Content languages missing');
    expect(read('src/admin/AdminApp.jsx')).toContain('wedding.languageWarning');
    expect(read('src/lib/googleDocTemplate.js')).toContain(
      "schemaPath: ['extensions', 'extensions.languages']",
    );
    expect(read('schema/google-doc-template.md')).toContain(
      '`Supported` is the required ordered list of ISO 639-1 codes',
    );
  });

  it('does not introduce a separate contentLanguages field', () => {
    for (const path of [
      'schema/wedding-schema-v1.1.json',
      'schema/domains/languages.json',
      'src/lib/googleDocCartridge.js',
      'supabase/functions/admin_api/index.ts',
    ]) {
      expect(read(path)).not.toContain('contentLanguages');
    }
  });
});
