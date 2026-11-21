import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #668 oczepiny Google Doc source flags', () => {
  it('removes props, deferable and skippable from the schema, example and fixtures', () => {
    for (const path of [
      'schema/domains/oczepiny.json',
      'supabase/functions/_shared/domains/oczepiny.json',
    ]) {
      const ocz = json(path).properties.oczepiny;
      expect(ocz.properties.props, path).toBeUndefined();
      expect(ocz.properties.subEvents.items.properties.deferable, path).toBeUndefined();
      expect(ocz.properties.subEvents.items.properties.skippable, path).toBeUndefined();
    }
    for (const path of [
      'schema/domains/oczepiny.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
      'schema/fixtures/valid-photo-oczepiny.json',
    ]) {
      const ocz = json(path).oczepiny ?? json(path).photoPlan?.oczepiny;
      expect(ocz, path).not.toHaveProperty('props');
      expect(ocz.subEvents.every((event) => !('deferable' in event)), path).toBe(true);
      expect(ocz.subEvents.every((event) => !('skippable' in event)), path).toBe(true);
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('props: ["Veil"');
  });

  it('allows only the four throwings and two winner-photo sub-events', () => {
    expect(
      json('schema/domains/oczepiny.json').properties.oczepiny.properties.subEvents.items
        .properties.title.enum,
    ).toEqual([
      'Veil toss',
      'Bouquet toss',
      'Bow-tie game',
      'Cravat toss',
      'Winner photo',
      'Winners with couple photo',
    ]);
    expect(template).not.toContain('### Sub-events');
  });

  it('maps the required Doc fields and derives canonical sub-event ids', async () => {
    const { cartridge, warnings } = parse();
    const ocz = cartridge.oczepiny;

    expect(ocz).toMatchObject({
      enabled: true,
      order: 'MIDNIGHT',
      toss: 'VEIL',
      ties: 'BOW_TIE',
      game: { enabled: true },
      countdown: { mode: 'SONGS' },
      winnerPhoto: {
        enabled: true,
        winnersOnly: true,
        winnersWithCouple: true,
        photographerAvailable: true,
      },
      music: { songs: [], decidedByDj: true },
    });
    expect(ocz).not.toHaveProperty('props');
    expect(ocz).not.toHaveProperty('anchorId');
    expect(ocz).not.toHaveProperty('variant');
    expect(ocz).not.toHaveProperty('throwings');
    expect(ocz.winnerPhoto.photographerCue).toBe('');
    expect(ocz.subEvents).toEqual([
      { id: 'veil_toss', title: 'Veil toss' },
      { id: 'bouquet_toss', title: 'Bouquet toss' },
      { id: 'bow_tie_game', title: 'Bow-tie game' },
      { id: 'cravat_toss', title: 'Cravat toss' },
      { id: 'winner_photo', title: 'Winner photo' },
      { id: 'winners_with_couple_photo', title: 'Winners with couple photo' },
    ]);
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required Doc value is missing', () => {
    const result = parse(
      template.replace(
        '| Toss | VEIL | VEIL or BOUQUET |',
        '| Toss |  | VEIL or BOUQUET |',
      ),
    );

    expect(result.warnings.some((warning) => warning.includes('missing Toss'))).toBe(true);
  });

  it('keeps music empty when countdown uses the MC mic', async () => {
    const source = template
      .replace(
        '| Countdown mode | SONGS | SONGS or MC_MIC_COUNTDOWN |',
        '| Countdown mode | MC_MIC_COUNTDOWN | SONGS or MC_MIC_COUNTDOWN |',
      )
      .replace(
        '| songs | default | `default`, or semicolon-separated artist — title entries |',
        '| songs |  | `default`, or semicolon-separated artist — title entries |',
      );
    const { cartridge, warnings } = parse(source);
    const ocz = cartridge.oczepiny;

    expect(ocz.music).toEqual({ songs: [], decidedByDj: false });
    expect(ocz).not.toHaveProperty('photographerBriefed');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
