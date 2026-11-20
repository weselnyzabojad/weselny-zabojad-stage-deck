import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1047 Drive file ancestry verification', () => {
  it('requires speech file ids to match the stored speech record', () => {
    const drive = read('supabase/functions/admin_drive/index.ts');
    const rename = drive.slice(drive.indexOf("if (action === 'rename_speech_doc')"), drive.indexOf("if (action === 'parse_speech_doc')"));
    const parse = drive.slice(drive.indexOf("if (action === 'parse_speech_doc')"), drive.indexOf("if (action === 'create_game_question_doc')"));
    for (const block of [rename, parse]) {
      expect(block).toContain("from('speech_records')");
      expect(block).toContain('speechRecord.drive_doc_id !== fileIdValue');
      expect(block).toContain('speechRecord.drive_folder_id');
      expect(block).toContain("code: 'file_mismatch'");
      expect(block).toContain("code: 'wrong_folder'");
    }
  });

  it('derives game Doc ids and folders from the stored record only', () => {
    const drive = read('supabase/functions/admin_drive/index.ts');
    const rewrite = drive.slice(drive.indexOf("if (action === 'rewrite_game_question_doc_columns')"), drive.indexOf("if (action === 'parse_game_question_doc')"));
    const parse = drive.slice(drive.indexOf("if (action === 'parse_game_question_doc')"), drive.indexOf("if (action === 'list_permissions'"));
    for (const block of [rewrite, parse]) {
      expect(block).toContain('current.drive_doc_id');
      expect(block).toContain("code: 'file_mismatch'");
      expect(block).toContain("code: 'folder_mismatch'");
      expect(block).toContain("current.drive_folder_id");
    }
  });

  it('rejects non-reader existing share permissions', () => {
    const drive = read('supabase/functions/admin_drive/index.ts');
    expect(drive).toContain("existing.role !== 'reader'");
    expect(drive).toContain("code: 'existing_permission_not_reader'");
  });

  it('anchors the secrets ancestor to a month-level folder', () => {
    const sharing = read('supabase/functions/_shared/driveSharing.js');
    expect(sharing).toContain('parent.parents');
    expect(sharing).toContain('The secrets folder is not under the wedding tree.');
  });
});
