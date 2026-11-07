import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #287 Oczepiny variant schema', () => {
  it('defines Early/Midnight fields', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    const ocz = schema.$defs.oczepiny.properties;
    expect(ocz.variant.enum).toEqual(['EARLY', 'MIDNIGHT']);
    expect(ocz.throwings).toBeTruthy();
    expect(ocz.game).toBeTruthy();
    expect(ocz.countdown).toBeTruthy();
  });
  it('demo uses Midnight with throwings/game/countdown/winner photos', () => {
    const ocz = DEMO_WEDDING.oczepiny;
    expect(ocz.variant).toBe('MIDNIGHT');
    expect(ocz.throwings.veil).toBe(true);
    expect(ocz.game.type).toBe('TEST_ZGODNOSCI');
    expect(ocz.countdown.mode).toBe('MC');
    expect(ocz.winnerPhoto.winnersOnly).toBe(true);
    expect(ocz.winnerPhoto.winnersWithCouple).toBe(true);
  });
  it('documents the Google Doc fields', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('Oczepiny variant: MIDNIGHT');
    expect(template).toContain('Throwings:');
  });
});
