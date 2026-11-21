import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

const setActor = (rule, actor) =>
  template.replace(
    new RegExp(`^(\\| ${rule} \\|[^|]*\\|)[^|]*(\\|.*)$`, 'm'),
    `$1 ${actor} $2`,
  );

describe('issue #1368 cultural rule actors contract', () => {
  it('documents the Actors column with empty cells by default', () => {
    expect(template).toContain('| Rule | Status | Actors | Example |');
    for (const rule of ['stoLat', 'gorzko', 'breadSalt']) {
      expect(template).toMatch(new RegExp(`^\\| ${rule} \\|[^|]*\\|\\s*\\|`, 'm'));
    }
  });

  it('maps VENUE and PARENTS actors', () => {
    const source = setActor('stoLat', 'VENUE').replace(
      /^(\| gorzko \|[^|]*\|)[^|]*(\|.*)$/m,
      '$1 PARENTS $2',
    );
    const rules = parse(source).cartridge.culturalRules;
    expect(rules.sto_lat.actor).toBe('VENUE');
    expect(rules.gorzko.actor).toBe('PARENTS');
    expect(rules.bread_salt).not.toHaveProperty('actor');
  });

  it('treats an empty actor as the newlyweds', () => {
    const rules = parse().cartridge.culturalRules;
    for (const rule of ['sto_lat', 'gorzko', 'bread_salt']) {
      expect(rules[rule]).not.toHaveProperty('actor');
    }
  });

  it('rejects an invalid actor with the section, rule and allowed values', () => {
    const result = parse(setActor('stoLat', 'NEWLYWEDS'));
    expect(result.warnings).toContain(
      'CULTURAL RULES: stoLat: invalid Actors "NEWLYWEDS" (expected VENUE or PARENTS)',
    );
    expect(result.cartridge.culturalRules.sto_lat).not.toHaveProperty('actor');
  });

  it('declares the actor enum in both schema copies', () => {
    for (const path of [
      'schema/domains/cultural-rules.json',
      'supabase/functions/_shared/domains/cultural-rules.json',
    ]) {
      const schema = JSON.parse(read(path));
      expect(
        schema.properties.culturalRules.properties.sto_lat.properties.actor.enum,
      ).toEqual(['VENUE', 'PARENTS']);
    }
  });
});
