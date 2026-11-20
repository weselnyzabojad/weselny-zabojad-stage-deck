import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  acknowledgeUpdate,
  isUpdateAcknowledged,
} from '../src/lib/mandatoryAck.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    map,
  };
}

describe('issue #1042 mandatory update acknowledgement re-arm', () => {
  it('suppresses only the acknowledged revision', () => {
    const storage = fakeStorage();
    const base = { weddingId: 'W', role: 'mc', updatedAt: 'rev-1' };
    expect(acknowledgeUpdate(storage, base)).toBe(true);
    expect(isUpdateAcknowledged(storage, base)).toBe(true);
    expect(isUpdateAcknowledged(storage, { ...base, updatedAt: 'rev-2' })).toBe(false);
    expect(isUpdateAcknowledged(storage, { ...base, role: 'dj' })).toBe(false);
    expect(isUpdateAcknowledged(storage, { ...base, weddingId: 'OTHER' })).toBe(false);
  });

  it('never reuses a stale acknowledgement across revisions', () => {
    const storage = fakeStorage();
    acknowledgeUpdate(storage, { weddingId: 'W', role: 'dj', updatedAt: 'rev-1' });
    expect(isUpdateAcknowledged(storage, { weddingId: 'W', role: 'dj', updatedAt: 'rev-2' })).toBe(false);
    expect(storage.map.size).toBe(1);
  });

  it('keeps the MC-only mandatory popup gating', () => {
    const popup = read('src/components/MandatoryUpdatePopup.jsx');
    expect(popup).toContain("role !== 'mc'");
    expect(popup).not.toContain('isVipDj');
    expect(popup).toContain('role,');
    expect(popup).toContain('updatedAt: update.updatedAt');
  });

  it('keeps the alert dialog keyboard-accessible', () => {
    const popup = read('src/components/MandatoryUpdatePopup.jsx');
    expect(popup).toContain('role="alertdialog"');
    expect(popup).toContain('aria-modal="true"');
    expect(popup).toContain('aria-labelledby="mandatory-update-title"');
    expect(popup).toContain('<button');
  });
});
