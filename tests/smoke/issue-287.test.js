import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #287 Oczepiny variant schema', () => {
  it('defines Early/Midnight order and toss/ties fields', () => {
    const domain = JSON.parse(read('schema/domains/oczepiny.json'));
    const ocz = domain.properties.oczepiny.properties;
    expect(ocz.order.enum).toEqual(['MIDNIGHT', 'EARLY']);
    expect(ocz.toss.enum).toEqual(['VEIL', 'BOUQUET']);
    expect(ocz.ties.enum).toEqual(['BOW_TIE', 'CRAVAT']);
    expect(ocz.game).toBeTruthy();
    expect(ocz.countdown).toBeTruthy();
  });
  it('demo uses Midnight with toss/ties/game/countdown/winner photos', () => {
    const ocz = DEMO_WEDDING.oczepiny;
    expect(ocz.order).toBe('MIDNIGHT');
    expect(ocz.toss).toBe('VEIL');
    expect(ocz.ties).toBe('BOW_TIE');
    expect(ocz.game.enabled).toBe(true);
    expect(ocz.countdown.mode).toBe('SONGS');
    expect(ocz.winnerPhoto.winnersOnly).toBe(true);
    expect(ocz.winnerPhoto.winnersWithCouple).toBe(true);
  });
  it('documents the Google Doc fields', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('| Order | MIDNIGHT | MIDNIGHT or EARLY |');
    expect(template).toContain('| Toss | VEIL | VEIL or BOUQUET |');
    expect(template).toContain('| Ties | BOW_TIE | BOW_TIE or CRAVAT |');
    expect(template).not.toContain('Oczepiny variant');
    expect(template).not.toContain('Throwings');
  });
});
