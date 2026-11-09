import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSourceDoc,
  parseDriveFileId,
  sourceDocChanged,
} from '../../src/lib/speechSource.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #598 speech Google Doc import', () => {
  it('parses Docs, Drive and raw file ids', () => {
    expect(parseDriveFileId('https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit')).toBe(
      '1AbCdEfGhIjKlMnOp',
    );
    expect(parseDriveFileId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view')).toBe(
      '1AbCdEfGhIjKlMnOp',
    );
    expect(parseDriveFileId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp')).toBe(
      '1AbCdEfGhIjKlMnOp',
    );
    expect(parseDriveFileId('1AbCdEfGhIjKlMnOp')).toBe('1AbCdEfGhIjKlMnOp');
    expect(parseDriveFileId('not a link')).toBeNull();
  });

  it('builds the sourceDoc metadata and detects changes', () => {
    const file = {
      id: '1AbCdEfGhIjKlMnOp',
      name: 'Speech - Bartek',
      mimeType: 'application/vnd.google-apps.document',
      version: '42',
      modifiedTime: '2026-11-09T10:00:00.000Z',
    };
    const doc = buildSourceDoc(file, { retrievedAt: '2026-11-09T10:05:00.000Z' });
    expect(doc).toMatchObject({
      provider: 'GOOGLE_DRIVE',
      fileId: file.id,
      version: '42',
      retrievedAt: '2026-11-09T10:05:00.000Z',
    });
    expect(sourceDocChanged(doc, file)).toBe(false);
    expect(sourceDocChanged(doc, { ...file, version: '43' })).toBe(true);
  });

  it('wires preview, import and publish in the admin panel', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    expect(panel).toContain('previewDriveSource');
    expect(panel).toContain('publishWedding');
    expect(panel).toContain('getRevisionContext');
    expect(panel).toContain('sourceDoc');
    expect(panel).toContain('window.confirm');
    expect(read('src/admin/AdminApp.jsx')).toContain('AdminSpeechesPanel');
  });
});
