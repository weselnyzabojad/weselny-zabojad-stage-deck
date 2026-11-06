import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as cartridgeStorage from '../../src/lib/cartridgeStorage.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const fixture = JSON.parse(read('schema/fixtures/valid-minimal.json'));
const WEDDING_ID = fixture.weddingId;

const clone = (value) => JSON.parse(JSON.stringify(value));

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

function sourceFiles(directory) {
  const base = new URL(`../../${directory}/`, import.meta.url);
  const files = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...sourceFiles(`${directory}/${entry.name}`));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(`${directory}/${entry.name}`);
    }
  }
  return files;
}

describe('issue #166 removes non-admin cartridge import, activation and reset', () => {
  const roleSources = [
    'src/App.jsx',
    'src/StageDeck.jsx',
    'src/views/McMasterView.jsx',
    'src/components/PairingScreen.jsx',
    'src/components/DjBoothView.jsx',
    'src/components/PhotographerView.jsx',
    'src/components/SpeakerView.jsx',
    'src/components/RoleShell.jsx',
  ];

  const forbiddenRoleDeviceTerms = [
    'CartridgeImporter',
    'ai-converter-prompt.md',
    'saveActiveCartridge',
    'loadActiveCartridge',
    'clearActiveCartridge',
    'onImport',
    'importerOpen',
    'Import wedding',
    'Import & reload',
    'Reset to built-in demo',
  ];

  it('deletes the importer component and its AI prompt payload', () => {
    expect(
      existsSync(new URL('../../src/components/CartridgeImporter.jsx', import.meta.url)),
    ).toBe(false);

    for (const file of sourceFiles('src')) {
      const source = read(file);
      expect(source, `${file} must not contain CartridgeImporter`).not.toContain(
        'CartridgeImporter',
      );
      expect(source, `${file} must not import the AI prompt payload`).not.toContain(
        'ai-converter-prompt.md?raw',
      );
    }
  });

  it('has no import, activation or reset entry point in any role-device source', () => {
    for (const file of roleSources) {
      const source = read(file);
      for (const term of forbiddenRoleDeviceTerms) {
        expect(source, `${file} must not contain "${term}"`).not.toContain(term);
      }
    }
  });

  it('keeps only the read-only cache API, never an activation API', () => {
    expect(cartridgeStorage.saveActiveCartridge).toBeUndefined();
    expect(cartridgeStorage.loadActiveCartridge).toBeUndefined();
    expect(cartridgeStorage.clearActiveCartridge).toBeUndefined();
    expect(cartridgeStorage.CARTRIDGE_STORAGE_KEY).toBeUndefined();
    expect(typeof cartridgeStorage.loadCachedCartridge).toBe('function');
    expect(typeof cartridgeStorage.saveCachedCartridge).toBe('function');
  });

  it('returns null for a missing cache instead of falling back to the demo', () => {
    expect(cartridgeStorage.loadCachedCartridge(WEDDING_ID, fakeStorage())).toBeNull();

    const app = read('src/App.jsx');
    // The production branch always starts without a wedding until the server or
    // a same-wedding snapshot provides one.
    expect(app).toContain("t('app.noPublishedCartridge')");
    expect(app).toContain("t('app.invalidPublishedCartridge')");
    expect(app).toContain("t('app.retry')");
    expect(app).not.toContain('STORED_CARTRIDGE');
  });

  it('caches the server snapshot by wedding with its revision marker', () => {
    const storage = fakeStorage();
    const saved = cartridgeStorage.saveCachedCartridge(
      {
        weddingId: WEDDING_ID,
        cartridge: clone(fixture),
        revision: '2026-11-06T10:00:00.000Z',
        fetchedAt: '2026-11-06T10:00:01.000Z',
      },
      storage,
    );

    expect(saved).toBe(true);
    const cached = cartridgeStorage.loadCachedCartridge(WEDDING_ID, storage);
    expect(cached.cartridge.weddingId).toBe(WEDDING_ID);
    expect(cached.cartridge.couple).toBe(fixture.couple);
    expect(cached.revision).toBe('2026-11-06T10:00:00.000Z');
    expect(cached.fetchedAt).toBe('2026-11-06T10:00:01.000Z');
  });

  it('rejects a cache entry from a different wedding', () => {
    const storage = fakeStorage();
    cartridgeStorage.saveCachedCartridge(
      { weddingId: WEDDING_ID, cartridge: clone(fixture) },
      storage,
    );

    expect(cartridgeStorage.loadCachedCartridge('another-wedding', storage)).toBeNull();
    expect(
      cartridgeStorage.saveCachedCartridge(
        { weddingId: 'another-wedding', cartridge: clone(fixture) },
        storage,
      ),
    ).toBe(false);

    // Even a manually tampered entry under another key is refused, because the
    // stored cartridge still belongs to the joined wedding.
    storage.setItem(
      `${cartridgeStorage.CARTRIDGE_CACHE_PREFIX}another-wedding`,
      JSON.stringify({ weddingId: 'another-wedding', cartridge: clone(fixture) }),
    );
    expect(cartridgeStorage.loadCachedCartridge('another-wedding', storage)).toBeNull();
  });

  it('rejects invalid cached snapshots', () => {
    const storage = fakeStorage();
    const invalid = clone(fixture);
    invalid.steps = [];
    storage.setItem(
      `${cartridgeStorage.CARTRIDGE_CACHE_PREFIX}${WEDDING_ID}`,
      JSON.stringify({ weddingId: WEDDING_ID, cartridge: invalid }),
    );

    expect(cartridgeStorage.loadCachedCartridge(WEDDING_ID, storage)).toBeNull();
    expect(
      cartridgeStorage.saveCachedCartridge(
        { weddingId: WEDDING_ID, cartridge: invalid },
        storage,
      ),
    ).toBe(false);
  });

  it('renders an offline snapshot read-only and clearly marked stale', () => {
    const storage = fakeStorage();
    cartridgeStorage.saveCachedCartridge(
      { weddingId: WEDDING_ID, cartridge: clone(fixture), revision: 'rev-1' },
      storage,
    );
    const cached = cartridgeStorage.loadCachedCartridge(WEDDING_ID, storage);
    expect(cached).not.toBeNull();

    const app = read('src/App.jsx');
    expect(app).toContain('loadCachedCartridge');
    expect(app).toContain('stale: true');
    expect(app).toContain('activeCartridgeState.stale');

    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("t('app.offlineCartridge')");
    expect(deck).toContain('role="status"');
  });

  it('keeps publishing on the admin surface only', () => {
    const sync = read('src/lib/sync/supabaseSyncClient.js');
    const fetchWedding = sync.slice(
      sync.indexOf('async function fetchWedding'),
      sync.indexOf('async function fetchSensitiveNotes'),
    );
    expect(fetchWedding).toContain(".from('weddings')");
    expect(fetchWedding).toContain('.select(');
    expect(fetchWedding).not.toContain('.insert(');
    expect(fetchWedding).not.toContain('.update(');
    expect(fetchWedding).not.toContain('.upsert(');

    expect(read('src/App.jsx')).not.toContain('publishWedding');
    expect(read('src/admin/AdminApp.jsx')).toContain('publishWedding');
    expect(read('src/admin/adminApi.js')).toContain('export async function publishWedding');
  });
});
