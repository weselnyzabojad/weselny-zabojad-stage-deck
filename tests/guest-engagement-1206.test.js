import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HEATMAP_BUCKET_COUNT,
  buildHeatmapModel,
  buildTimelineBlocks,
  groupRequestsByTimeSlot,
} from '../src/lib/guestEngagement.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const TZ = 'Europe/Warsaw';

function request(createdAt) {
  return { createdAt };
}

describe('issue #1206 guest engagement heatmap data model', () => {
  it('buckets requests on the fixed 18:00–04:00 axis', () => {
    const { buckets, excluded } = groupRequestsByTimeSlot(
      [
        request('2026-08-20T16:00:00Z'), // 18:00
        request('2026-08-20T16:14:00Z'), // 18:14
        request('2026-08-20T16:15:00Z'), // 18:15
        request('2026-08-20T21:59:00Z'), // 23:59
        request('2026-08-20T22:00:00Z'), // 00:00
        request('2026-08-21T01:59:00Z'), // 03:59
        request('2026-08-21T02:00:00Z'), // 04:00 outside
        request('2026-08-20T15:59:00Z'), // 17:59 outside
      ],
      15,
      { timeZone: TZ },
    );
    expect(buckets).toHaveLength(HEATMAP_BUCKET_COUNT);
    expect(buckets[0].count).toBe(2);
    expect(buckets[1].count).toBe(1);
    expect(buckets[23].count).toBe(1);
    expect(buckets[24].count).toBe(1);
    expect(buckets[39].count).toBe(1);
    expect(excluded).toBe(2);
  });

  it('excludes invalid timestamps and supports a custom interval', () => {
    const result = groupRequestsByTimeSlot(
      [request('bad'), request('2026-08-20T16:00:00Z')],
      30,
      { timeZone: TZ },
    );
    expect(result.buckets).toHaveLength(20);
    expect(result.buckets[0].count).toBe(1);
    expect(result.excluded).toBe(1);
  });

  it('builds clipped timeline blocks in order', () => {
    const blocks = buildTimelineBlocks([
      { id: 'a', title: 'Arrival', type: 'FLEXIBLE', time: '18:00' },
      { id: 'b', title: 'Dinner', type: 'HARD_ANCHOR', time: '19:00' },
      { id: 'c', title: 'Close', type: 'HARD_ANCHOR', time: '21:00', mandatory: { kind: 'CLOSURE' } },
    ]);
    expect(blocks.map((block) => block.id)).toEqual(['a', 'b']);
    expect(blocks[0]).toMatchObject({
      start: '18:00',
      end: '19:00',
      startMinutes: 1080,
      endMinutes: 1140,
    });
    expect(blocks[1].startMinutes).toBe(1140);
  });

  it('builds the complete model including event completeness', () => {
    const model = buildHeatmapModel({
      requests: [request('2026-08-20T16:00:00Z'), request('2026-08-20T16:01:00Z')],
      steps: [{ id: 'a', title: 'Arrival', time: '18:00' }],
      eventComplete: true,
      timeZone: TZ,
    });
    expect(model.max).toBe(2);
    expect(model.excluded).toBe(0);
    expect(model.eventComplete).toBe(true);
    expect(model.blocks).toHaveLength(0);
  });

  it('has an owner-only admin endpoint that returns timestamps only', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'music_engagement'");
    expect(api).toContain("select('created_at')");
    expect(api).toContain('eventComplete');
    expect(api).not.toContain("select('song, artist, status");
  });
});
