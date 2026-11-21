import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_STEPS,
  TIMELINE_COLUMNS,
  canonicalStepByName,
} from '../src/lib/canonicalSteps.js';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { renderClientTemplateHtml } from '../src/lib/clientTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => {
  const parsed = parseGoogleDocTemplate(source);
  return { parsed, ...googleDocTemplateToCartridge(parsed) };
};
const row = (hour, name, example = 'Note') => `| ${hour} | ${name} | ${example} |`;
const replaceRow = (source, name, replacement) =>
  source.replace(
    new RegExp(`^\\|[^\\n]*\\|\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|[^\\n]*$`, 'm'),
    replacement,
  );

describe('issue #1329 canonical step catalog and 3-column timeline', () => {
  it('exposes the 19 frozen steps with unique names and stable ids', () => {
    expect(CANONICAL_STEPS).toHaveLength(19);
    expect(new Set(CANONICAL_STEPS.map((step) => step.id)).size).toBe(19);
    expect(new Set(CANONICAL_STEPS.map((step) => step.name)).size).toBe(19);
    expect(CANONICAL_STEPS.map((step) => step.id)).toContain('step_speed_foto');
    expect(canonicalStepByName('  ceremony ')).toMatchObject({ id: 'step_02', type: 'FLEXIBLE' });
    expect(canonicalStepByName('Oczepiny')).toMatchObject({
      type: 'HARD_ANCHOR',
      optionalFlag: 'oczepiny',
    });
    for (const step of CANONICAL_STEPS) {
      expect(step.exampleHour, step.name).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(step.exampleValues, step.name).toBeTruthy();
      expect(['FLEXIBLE', 'HARD_ANCHOR'], step.name).toContain(step.type);
    }
  });

  it('ships the frozen 3-column timeline and no Step ID column', () => {
    const timeline = template.slice(template.indexOf('## TIMELINE'), template.indexOf('## DJ CUES'));
    expect([...TIMELINE_COLUMNS]).toEqual(['Hour', 'Step name', 'Example values']);
    expect(timeline).toContain('| Hour | Step name | Example values |');
    expect(timeline).not.toContain('| Step ID |');
    for (const step of CANONICAL_STEPS) {
      expect(timeline, step.name).toContain(`| ${step.exampleHour} | ${step.name} |`);
    }
    expect(timeline).toContain('delete a row to exclude');
    expect(timeline).toContain('never parsed');
  });

  it('parses by Step name, ignores row order and keeps the canonical order by time', () => {
    const lines = template.split('\n');
    const start = lines.findIndex((line) => line === '| 16:00 | Vin d\'honneur / Cocktail | Location, arrival note |');
    [lines[start], lines[start + 1]] = [lines[start + 1], lines[start]];
    const reordered = parse(lines.join('\n'));
    expect(reordered.errors).toEqual([]);
    expect(reordered.cartridge.steps.filter((step) => /^step_/.test(step.id)).map((step) => step.id)).toEqual(
      CANONICAL_STEPS.map((step) => step.id).sort((a, b) => {
        const hour = (id) => CANONICAL_STEPS.find((step) => step.id === id).exampleHour;
        const minutes = (value) => {
          const [h, m] = value.split(':').map(Number);
          return (h < 6 ? h + 24 : h) * 60 + m;
        };
        return minutes(hour(a)) - minutes(hour(b));
      }),
    );
  });

  it('rejects a deleted row without synthesizing a step', () => {
    const source = template
      .split('\n')
      .filter((line) => !line.includes('| Oczepiny |'))
      .join('\n');
    const result = parse(source);
    expect(result.errors).toEqual([]);
    expect(result.cartridge.steps.some((step) => step.title === 'Oczepiny')).toBe(false);
    expect(result.cartridge.steps.some((step) => step.optionalFlag === 'oczepiny')).toBe(false);
  });

  it('rejects blank, malformed and out-of-range hours with the row name', () => {
    for (const [hour, message] of [
      ['', 'TIMELINE row 15 (Oczepiny): missing Hour'],
      ['25:99', 'TIMELINE row 15 (Oczepiny): invalid Hour "25:99"'],
      ['noon', 'TIMELINE row 15 (Oczepiny): invalid Hour "noon"'],
    ]) {
      const result = parse(replaceRow(template, 'Oczepiny', row(hour, 'Oczepiny')));
      expect(result.errors, hour).toContain(message);
      expect(result.cartridge.steps.some((step) => step.title === 'Oczepiny')).toBe(false);
    }
  });

  it('rejects duplicate and unknown Step names', () => {
    const duplicate = parse(
      `${template}\n${''}`.replace(
        '| 00:00 | Oczepiny | Toss, ties, winner photo, music |',
        '| 00:00 | Oczepiny | Toss, ties, winner photo, music |\n| 00:30 | Oczepiny | Duplicate |',
      ),
    );
    expect(duplicate.errors).toContain('TIMELINE row 16: duplicate Step name "Oczepiny"');

    const unknown = parse(replaceRow(template, 'Oczepiny', row('00:00', 'Ceremonia')));
    expect(unknown.errors).toContain('TIMELINE row 15: unknown Step name "Ceremonia"');
    expect(unknown.cartridge.steps.some((step) => step.title === 'Ceremonia')).toBe(false);
  });

  it('never parses the Example values column', () => {
    const result = parse(replaceRow(template, 'Oczepiny', row('00:00', 'Oczepiny', 'SENTINEL')));
    expect(result.errors).toEqual([]);
    expect(JSON.stringify(result.cartridge)).not.toContain('SENTINEL');
  });

  it('renders the full HTML template with the injected header and 3-column timeline', () => {
    const html = renderClientTemplateHtml({
      brideName: 'Anna',
      groomName: 'Piotr',
      venueName: 'Dwor Pod Lipami',
      venueAddress: 'ul. Lipowa 12',
      template,
    });
    expect(html).toMatch(/<h1[^>]*>Anna &amp; Piotr<\/h1>/);
    expect(html).toContain('Venue: Dwor Pod Lipami</p>');
    expect(html).toContain('Address: ul. Lipowa 12</p>');
    for (const section of parseGoogleDocTemplate(template).sections) {
      expect(html, section.marker).toContain(`data-doc-section="${section.marker}"`);
      expect(html, section.marker).toContain(`>${section.marker}</h2>`);
    }
    const timeline = html.slice(html.indexOf('data-doc-section="TIMELINE"'), html.indexOf('data-doc-section="DJ CUES"'));
    expect(timeline).toMatch(/Hour<\/th><th[^>]*>Step name<\/th><th[^>]*>Example values<\/th>/);
    expect(timeline).toContain('>Oczepiny</td>');
    expect(timeline).not.toContain('Step ID');
    expect(html).toContain('data-doc-section="WITNESSES"');
  });

  it('rejects missing header values', () => {
    expect(() => renderClientTemplateHtml({ template })).toThrow(
      /Missing client template values/,
    );
  });
});
