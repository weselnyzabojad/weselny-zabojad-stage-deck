import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1028 production deck health probe', () => {
  it('wires PUBLIC_DECK_URL with the production fallback', () => {
    const fn = read('supabase/functions/service_health/index.ts');
    expect(fn).toContain("envOr('PUBLIC_DECK_URL', 'https://deck.weselnyzabojad.pl/')");
    expect(fn).toContain('deck: {');
  });

  it('adds the deck card in the shared provider order', () => {
    const health = read('src/admin/adminHealth.js');
    expect(health).toContain("id: 'deck'");
    expect(health).toContain("name: 'Production deck'");
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('healthPillCode');
  });

  it('supports deck status overrides in the local service mock', () => {
    const mock = read('tools/service-mock/server.mjs');
    expect(mock).toContain("path === '/deck'");
    expect(mock).toContain('overrideStatus');
  });
});
