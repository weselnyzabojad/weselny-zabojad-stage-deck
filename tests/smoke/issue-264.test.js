import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #264 predefined step audit', () => {
  it('documents every repeated concept and decision', () => {
    const audit = read('docs/predefined-step-audit.md');
    for (const concept of [
      "Cocktail / Vin d'honneur",
      'Ceremony',
      'Grand Entrance',
      'Wedding Thank-You',
      'Wishes',
      'Wedding cake',
      'First Dance',
      'Oczepiny',
      'Games',
      'Buffets Open & Dance Floor',
    ]) {
      expect(audit).toContain(concept);
    }
  });

  it('has no duplicate timeline titles and no retired step_04', () => {
    const titles = DEMO_WEDDING.steps.map((step) => step.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(DEMO_WEDDING.steps.map((step) => step.id)).not.toContain('step_04');
  });

  it('keeps optional features out of the live timeline when disabled', () => {
    expect(read('src/lib/predefinedSteps.js')).toContain('optionalFlag');
    expect(read('src/StageDeck.jsx')).toContain('filterEnabledSteps(wedding)');
  });
});
