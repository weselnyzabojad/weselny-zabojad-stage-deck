import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planTimelineDocUpdate, timelineTableText } from '../supabase/functions/_shared/timelineDocSync.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function cell(text, start) {
  return { content: [{ startIndex: start, endIndex: start + text.length + 1, paragraph: { elements: [{ textRun: { content: `${text}\n` } }] } }] };
}
function row(values, start) {
  return { tableCells: values.map((value, index) => cell(value, start + index * 10)) };
}
function mockDoc({ header = ['Hour', 'Step name', 'Example values'], rows = [['16:00', "Vin d'honneur", 'Location']] } = {}) {
  return {
    body: {
      content: [
        { paragraph: { elements: [{ textRun: { content: 'TIMELINE\n' } }] } },
        {
          startIndex: 20,
          table: {
            tableRows: [row(header, 30), ...rows.map((values, index) => row(values, 60 + index * 30))],
          },
        },
      ],
    },
  };
}

describe('issue #1377 Google Docs TIMELINE sync', () => {
  it('adds Docs API scope and connector methods', () => {
    const drive = read('supabase/functions/_shared/googleDrive.js');
    expect(drive).toContain('https://www.googleapis.com/auth/documents');
    expect(drive).toContain('async function getDocument(fileId)');
    expect(drive).toContain('async function batchUpdateDocument(fileId, requests = [])');
    expect(drive).toContain('resolvedDocsEndpoint}/${encodeURIComponent(fileId)}:batchUpdate');
  });

  it('locates the TIMELINE table and verifies the exact header', () => {
    const plan = planTimelineDocUpdate(mockDoc(), [
      { Hour: '18:00', 'Step name': 'Grand Entrance', 'Example values': 'Music' },
    ]);
    expect(plan.header).toEqual(['Hour', 'Step name', 'Example values']);
    expect(plan.requests.some((request) => request.insertText)).toBe(true);
    expect(timelineTableText(mockDoc())).toEqual([
      ['Hour', 'Step name', 'Example values'],
      ['16:00', "Vin d'honneur", 'Location'],
    ]);
  });

  it('rejects a missing table and a wrong header', () => {
    expect(planTimelineDocUpdate({ body: { content: [] } }, []).error.code).toBe(
      'timeline_table_missing',
    );
    expect(
      planTimelineDocUpdate(mockDoc({ header: ['Time', 'Step name', 'Example values'] }), []).error
        .code,
    ).toBe('timeline_header_mismatch');
  });

  it('adds and removes rows for count changes', () => {
    const added = planTimelineDocUpdate(mockDoc(), [
      { Hour: '17:00', 'Step name': 'One', 'Example values': '' },
      { Hour: '18:00', 'Step name': 'Two', 'Example values': '' },
    ]);
    expect(added.requests.some((request) => request.insertTableRow)).toBe(true);
    const removed = planTimelineDocUpdate(
      mockDoc({ rows: [['17:00', 'One', ''], ['18:00', 'Two', '']] }),
      [{ Hour: '17:00', 'Step name': 'One', 'Example values': '' }],
    );
    expect(removed.requests.some((request) => request.deleteTableRow)).toBe(true);
  });

  it('wires the action to source-of-truth rows and revision guards', () => {
    const source = read('supabase/functions/admin_drive/index.ts');
    expect(source).toContain("if (action === 'sync_wedding_timeline')");
    expect(source).toContain('createTimelineDraft(wedding.cartridge.steps ?? [])');
    expect(source).toContain('expectedRevision !== wedding.cartridge_revision');
    expect(source).toContain("code: 'timeline_stale'");
    expect(source).toContain('timeline_doc_synced_revision: wedding.cartridge_revision');
    expect(source).toContain("'sync_wedding_timeline'");
  });
});
