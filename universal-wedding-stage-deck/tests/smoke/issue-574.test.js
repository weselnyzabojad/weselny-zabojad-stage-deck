import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { resolvePhotographerAvailable } from '../../src/lib/photoPlan.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #574/#642 Speed Foto as a game step', () => {
  it('deletes the standalone speed-foto domain', () => {
    for (const path of [
      'schema/domains/speed-foto.json',
      'schema/domains/speed-foto.example.json',
      'supabase/functions/_shared/domains/speed-foto.json',
    ]) {
      expect(existsSync(new URL(`../../${path}`, import.meta.url))).toBe(false);
    }
    expect(json('schema/domains/photo-plan.json').properties.photoPlan.properties).not.toHaveProperty(
      'speedFoto',
    );
    expect(read('schema/wedding-schema-v1.1.json')).not.toContain('"speedFoto"');
  });

  it('models Speed Foto as a timeline game step with a photographer requirement', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const step = result.cartridge.steps.find((entry) => entry.title === 'Speed Foto');
    expect(step).toBeTruthy();
    expect(step.game).toMatchObject({
      title: 'Speed Foto',
      gameType: 'OTHER',
      requiresPhotographer: true,
    });
    expect(step.id).toBe('step_speed_foto');
  });

  it('keeps one step per game and no photo-plan duplicate', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const games = result.cartridge.steps.filter((step) => step.game);
    expect(games.map((step) => step.title)).toEqual(
      expect.arrayContaining(['Test Wiedzy', 'Test Zgodności', 'Speed Foto']),
    );
    expect(new Set(games.map((step) => step.game.id)).size).toBe(games.length);
  });

  it('exposes the photographer requirement to the schedule UI', () => {
    expect(read('schema/domains/steps.json')).toContain('"requiresPhotographer"');
    expect(read('src/components/StageStepCard.jsx')).toContain('requiresPhotographer');
    expect(read('src/components/StageStepCard.jsx')).toContain('mc.rail.requiresPhotographer');
    expect(
      resolvePhotographerAvailable({
        mediaTeam: [{ id: 'p', role: 'PHOTO', name: 'Magda' }],
      }),
    ).toBe(true);
    expect(resolvePhotographerAvailable({ mediaTeam: [] })).toBe(false);
  });
});
