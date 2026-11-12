import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #591 speeches domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(json('schema/domains/speeches.json'))(json('schema/domains/speeches.example.json'))).toBe(true);
  });

  it('references the domain and removes the inline speech def', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.speeches.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/speeches.json#/properties/speeches',
    );
    expect(schema.$defs.speech).toBeUndefined();
  });

  it('removes speeches from the cartridge example and leaves speechMode in place', () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    expect(cartridge).not.toHaveProperty('speeches');
    expect(cartridge.liveSyncState.active_speech_id).toBeNull();
  });

  it('accepts script.sourceDoc without changing the text contract', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(json('schema/domains/speeches.json'));
    const source = json('schema/domains/speeches.example.json');
    source.speeches[0].script.sourceDoc = {
      provider: 'GOOGLE_DRIVE',
      fileId: '1AbC',
      url: 'https://docs.google.com/document/d/1AbC/edit',
      version: '42',
    };
    expect(validate(source)).toBe(true);

    source.speeches[0].script.sourceDoc = { provider: 'GOOGLE_DRIVE' };
    expect(validate(source)).toBe(false);
  });
});
