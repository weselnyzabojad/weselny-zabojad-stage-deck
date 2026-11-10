import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #667 music-policy Google Doc source flags', () => {
  it('keeps the required Doc values and drops runtime/admin fields', () => {
    expect(template).toContain('Disco Polo policy: No');
    expect(template).toContain('| first_dance | Perfect — Ed Sheeran | First dance. |');
    expect(template).not.toContain('Planned time');
    expect(template).not.toContain('Request window start');
    expect(template).not.toContain('Clean versions');
    expect(template).not.toContain('Window start');
  });

  it('maps the required music policy fields', async () => {
    const { cartridge, warnings } = parse();
    const policy = cartridge.musicPolicy;

    expect(policy.discoPoloPolicy).toBe('NO');
    expect(policy.mustPlay).toEqual([
      { id: 'first_dance', track: 'Perfect — Ed Sheeran', note: 'First dance.' },
      { id: 'last_song', track: 'Wonderful Tonight — Eric Clapton', note: 'Last song of the night.' },
    ]);
    expect(policy.doNotPlay).toHaveLength(1);
    expect(policy.doNotPlay[0].track).toContain('Macarena');
    expect(policy.importantSongs).toEqual([
      {
        id: 'grand_entrance',
        moment: 'GRAND_ENTRANCE',
        title: 'Marry You',
        artist: 'Bruno Mars',
        version: 'Album version',
        source: { type: 'CUSTOMER_FILE', fileRef: 'assets/audio/marry-you-bruno-mars.mp3' },
      },
      {
        id: 'first_dance',
        moment: 'FIRST_DANCE',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        version: 'Album version',
        source: { type: 'OTHER' },
        note: 'Duet version if available.',
      },
      {
        id: 'cake_cutting',
        moment: 'CAKE',
        title: 'Cake',
        artist: 'The Coup',
        version: 'Album version',
        source: { type: 'OTHER' },
      },
    ]);
    expect(policy).not.toHaveProperty('requestsOpen');
    expect(policy).not.toHaveProperty('requestWindow');
    expect(policy).not.toHaveProperty('cleanVersions');
    expect(policy.importantSongs[0]).not.toHaveProperty('stepId');
    expect(policy.importantSongs[0]).not.toHaveProperty('plannedTime');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and skips rows missing a required Doc value', () => {
    const grandEntrance =
      '| grand_entrance | GRAND_ENTRANCE | Marry You | Bruno Mars | Album version | CUSTOMER_FILE | assets/audio/marry-you-bruno-mars.mp3 |  |';
    const mustPlay = '| first_dance | Perfect — Ed Sheeran | First dance. |';

    const missingArtist = parse(
      template.replace(grandEntrance, grandEntrance.replace('| Bruno Mars |', '|  |')),
    );
    expect(missingArtist.warnings).toContain(
      'IMPORTANT SONGS row skipped: missing Artist',
    );

    const missingTrack = parse(
      template.replace(mustPlay, mustPlay.replace('Perfect — Ed Sheeran', '')),
    );
    expect(missingTrack.warnings).toContain('MUSIC POLICY Must Play row skipped: missing Track');
  });

  it('keeps the optional must-play note safe when absent', async () => {
    const source = template.replace(
      '| first_dance | Perfect — Ed Sheeran | First dance. |',
      '| first_dance | Perfect — Ed Sheeran |  |',
    );
    const { cartridge, warnings } = parse(source);

    expect(cartridge.musicPolicy.mustPlay[0]).toEqual({
      id: 'first_dance',
      track: 'Perfect — Ed Sheeran',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
