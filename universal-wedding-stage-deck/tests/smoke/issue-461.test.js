import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { resolveMusicPolicy } from '../../src/lib/musicPolicy.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');

function parsePolicy(line) {
  const source = line
    ? template.replace('Disco Polo policy: No', `Disco Polo policy: ${line}`)
    : template.replace(/Disco Polo policy: No\r?\n/, '');
  return googleDocTemplateToCartridge(parseGoogleDocTemplate(source));
}

describe('issue #461 discoPoloPolicy contract', () => {
  it('maps canonical values', () => {
    expect(parsePolicy('No').cartridge.musicPolicy.discoPoloPolicy).toBe('NO');
    expect(parsePolicy('Yes').cartridge.musicPolicy.discoPoloPolicy).toBe('YES');
    expect(parsePolicy('On request').cartridge.musicPolicy.discoPoloPolicy).toBe('ON_REQUEST');
  });

  it('accepts aliases and ignores case/whitespace', () => {
    for (const value of ['ON_REQUEST', 'on-request', 'request', 'by request']) {
      expect(parsePolicy(value).cartridge.musicPolicy.discoPoloPolicy, value).toBe('ON_REQUEST');
    }
    expect(parsePolicy(' true ').cartridge.musicPolicy.discoPoloPolicy).toBe('YES');
    expect(parsePolicy(' FALSE ').cartridge.musicPolicy.discoPoloPolicy).toBe('NO');
  });

  it('fails closed for missing, blank and unrecognised values with a warning', () => {
    for (const [value, label] of [['', 'missing'], ['   ', 'blank'], ['Maybe', 'invalid']]) {
      const result = parsePolicy(value);
      expect(result.cartridge.musicPolicy.discoPoloPolicy, label).toBe('NO');
      expect(result.warnings.some((warning) => warning.includes('Disco Polo')), label).toBe(true);
    }
  });

  it('accepts only the three schema enum values', async () => {
    const cartridge = parsePolicy('On request').cartridge;
    expect(await validateCartridge(cartridge)).toEqual([]);
    const errors = await validateCartridge({
      ...cartridge,
      musicPolicy: { ...cartridge.musicPolicy, discoPoloPolicy: 'MAYBE' },
    });
    expect(errors.some((error) => error.location.endsWith('/discoPoloPolicy'))).toBe(true);
  });

  it('exposes the policy from resolveMusicPolicy with a NO fallback', () => {
    expect(resolveMusicPolicy({ musicPolicy: { discoPoloPolicy: 'YES' } }).discoPoloPolicy).toBe('YES');
    expect(resolveMusicPolicy({ musicPolicy: { discoPoloPolicy: 'ON_REQUEST' } }).discoPoloPolicy).toBe(
      'ON_REQUEST',
    );
    expect(resolveMusicPolicy({ musicPolicy: { requestsOpen: true } }).discoPoloPolicy).toBe('NO');
    expect(resolveMusicPolicy({}).discoPoloPolicy).toBe('NO');
  });

  it('keeps the template, example and demo aligned', async () => {
    expect(template).toContain('Disco Polo policy: No');
    expect(read('src/lib/googleDocTemplate.js')).toContain("'musicPolicy.discoPoloPolicy'");
    const example = JSON.parse(read('schema/wedding-cartridge.example.json'));
    expect(['NO', 'YES', 'ON_REQUEST']).toContain(example.musicPolicy.discoPoloPolicy);
    expect(await validateCartridge(example)).toEqual([]);
    expect(['NO', 'YES', 'ON_REQUEST']).toContain(DEMO_WEDDING.musicPolicy.discoPoloPolicy);
  });
});
