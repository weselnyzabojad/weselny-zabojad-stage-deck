import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #551 ceremony script as Ceremony-step teleprompter', () => {
  const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
  const result = googleDocTemplateToCartridge(parsed);
  const ceremony = result.cartridge.steps.find((step) => step.id === 'step_02');

  it('maps the trilingual script verbatim to the Ceremony step teleprompter', () => {
    expect(ceremony.teleprompter).toMatchObject({
      has_script: true,
      type: 'SPEECH',
      title: 'Ceremony script',
    });
    expect(ceremony.teleprompter.items.map((item) => item.heading)).toEqual([
      'Welcome and Introduction',
      'The Pronouncement',
    ]);
    const welcome = ceremony.teleprompter.items[0];
    expect(welcome.lines.map((line) => line.lang)).toEqual(['PL', 'FR', 'EN']);
    expect(welcome.lines[0].text).toContain('Drodzy go\u015bcie');
    expect(welcome.lines[2].text).toContain('Welcome, family and friends');
  });

  it('leaves non-ceremony steps without a teleprompter', () => {
    const entrance = result.cartridge.steps.find((step) => step.id === 'step_03');
    expect(entrance.teleprompter).toBeUndefined();
  });

  it('registers the CEREMONY SCRIPT section in the manifest', () => {
    expect(read('src/lib/googleDocTemplate.js')).toContain("'CEREMONY SCRIPT'");
  });
});
