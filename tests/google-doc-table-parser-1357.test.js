import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FIELD_MANIFEST,
  parseGoogleDocTemplate,
  validateFieldTables,
  validateGoogleDocTemplate,
} from '../src/lib/googleDocTemplate.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parsed = parseGoogleDocTemplate(template);

const fieldTable = (section) =>
  section.tables.find(
    (table) => table.header.join('|') === 'Field|Your value|Example',
  );

describe('issue #1357 table-based client Doc parser contract', () => {
  it('maps every converted section from its Field | Your value | Example table', () => {
    expect(validateFieldTables(parsed)).toEqual([]);
    expect(validateGoogleDocTemplate(parsed).errors).toEqual([]);

    for (const [marker, labels] of Object.entries(FIELD_MANIFEST)) {
      const section = parsed.byMarker[marker];
      expect(section, marker).toBeTruthy();
      const table = fieldTable(section);
      expect(table, marker).toBeTruthy();
      expect(table.rows.map((row) => row.Field)).toEqual(labels);
      for (const label of labels) {
        expect(section.keyValues, `${marker} / ${label}`).toHaveProperty(label);
      }
    }
  });

  it('ignores the Example column and never sets a cartridge value from it', () => {
    const source = template.replace(
      '| Date | 20.08.2026 | DD.MM.YYYY |',
      '| Date | 20.08.2026 | SENTINEL-EXAMPLE |',
    );
    const modified = parseGoogleDocTemplate(source);
    expect(validateFieldTables(modified)).toEqual([]);
    expect(modified.byMarker.EVENT.keyValues.Date).toBe('20.08.2026');
    expect(JSON.stringify(modified.sections)).toContain('SENTINEL-EXAMPLE');
    expect(modified.byMarker.EVENT.keyValues.Date).not.toContain('SENTINEL');
  });

  it('reports a missing field label with the section and label', () => {
    const source = template.replace(/^\| Date \|.*\r?\n/m, '');
    const errors = validateFieldTables(parseGoogleDocTemplate(source));
    expect(errors).toContain('## EVENT: missing field label "Date". Add each row to the "Field | Your value | Example" table.');
  });

  it('reports a duplicate field label with the section and label', () => {
    const source = template.replace(
      '| Date | 20.08.2026 | DD.MM.YYYY |',
      '| Date | 20.08.2026 | DD.MM.YYYY |\n| Date | 21.08.2026 | DD.MM.YYYY |',
    );
    const errors = validateFieldTables(parseGoogleDocTemplate(source));
    expect(errors).toContain('## EVENT: duplicate field label "Date".');
  });

  it('reports an unknown field label with the section and label', () => {
    const source = template.replace(
      '| Date | 20.08.2026 | DD.MM.YYYY |',
      '| Surprise | 20.08.2026 | DD.MM.YYYY |',
    );
    const errors = validateFieldTables(parseGoogleDocTemplate(source));
    expect(errors).toContain(
      '## EVENT: unknown field label "Surprise". Use one of: Date, Children expected, Ceremony type, Ceremony MC support, Ceremony location, Ceremony notes.',
    );
  });

  it('rejects an old Field: value Doc with the section and migration procedure', () => {
    const oldEvent = [
      '## EVENT',
      '',
      'Date: 20.08.2026',
      'Children expected: yes',
      'Ceremony type: RELIGIOUS',
      'Ceremony MC support: yes',
      'Ceremony location: St. Mary Church',
      'Ceremony notes: Full mass.',
      '',
    ].join('\n');
    const source = template.replace(/## EVENT[\s\S]*?(?=\n## )/, oldEvent);
    const result = validateGoogleDocTemplate(parseGoogleDocTemplate(source));

    expect(result.errors).toContain(
      '## EVENT: old "Date: value" line is not supported. Use the "Field | Your value | Example" table row instead; see docs/google-doc-template-conventions.md "Migrating an existing Doc".',
    );
  });

  it('keeps repeating tables and script code blocks on their current parser path', () => {
    expect(parsed.byMarker.TIMELINE.tables[0].rows).toHaveLength(19);
    expect(parsed.byMarker['CEREMONY SCRIPT'].codeBlocks).toHaveLength(6);
    expect(parsed.byMarker['CEREMONY SCRIPT'].subSections).toHaveLength(2);
    expect(parsed.byMarker.WITNESSES.tables[0].rows[0]).toMatchObject({
      'Witness ID': 'witness_bartek',
      Name: 'Bartek',
    });
  });
});
