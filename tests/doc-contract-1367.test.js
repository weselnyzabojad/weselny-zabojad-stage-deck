import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #1367 speeches, removed sections and app-owned fields', () => {
  it('removes the app-owned sections from the customer Doc', () => {
    for (const marker of [
      'VIEW VISIBILITY',
      'GUEST REQUESTS',
      'CEREMONY SCRIPT',
      'CEREMONY SUBSTEPS',
    ]) {
      expect(template, marker).not.toContain(`## ${marker}`);
    }
  });

  it('creates speech records with generated IDs and no scripts', () => {
    const speeches = parse().cartridge.speeches;
    expect(speeches).toEqual([
      {
        id: 'bartek',
        order: 1,
        speaker: { name: 'Bartek', relationship: 'Best man' },
      },
    ]);
    expect(speeches[0]).not.toHaveProperty('script');
  });

  it('keeps only the cake cutting song and derives the time from the timeline', () => {
    expect(parse().cartridge.cake).toEqual({
      time: '20:30',
      cuttingSong: 'Cake — The Coup',
    });
  });

  it('removes dietary counts and vendor meals from the kitchen payload', () => {
    const kitchen = parse().cartridge.extensions.kitchen;
    expect(kitchen.courses).toHaveLength(3);
    expect(kitchen.serviceAnchors).toHaveLength(1);
    expect(kitchen).not.toHaveProperty('dietaryCounts');
    expect(kitchen).not.toHaveProperty('vendorMeals');
  });

  it('leaves app-owned sections unset when their Doc sections are absent', () => {
    const { cartridge } = parse();
    expect(cartridge).not.toHaveProperty('viewVisibility');
    expect(cartridge.extensions).not.toHaveProperty('guestRequestRules');
  });

  it('marks removed Doc fields as delete in the field map', () => {
    const map = JSON.parse(read('schema/google-doc-field-map.json'));
    expect(map.files['cake.example.json']['cake.time']).toBe('delete');
    expect(map.files['cake.example.json']['cake.sparklers']).toBe('delete');
    expect(map.files['speeches.example.json']['speeches[].script.text']).toBe('delete');
    expect(map.files['steps.example.json']['steps[].teleprompter.has_script']).toBe('delete');
  });
});
