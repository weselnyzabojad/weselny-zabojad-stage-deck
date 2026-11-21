import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_STEPS,
  TIMELINE_COLUMNS,
  timelineMarkdownRows,
} from '../src/lib/canonicalSteps.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const catalog = JSON.parse(read('schema/canonical-steps.json'));

describe('issue #1374 shared canonical timeline catalog', () => {
  it('exports the same 19 frozen steps from the schema file', () => {
    expect(catalog.steps).toHaveLength(19);
    expect(CANONICAL_STEPS).toHaveLength(19);
    expect(CANONICAL_STEPS.map((step) => step.id)).toEqual(
      catalog.steps.map((step) => step.id),
    );
    expect(new Set(CANONICAL_STEPS.map((step) => step.id)).size).toBe(19);
    expect(CANONICAL_STEPS.find((step) => step.name === 'Speed Foto')).toMatchObject({
      id: 'step_speed_foto',
      exampleHour: '01:30',
    });
    expect(CANONICAL_STEPS.find((step) => step.name === 'Oczepiny')).toMatchObject({
      type: 'HARD_ANCHOR',
      anchorId: 'oczepiny_midnight',
      optionalFlag: 'oczepiny',
    });
  });

  it('uses the schema columns and produces the same markdown rows', () => {
    expect([...TIMELINE_COLUMNS]).toEqual(['Hour', 'Step name', 'Example values']);
    expect(timelineMarkdownRows()).toHaveLength(19);
    for (const row of timelineMarkdownRows()) {
      expect(read('schema/google-doc-template.md')).toContain(row);
    }
  });

  it('removes the second hardcoded catalog from the loader', () => {
    const source = read('src/lib/canonicalSteps.js');
    expect(source).toContain("import catalog from '../../schema/canonical-steps.json'");
    expect(source).not.toContain("canonical('step_");
  });
});
