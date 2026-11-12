import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { manifestHash } from '../../src/lib/driveFolders.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #365 Drive refresh and manifest hash', () => {
  const files = [
    { id: 'a', name: '2027', version: '1', modifiedTime: '2026-11-07T10:00:00Z' },
    { id: 'b', name: 'September', version: '2', modifiedTime: '2026-11-07T11:00:00Z' },
  ];

  it('is stable regardless of folder order', () => {
    expect(manifestHash(files)).toBe(manifestHash([...files].reverse()));
  });

  it('changes when a folder is added or modified', () => {
    const base = manifestHash(files);
    expect(manifestHash([...files, { id: 'c', name: 'New', version: '1' }])).not.toBe(base);
    expect(
      manifestHash([
        files[0],
        { ...files[1], version: '3' },
      ]),
    ).not.toBe(base);
    expect(
      manifestHash([
        files[0],
        { ...files[1], modifiedTime: '2026-11-08T11:00:00Z' },
      ]),
    ).not.toBe(base);
  });

  it('refreshes on admin open and reuses unchanged cached year data', () => {
    const ui = read('src/admin/AdminWeddingFolders.jsx');
    expect(ui).toContain('yearCacheRef');
    expect(ui).toContain('manifestHash');
    expect(ui).toContain('No folder changes since the last scan.');
    expect(ui).toContain('Folder changes detected and processed.');
    expect(ui).toContain('useEffect');
  });

  it('keeps the previous library when a scan fails', () => {
    const ui = read('src/admin/AdminWeddingFolders.jsx');
    const catchBlock = ui.slice(ui.indexOf('catch (err)'), ui.indexOf('finally'));
    expect(catchBlock).not.toContain('setMonths([])');
    expect(ui).toContain('Refresh folders');
  });
});
