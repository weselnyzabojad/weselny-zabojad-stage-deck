import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  googleDocToTemplateText,
  parseGoogleDocTemplate,
} from '../../src/lib/googleDocTemplate.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function paragraph(text, namedStyleType = null, bullet = null) {
  return {
    paragraph: {
      ...(namedStyleType ? { paragraphStyle: { namedStyleType } } : {}),
      ...(bullet ? { bullet } : {}),
      elements: [{ textRun: { content: `${text}\n` } }],
    },
  };
}

function cell(text) {
  return { content: [paragraph(text)] };
}

describe('issue #82 Google Docs-first parsing and AI-prompt cleanup', () => {
  it('converts a Google Docs API response into deterministic template text', () => {
    const doc = {
      body: {
        content: [
          paragraph('Wedding plan', 'HEADING_1'),
          paragraph('Intro text'),
          paragraph('EVENT', 'HEADING_2'),
          {
            table: {
              tableRows: [
                {
                  tableCells: [cell('Key'), cell('Value')],
                },
                {
                  tableCells: [cell('weddingId'), cell('2026-08-20_test_wedding')],
                },
              ],
            },
          },
          paragraph('First bullet', null, { nestingLevel: 0 }),
        ],
      },
    };

    const text = googleDocToTemplateText(doc);
    expect(text).toContain('# Wedding plan');
    expect(text).toContain('## EVENT');
    expect(text).toContain('| Key | Value |');
    expect(text).toContain('| --- | --- |');
    expect(text).toContain('| weddingId | 2026-08-20_test_wedding |');
    expect(text).toContain('- First bullet');

    const parsed = parseGoogleDocTemplate(text);
    expect(parsed.byMarker.EVENT).toBeTruthy();
    expect(parsed.byMarker.EVENT.tables[0].header).toEqual(['Key', 'Value']);
    expect(parsed.byMarker.EVENT.tables[0].rows[0]).toEqual({
      Key: 'weddingId',
      Value: '2026-08-20_test_wedding',
    });
  });

  it('returns empty text for a malformed document instead of throwing', () => {
    expect(googleDocToTemplateText(null)).toBe('');
    expect(googleDocToTemplateText({})).toBe('');
    expect(googleDocToTemplateText({ body: { content: 'not-an-array' } })).toBe('');
  });

  it('removes the AI-prompt artifact from source and documentation', () => {
    expect(existsSync(new URL('../../schema/ai-converter-prompt.md', import.meta.url))).toBe(
      false,
    );
    expect(read('README.md')).not.toContain('schema/ai-converter-prompt.md');
    expect(read('schema/README.md')).not.toContain('ai-converter-prompt.md');

    const sourceFiles = [];
    const walk = (directory) => {
      const base = new URL(`../../${directory}/`, import.meta.url);
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        const next = `${directory}/${entry.name}`;
        if (entry.isDirectory()) walk(next);
        else if (/\.(js|jsx|ts|mjs)$/.test(entry.name)) sourceFiles.push(next);
      }
    };
    walk('src');
    for (const file of sourceFiles) {
      expect(read(file), file).not.toContain('ai-converter-prompt');
      expect(read(file), file).not.toContain('ai-converter-prompt.md?raw');
    }
  });

  it('keeps the manual JSON paste fallback for publishing revisions', () => {
    const dialogs = read('src/admin/AdminDialogs.jsx');
    expect(dialogs).toContain('JSON.parse(cartridgeJson)');
    expect(read('src/admin/AdminApp.jsx')).toContain('validateCartridge(cartridge)');
    expect(dialogs).toContain('Cartridge JSON');
    expect(read('src/admin/AdminApp.jsx')).not.toContain('CreateWeddingForm');
  });
});
