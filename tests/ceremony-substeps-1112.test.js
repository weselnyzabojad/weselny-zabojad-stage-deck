import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1112 Ceremony sub-steps Doc contract', () => {
  it('is removed from the customer Doc', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('## CEREMONY SUBSTEPS');
    expect(read('src/lib/googleDocTemplate.js')).not.toContain("marker: 'CEREMONY SUBSTEPS'");
  });

  it('stays available as app-owned schema data', () => {
    const schema = read('schema/domains/steps.json');
    const map = read('schema/google-doc-field-map.json');
    expect(schema).toContain('"subSteps"');
    expect(schema).toContain('"ceremonySubStep"');
    expect(map).toContain('"steps[].ceremony.subSteps[].id": "delete"');
    expect(map).toContain('"steps[].ceremony.subSteps[].responsibleRole": "delete"');
  });

  it('does not turn sub-steps into timeline steps', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('ceremony_entrance');
    expect(read('schema/google-doc-template.md')).not.toContain('ceremony_vows');
  });
});
