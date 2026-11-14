import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');

function cartridgeFor(line) {
  const source = line
    ? template.replace('Children expected: yes', line)
    : template.replace(/Children expected: yes\r?\n/, '');
  return googleDocTemplateToCartridge(parseGoogleDocTemplate(source)).cartridge;
}

describe('issue #452 childrenExpected end-to-end', () => {
  it('maps canonical and common boolean spellings', () => {
    for (const value of ['yes', 'true', '1', 'on', 'Y', 'ON']) {
      expect(cartridgeFor(`Children expected: ${value}`).childrenExpected, value).toBe(true);
    }
    for (const value of ['no', 'false', '0', 'off', 'N', 'OFF']) {
      expect(cartridgeFor(`Children expected: ${value}`).childrenExpected, value).toBe(false);
    }
  });

  it('treats a missing or blank row as false', () => {
    expect(cartridgeFor('').childrenExpected).toBe(false);
    expect(cartridgeFor('Children expected:').childrenExpected).toBe(false);
    expect(cartridgeFor('Children expected: maybe').childrenExpected).toBe(false);
  });

  it('preserves explicit false through parse, cartridge and schema validation', async () => {
    const cartridge = cartridgeFor('Children expected: no');
    expect(cartridge.childrenExpected).toBe(false);
    expect(JSON.parse(JSON.stringify(cartridge)).childrenExpected).toBe(false);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('rejects non-boolean childrenExpected values', async () => {
    const cartridge = cartridgeFor('Children expected: yes');
    const errors = await validateCartridge({ ...cartridge, childrenExpected: 'yes' });
    expect(errors.some((error) => error.location.endsWith('/childrenExpected'))).toBe(true);
  });

  it('keeps the template, example and demo aligned', async () => {
    expect(template).toContain('Children expected: yes');
    const manifest = read('src/lib/googleDocTemplate.js');
    expect(manifest).toContain("'childrenExpected'");
    const example = JSON.parse(read('schema/wedding-cartridge.example.json'));
    expect(typeof example.childrenExpected).toBe('boolean');
    expect(await validateCartridge(example)).toEqual([]);
    expect(typeof DEMO_WEDDING.childrenExpected).toBe('boolean');
  });
});
