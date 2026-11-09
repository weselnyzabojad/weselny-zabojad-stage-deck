import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeClock } from '../../src/lib/googleDocCartridge.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #552 uniform edge-case rules', () => {
  it('normalizes loose clock strings to HH:MM', () => {
    expect(normalizeClock('22:15')).toBe('22:15');
    expect(normalizeClock('22.15')).toBe('22:15');
    expect(normalizeClock('15h00')).toBe('15:00');
    expect(normalizeClock('8:05')).toBe('08:05');
    expect(normalizeClock('15:40/16:00')).toBe('15:40');
    expect(normalizeClock('22:00-22:30')).toBe('22:00');
    expect(normalizeClock('18:00\u201320:00')).toBe('18:00');
    expect(normalizeClock('after dinner')).toBeNull();
    expect(normalizeClock('')).toBeNull();
  });

  it('documents the uniform fallback rules', () => {
    const conventions = read('docs/google-doc-template-conventions.md');
    expect(conventions).toContain('Uniform fallback rules');
    expect(conventions).toContain('Clock normalization');
    expect(conventions).toContain('Missing / ambiguous start time');
    expect(conventions).toContain('never dropped silently');
  });

  it('keeps strict HH:MM inputs unchanged across the mapper', () => {
    const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
    const result = googleDocTemplateToCartridge(parsed);
    expect(result.cartridge.steps[0].time).toBe('16:30');
  });
});
