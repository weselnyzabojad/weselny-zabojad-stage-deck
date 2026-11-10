import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveMusicPolicy } from '../../src/lib/musicPolicy.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #639 music-policy field cleanup', () => {
  it('removes the five legacy fields from the schema', () => {
    const domain = json('schema/domains/music-policy.json');
    const policy = domain.properties.musicPolicy.properties;
    expect(policy.licensing).toBeUndefined();
    expect(domain.$defs.doNotPlayTrack.properties.id).toBeUndefined();
    expect(domain.$defs.doNotPlayTrack.properties.reason).toBeUndefined();
    expect(domain.$defs.doNotPlayTrack.required).toEqual(['track']);
    expect(domain.$defs.importantSong.properties.startAtSec).toBeUndefined();
    expect(domain.$defs.importantSong.properties.fadeOutSec).toBeUndefined();
  });

  it('removes the fields from the example, demo and fixtures', () => {
    const example = json('schema/domains/music-policy.example.json').musicPolicy;
    expect(example).not.toHaveProperty('licensing');
    expect(example.doNotPlay[0]).not.toHaveProperty('id');
    expect(example.doNotPlay[0]).not.toHaveProperty('reason');
    expect(example.importantSongs[0]).not.toHaveProperty('startAtSec');
    expect(example.importantSongs[0]).not.toHaveProperty('fadeOutSec');

    const fixture = json('schema/fixtures/real-jennifer-guillaume.json').musicPolicy;
    expect(fixture).not.toHaveProperty('licensing');
    for (const item of fixture.doNotPlay) {
      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('reason');
    }
    for (const song of fixture.importantSongs) {
      expect(song).not.toHaveProperty('startAtSec');
      expect(song).not.toHaveProperty('fadeOutSec');
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('licensing');
  });

  it('keeps the remaining policy data in the resolver', () => {
    const policy = resolveMusicPolicy(json('schema/fixtures/real-jennifer-guillaume.json'));
    expect(policy).not.toHaveProperty('licensing');
    expect(policy.doNotPlay.length).toBeGreaterThan(0);
    expect(policy.doNotPlay[0].track).toBeTruthy();
    expect(policy.doNotPlay[0]).not.toHaveProperty('reason');
    expect(policy.doNotPlay[0]).toHaveProperty('key');
    expect(policy.mustPlay.length).toBeGreaterThan(0);
  });

  it('no longer maps or renders the removed fields', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const policy = result.cartridge.musicPolicy;
    expect(policy).not.toHaveProperty('licensing');
    expect(policy.doNotPlay[0]).toEqual({ track: expect.any(String) });
    expect(policy.importantSongs[0]).not.toHaveProperty('startAtSec');
    expect(policy.importantSongs[0]).not.toHaveProperty('fadeOutSec');

    expect(read('src/components/MusicPolicyCard.jsx')).not.toContain('licensing');
    expect(read('src/components/MusicPolicyCard.jsx')).not.toContain('item.reason');
    expect(read('src/lib/djExport.js')).not.toContain('Song cues');
    expect(read('src/lib/importantSongs.js')).not.toContain('song?.startAtSec');
  });
});
