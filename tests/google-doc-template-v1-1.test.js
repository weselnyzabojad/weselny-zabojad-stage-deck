import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Google Doc customer template v1.1', () => {
  const template = read('schema/google-doc-template.md');
  const conventions = read('docs/google-doc-template-conventions.md');
  const schemaReadme = read('schema/README.md');

  it('is labelled as the current v1.1 customer template', () => {
    expect(template).toContain('# Wedding harmonogram — Google Doc template (v1.1)');
    expect(template).toContain('This is the v1.1 customer template shipped with the first');
    expect(template).not.toContain('PROVISIONAL');
  });

  it('keeps every repaired example value free of double-encoded text', () => {
    expect(template).not.toMatch(/[ÃÂÄÅ]|â€|Ĺ|Ăł|PaĹ|R\?o/);
    expect(template).toContain('Venue: Dwór X, ul. Przykładowa 1, 59-400 Jawor');
    expect(template).toContain('Rosół + Tartare with Vodka shot');
    expect(template).toContain('Drodzy Państwo, chciałbym powiedzieć kilka słów');
    expect(template).toContain('Macarena - Los del Río');
  });

  it('keeps the conventions and schema README on the v1.1 contract', () => {
    expect(conventions).toContain('`WeddingSchema v1.1` cartridge');
    expect(conventions).toContain('no follow-up schema version ships');
    expect(conventions).not.toContain('Status: provisional');

    expect(schemaReadme).toContain('| `google-doc-template.md` | Customer Google Doc template');
    expect(schemaReadme).not.toContain('Provisional Google Doc template');
  });
});
