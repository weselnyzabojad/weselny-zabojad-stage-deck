import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import weddingSchema from '../../schema/wedding-schema-v1.1.json';
import { sanitizeCartridge, validateCartridge } from '../../src/lib/cartridgeImporter.js';
import { sanitizeCartridge as serverSanitize } from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { SECTION_MANIFEST } from '../../src/lib/googleDocTemplate.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const clone = (value) => JSON.parse(JSON.stringify(value));
const minimal = json('schema/fixtures/valid-minimal.json');

function legacyCartridge() {
  const cartridge = clone(minimal);
  cartridge.coHosts = [{ id: 'zuzia', name: 'Zuzia' }];
  cartridge.contentCreators = [{ id: 'paulina', name: 'Paulina' }];
  cartridge.preWeddingTodos = [{ task: 'Check XLR cables', done: false }];
  return cartridge;
}

describe('issue #583 legacy block cleanup', () => {
  it('removes the legacy blocks from the schema but keeps mediaTeam', () => {
    expect(weddingSchema.properties.coHosts).toBeUndefined();
    expect(weddingSchema.properties.contentCreators).toBeUndefined();
    expect(weddingSchema.properties.preWeddingTodos).toBeUndefined();
    expect(weddingSchema.$defs.coHost).toBeUndefined();
    expect(weddingSchema.$defs.contentCreator).toBeUndefined();
    expect(weddingSchema.$defs.preWeddingTodo).toBeUndefined();
    expect(weddingSchema.properties.mediaTeam).toBeDefined();
  });

  it('removes the legacy blocks from the cartridge example', () => {
    const example = json('schema/wedding-cartridge.example.json');
    expect(example).not.toHaveProperty('coHosts');
    expect(example).not.toHaveProperty('contentCreators');
    expect(example).not.toHaveProperty('preWeddingTodos');
    expect(Array.isArray(example.mediaTeam)).toBe(true);
  });

  it('drops the legacy blocks before validation on the client and edge', async () => {
    for (const sanitize of [sanitizeCartridge, serverSanitize]) {
      const clean = sanitize(legacyCartridge());
      expect(clean).not.toHaveProperty('coHosts');
      expect(clean).not.toHaveProperty('contentCreators');
      expect(clean).not.toHaveProperty('preWeddingTodos');
    }

    const result = await validateCartridge(legacyCartridge());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.cartridge).not.toHaveProperty('coHosts');
  });

  it('no longer maps pre-wedding todos from the Google Doc template', () => {
    expect(SECTION_MANIFEST.some((section) => section.marker === 'PRE-WEDDING TODOS')).toBe(false);
    expect(read('schema/google-doc-template.md')).not.toContain('PRE-WEDDING TODOS');
  });
});
