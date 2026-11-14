import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #550 per-step MC cues', () => {
  it('declares mcCues on the step schema with language, timing and text', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    const step = schema.$defs.step;
    expect(step.properties.mcCues.items.$ref).toBe('#/$defs/mcCue');
    expect(schema.$defs.mcCue.required).toContain('text');
    expect(schema.$defs.mcCue.properties.language.$ref).toBe('#/$defs/language');
  });

  it('maps NOTES rows by stable Step ID and stops populating mcCues', () => {
    const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
    const result = googleDocTemplateToCartridge(parsed);
    const entrance = result.cartridge.steps.find((step) => step.id === 'step_03');
    expect(entrance.notes).toBe(
      'Keep the newlyweds by the door until the MC announces them.',
    );
    expect(entrance.mcCues).toBeUndefined();
    expect(
      result.cartridge.steps.find((step) => step.id === 'step_01').notes,
    ).toBe('Guests gather in the garden for the aperitif.');
  });

  it('renders the Notes block instead of MC Cues', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('{currentStep.notes ? (');
    expect(view).toContain("t('mc.step.notesTitle')");
    expect(view).not.toContain('mcCues.map((cue, index)');
    expect(view).not.toContain("t('mc.cues.empty')");
  });

  it('carries MC cues on the demo Grand Entrance step', () => {
    const entrance = DEMO_WEDDING.steps.find((step) => step.id === 'step_03');
    expect(entrance.mcCues).toHaveLength(3);
    expect(entrance.mcCues[0].language).toBe('PL');
  });
});
