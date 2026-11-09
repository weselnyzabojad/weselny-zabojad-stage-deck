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

  it('attaches MC cues to steps by stable Step ID, preserving language', () => {
    const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
    const result = googleDocTemplateToCartridge(parsed);
    const entrance = result.cartridge.steps.find((step) => step.id === 'step_03');
    expect(entrance.mcCues.map((cue) => cue.language)).toEqual(['PL', 'FR', 'EN']);
    expect(entrance.mcCues.every((cue) => cue.timing === 'AT_START')).toBe(true);
    expect(entrance.mcCues.every((cue) => cue.text.trim().length > 0)).toBe(true);

    // Cues attach by Step ID, never by localized title: other steps have none.
    const cocktail = result.cartridge.steps.find((step) => step.id === 'step_01');
    expect(cocktail.mcCues).toBeUndefined();
  });

  it('renders per-step cues in the MC Cues box, not only the empty placeholder', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('currentStep?.mcCues');
    expect(view).toContain('mcCues.map((cue, index)');
    expect(view).toContain('mcCues.length === 0 && !childrenWarning');
  });

  it('carries MC cues on the demo Grand Entrance step', () => {
    const entrance = DEMO_WEDDING.steps.find((step) => step.id === 'step_03');
    expect(entrance.mcCues).toHaveLength(3);
    expect(entrance.mcCues[0].language).toBe('PL');
  });
});
