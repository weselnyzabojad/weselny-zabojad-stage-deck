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
    expect(template).not.toMatch(/v1\.2 proposal|PROVISIONAL|wedding-schema-v1\.2/);
  });

  it('keeps every repaired example value free of double-encoded text', () => {
    expect(template).not.toMatch(/[ÃÂÄÅ]|â€|Ĺ|Ăł|PaĹ|R\?o/);
    expect(template).toContain('Venue: Dwór X, ul. Przykładowa 1, 59-400 Jawor');
    expect(template).toContain('Rosół + Tartare with Vodka shot');
    expect(template).toContain('Accommodation name: Hotel Przykład');
    expect(template).toContain('Drodzy Państwo, chciałbym powiedzieć kilka słów');
    expect(template).toContain('Macarena - Los del Río');
  });

  it('keeps the conventions and schema README on the v1.1 contract', () => {
    expect(conventions).toContain('`WeddingSchema v1.1` cartridge');
    expect(conventions).toContain('There is no v1.2 in that release.');
    expect(conventions).not.toContain('wedding-schema-v1.2.proposal.md');
    expect(conventions).not.toContain('Status: provisional');

    expect(schemaReadme).toContain('| `google-doc-template.md` | Customer Google Doc template');
    expect(schemaReadme).not.toContain('v1.2 proposal available');
    expect(schemaReadme).not.toContain('wedding-schema-v1.2.proposal.md');
    expect(schemaReadme).not.toContain('Provisional Google Doc template');
  });
});
