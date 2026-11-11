import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyMediaLeaveTimes, readMediaLeaveTimes } from '../src/admin/adminMediaLeaves.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const cartridge = () => ({
  weddingId: '2026-11-09_demo',
  steps: [
    {
      id: 'photo_leave',
      time: '20:30',
      title: 'Photographer leaves',
      mandatory: { kind: 'MILESTONE', milestoneKind: 'PHOTO', label: 'Photographer leaves' },
    },
    {
      id: 'camera_leave',
      time: '20:30',
      title: 'Cameraman leaves',
      mandatory: { kind: 'MILESTONE', milestoneKind: 'CAMERA', label: 'Cameraman leaves' },
    },
    { id: 'dinner', time: '18:30', title: 'Dinner' },
  ],
});

describe('issue #721 admin media leave override', () => {
  it('reads the two media leave times from the cartridge', () => {
    expect(readMediaLeaveTimes(cartridge())).toEqual({ photo: '20:30', camera: '20:30' });
  });

  it('patches only the two media leave steps', () => {
    const source = cartridge();
    const result = applyMediaLeaveTimes(source, { photo: '21:15', camera: '21:45' });
    expect(result.errors).toEqual([]);
    expect(result.cartridge.steps[0].time).toBe('21:15');
    expect(result.cartridge.steps[1].time).toBe('21:45');
    expect(result.cartridge.steps[2].time).toBe('18:30');
    // The source cartridge is not mutated.
    expect(source.steps[0].time).toBe('20:30');
  });

  it('rejects malformed times and missing milestone steps', () => {
    expect(applyMediaLeaveTimes(cartridge(), { photo: '9:5' }).errors).toHaveLength(1);
    expect(
      applyMediaLeaveTimes({ steps: [{ id: 'dinner', time: '18:30' }] }, { photo: '20:30' })
        .errors,
    ).toHaveLength(1);
  });

  it('wires the editor into the owner admin', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('Edit media leaves');
    expect(app).toContain('AdminMediaLeaveDialog');
    expect(app).toContain('applyMediaLeaveTimes');
    expect(read('src/admin/AdminDialogs.jsx')).toContain('AdminMediaLeaveDialog');
    expect(read('src/admin/AdminDialogs.jsx')).toContain('getRevisionContext');
  });
});
