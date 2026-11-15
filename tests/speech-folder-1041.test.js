import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1041 COMPLEX speech folder resolution', () => {
  it('resolves the wedding folder instead of requiring a client folder id', () => {
    const fn = read('supabase/functions/admin_drive/index.ts');
    const block = fn.slice(fn.indexOf("if (action === 'create_speech_doc')"), fn.indexOf("if (action === 'rename_speech_doc')"));
    expect(block).not.toContain('!weddingFolderId');
    expect(block).toContain('resolveWeddingFolderId(');
    expect(block).toContain('resolvedWeddingFolderId');
    expect(block).toContain('missing_wedding_folder');
  });

  it('fails before any Drive write when the folder cannot be resolved', () => {
    const fn = read('supabase/functions/admin_drive/index.ts');
    const block = fn.slice(fn.indexOf("if (action === 'create_speech_doc')"), fn.indexOf("if (action === 'rename_speech_doc')"));
    const resolve = block.indexOf('resolvedWeddingFolderId = await resolveWeddingFolderId');
    const ensure = block.indexOf('ensureSpeechFolder');
    expect(resolve).toBeGreaterThan(-1);
    expect(ensure).toBeGreaterThan(resolve);
    expect(block.indexOf("code: 'missing_wedding_folder'")).toBeLessThan(ensure);
  });

  it('keeps the private speech path from #968', () => {
    const connector = read('supabase/functions/_shared/googleDrive.js');
    expect(connector).toContain('ensureSpeechFolder');
    expect(connector).toContain('secrets');
    expect(connector).toContain('speeches');
    const client = read('src/admin/AdminSpeechesPanel.jsx');
    expect(client).toContain("wedding.drive_folder_id ?? wedding.driveFolderId ?? ''");
  });
});
