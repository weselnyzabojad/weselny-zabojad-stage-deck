import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildDriftReport } from '../../src/lib/driftEngine.js';
import { summarizeCartridge } from '../../src/lib/cartridgeImporter.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const exists = (p) => existsSync(new URL(`../../${p}`, import.meta.url));

describe('issue #328 legacy buffer cleanup', () => {
  it('removes the dead buffer accordion module and drift exports', () => {
    expect(exists('src/lib/bufferAccordion.js')).toBe(false);
    const drift = read('src/lib/driftEngine.js');
    expect(drift).not.toContain('buildBufferAccordion');
    expect(drift).not.toContain('bufferAccordion');
    expect(drift).not.toContain('isElastic');
    expect(drift).not.toContain('isBuffer');
    expect(drift).not.toContain('accordionEntries');
    expect(drift).not.toContain('durationOverrides');
  });

  it('does not expose legacy fields in a drift report', () => {
    const report = buildDriftReport([
      { id: 'a', time: '16:00', durationMin: 30, title: 'A', type: 'FLEXIBLE' },
      { id: 'b', time: '16:30', durationMin: 30, title: 'B', type: 'HARD_ANCHOR' },
    ]);
    expect(report.entries[0].isElastic).toBeUndefined();
    expect(report.entries[0].isBuffer).toBeUndefined();
    expect(report.accordionEntries).toBeUndefined();
    expect(report.bufferAccordion).toBeUndefined();
    expect(report.projectedElasticEntries).toBeUndefined();
  });

  it('uses flexibleStepCount in the importer summary', () => {
    const summary = summarizeCartridge({
      steps: [
        { id: 'a', type: 'FLEXIBLE' },
        { id: 'b', type: 'HARD_ANCHOR' },
      ],
    });
    expect(summary.flexibleStepCount).toBe(1);
    expect(summary.bufferCount).toBeUndefined();
    expect(read('src/lib/cartridgeImporter.js')).not.toContain('bufferCount');
  });

  it('renames the stale fixtures and keeps their coverage', () => {
    expect(exists('schema/fixtures/valid-timeline.json')).toBe(true);
    expect(exists('schema/fixtures/valid-buffers.json')).toBe(false);
    expect(exists('schema/fixtures/invalid-legacy-buffer-field.json')).toBe(true);
    expect(exists('schema/fixtures/invalid-buffer-range.json')).toBe(false);
  });

  it('removes obsolete active-code wording', () => {
    expect(read('src/content/games/testWiedzy.js')).not.toContain('ELASTIC/BUFFER');
    expect(read('docs/google-doc-template-conventions.md')).not.toContain('ELASTIC');
    expect(read('docs/google-doc-template-conventions.md')).not.toContain('BUFFER');
  });
});
