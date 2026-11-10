import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #262 new predefined steps', () => {
  it('adds the approved steps to the demo cartridge', () => {
    const titles = DEMO_WEDDING.steps.map((step) => step.title);
    for (const title of ['Wedding Thank-You', 'Wishes', 'First Dance', 'Oczepiny', 'Test Wiedzy', 'Test Zgodności']) {
      expect(titles).toContain(title);
    }
  });

  it('includes optional steps only when enabled', () => {
    const ids = filterEnabledSteps(DEMO_WEDDING).map((step) => step.id);
    expect(ids).toContain('step_07');
    expect(ids).toContain('step_09');
    expect(ids).toContain('step_10');
    expect(ids).toContain('step_11');

    const disabled = filterEnabledSteps({
      ...DEMO_WEDDING,
      steps: DEMO_WEDDING.steps.filter(
        (step) => !['step_07', 'step_10', 'step_11'].includes(step.id),
      ),
      oczepiny: { ...DEMO_WEDDING.oczepiny, enabled: false },
    }).map((step) => step.id);
    expect(disabled).not.toContain('step_07');
    expect(disabled).not.toContain('step_09');
    expect(disabled).not.toContain('step_10');
    expect(disabled).not.toContain('step_11');
  });

  it('keeps mandatory steps and applies the filter in StageDeck', () => {
    const ids = filterEnabledSteps({ ...DEMO_WEDDING, wishes: { enabled: false } }).map((s) => s.id);
    expect(ids).toContain('step_06');
    expect(ids).toContain('step_08');
    expect(read('src/StageDeck.jsx')).toContain('filterEnabledSteps(wedding)');
  });

  it('adds the new rows to the Google Doc template', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('Wedding Thank-You');
    expect(template).toContain('Optional Flag');
  });
});
