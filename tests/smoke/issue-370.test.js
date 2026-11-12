import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #370 Drive-only admin wedding library', () => {
  const admin = read('src/admin/AdminApp.jsx');

  it('removes the New wedding UI and inline create form', () => {
    expect(admin).not.toContain('New wedding');
    expect(admin).not.toContain('CreateWeddingForm');
    expect(admin).not.toContain('setShowCreate');
    expect(admin).not.toContain('Create one');
  });

  it('removes manual duplicate UI and API helpers', () => {
    expect(admin).not.toContain('AdminDuplicateDialog');
    expect(admin).not.toContain('handleDuplicate');
    expect(admin).not.toContain('duplicateWedding');
    expect(read('src/admin/adminApi.js')).not.toContain('duplicateWedding');
    expect(read('src/admin/AdminDialogs.jsx')).not.toContain('AdminDuplicateDialog');
  });

  it('keeps publish-revision, archive, PIN and Drive flows', () => {
    expect(admin).toContain('publishWedding');
    expect(admin).toContain('AdminPublishRevisionDialog');
    expect(admin).toContain('AdminDrivePanel');
    expect(admin).toContain('rotatePins');
    expect(admin).toContain('archiveWedding');
  });

  it('rejects manual server-side wedding creation outside Drive discovery', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('manual_create_disabled');
    expect(api).toContain('weddingExists(admin, weddingId)');
    expect(api).toContain("if (action === 'publish')");
    expect(api).not.toContain("if (action === 'duplicate')");
  });
});
