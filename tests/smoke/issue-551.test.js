import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #551 ceremony script as Ceremony-step teleprompter', () => {
  it('is removed from the customer Doc', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('## CEREMONY SCRIPT');
    expect(read('src/lib/googleDocTemplate.js')).not.toContain("marker: 'CEREMONY SCRIPT'");
  });

  it('stays available as app-owned teleprompter schema data', () => {
    expect(read('schema/domains/steps.json')).toContain('"teleprompter"');
    expect(read('schema/google-doc-field-map.json')).toContain(
      '"steps[].teleprompter.has_script": "delete"',
    );
  });
});
