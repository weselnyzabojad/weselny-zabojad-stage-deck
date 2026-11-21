import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Google Doc customer template v1.1', () => {
  const template = read('schema/google-doc-template.md');
  const conventions = read('docs/google-doc-template-conventions.md');
  const schemaReadme = read('schema/README.md');

  it('is labelled as the current v1.1 customer template', () => {
    expect(template).toContain('# Wedding scenario - Google Doc template (v1.1)');
    expect(template).toContain('This is the v1.1 customer template shipped with the first');
    expect(template).not.toContain('PROVISIONAL');
  });

  it('keeps every repaired example value free of double-encoded text', () => {
    expect(template).not.toMatch(/[\uFFFD]|Ã|â€|��/);
    expect(template).toContain('| Venue | Dwór X, ul. Przykładowa 1, 59-400 Jawor |');
    expect(template).toContain('Rosół + Tartare with Vodka shot');
    expect(template).toContain('Macarena - Los del Río');
  });

  it('presents fixed fields and every section instruction in the v1.1 table contract', () => {
    expect(template).toContain('| Field | Your value | Example |');
    expect(template).toContain('| Hour | Step name | Example values |');
    for (const section of template.split(/^## /m).slice(1)) {
      expect(section).toContain('**How to fill:**');
    }
    expect(template).not.toMatch(/^[A-Z][\w ]+: .+$/m);
  });

  it('keeps the conventions and schema README on the v1.1 contract', () => {
    expect(conventions).toContain('`WeddingSchema v1.1` cartridge');
    expect(conventions).toContain('no follow-up schema version ships');
    expect(conventions).toContain('`Field | Your value | Example`');
    expect(conventions).not.toContain('Status: provisional');

    expect(schemaReadme).toContain('| `google-doc-template.md` | Customer Google Doc template');
    expect(schemaReadme).not.toContain('Provisional Google Doc template');
  });
});
