import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const template = readFileSync(new URL('../schema/google-doc-template.md', import.meta.url), 'utf8');

describe('issue #1112 Ceremony sub-steps Doc contract', () => {
  it('maps the section onto steps[].ceremony.subSteps[]', () => {
    const result = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    const step = result.cartridge.steps.find((entry) => entry.id === 'step_02');
    expect(step.ceremony.subSteps).toEqual([
      {
        id: 'ceremony_entrance',
        time: '17:00',
        title: 'Bridal entrance',
        notes: 'Doors open; guests stand.',
        musicCue: 'Canon in D',
        responsibleRole: 'Musician',
      },
      {
        id: 'ceremony_vows',
        time: '17:15',
        title: 'Vows',
        notes: 'Microphones for the couple.',
        responsibleRole: 'MC',
      },
      {
        id: 'ceremony_rings',
        time: '17:25',
        title: 'Ring exchange',
        notes: 'Photographer moves to the altar.',
        responsibleRole: 'Musician',
      },
    ]);
  });

  it('registers the section in the template manifest', () => {
    const doc = readFileSync(new URL('../src/lib/googleDocTemplate.js', import.meta.url), 'utf8');
    expect(doc).toContain("marker: 'CEREMONY SUBSTEPS'");
    expect(doc).toContain("schemaPath: ['steps[].ceremony.subSteps']");
  });

  it('defines the schema and field map paths', () => {
    const schema = readFileSync(new URL('../schema/domains/steps.json', import.meta.url), 'utf8');
    const map = readFileSync(new URL('../schema/google-doc-field-map.json', import.meta.url), 'utf8');
    expect(schema).toContain('"subSteps"');
    expect(schema).toContain('"ceremonySubStep"');
    expect(map).toContain('"steps[].ceremony.subSteps[].id": "required"');
    expect(map).toContain('"steps[].ceremony.subSteps[].responsibleRole": "optional"');
  });

  it('keeps sub-steps informational rather than timeline steps', () => {
    const result = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    const ids = result.cartridge.steps.map((entry) => entry.id);
    expect(ids).not.toContain('ceremony_entrance');
    expect(result.cartridge.steps.filter((entry) => entry.id === 'step_02')).toHaveLength(1);
  });
});
