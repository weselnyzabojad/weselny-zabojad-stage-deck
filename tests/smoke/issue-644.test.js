import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeCutoffStopwatches } from '../../src/lib/cutoff.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #644 cutoffSec cleanup', () => {
  it('removes cutoffSec from the schema and example', () => {
    expect(
      json('schema/domains/steps.json').$defs.djCue.properties.cutoffSec,
    ).toBeUndefined();
    const step = json('schema/domains/steps.example.json').steps.find(
      (entry) => entry.id === 'step_03',
    );
    expect(step.dj).not.toHaveProperty('cutoffSec');
    expect(step.dj.cutoff).toBe('20:15');
  });

  it('no longer maps or writes cutoffSec', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const step = result.cartridge.steps.find((entry) => entry.id === 'step_03');
    expect(step.dj).not.toHaveProperty('cutoffSec');
    expect(step.dj.cutoff).toBe('20:15');
    expect(read('src/lib/googleDocCartridge.js')).not.toContain('cutoffSec');
    expect(read('schema/google-doc-template.md')).not.toContain('CutoffSec');
  });

  it('renders absolute cutoffs only', () => {
    const stops = computeCutoffStopwatches(
      [
        {
          step: { id: 's1', title: 'Entrance', dj: { cutoff: '20:15' } },
          isActive: true,
        },
        { step: { id: 's2', title: 'Dinner', dj: { track: 'Jazz' } } },
      ],
      new Date('2026-08-20T19:00:00Z'),
      { eventDateISO: '2026-08-20', timeZone: 'UTC' },
    );
    expect(stops).toHaveLength(1);
    expect(stops[0].label).toBe('20:15');
    expect(stops[0]).not.toHaveProperty('cutoffSec');
    expect(stops[0]).not.toHaveProperty('source');
  });
});
