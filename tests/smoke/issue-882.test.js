import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { availableRoleIds, ROLES, ROLE_ORDER } from '../../src/lib/roles.js';
import { djCapabilities } from '../../src/lib/djCapabilities.js';
import { djDetailTier } from '../../src/lib/importantSongs.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #882 HOST_ONLY exposes DJ Standard', () => {
  it('keeps the DJ role visible for every package', () => {
    expect(availableRoleIds()).toEqual(ROLE_ORDER);
    expect(availableRoleIds('HOST_ONLY')).toEqual(ROLE_ORDER);
    expect(availableRoleIds('HOST_ONLY')).toContain('dj');
    expect(read('src/StageDeck.jsx')).toContain('availableRoleIds()');
    expect(read('src/StageDeck.jsx')).not.toContain('availableRoleIds(WEDDING.servicePackage)');
  });

  it('resolves HOST_ONLY to DJ Standard capabilities', () => {
    expect(djDetailTier({ servicePackage: 'HOST_ONLY' })).toBe('standard');
    const caps = djCapabilities(djDetailTier({ servicePackage: 'HOST_ONLY' }));
    expect(caps.vip).toBe(false);
    for (const key of ['guestRequests', 'musicPolicy', 'discoPolo', 'boothCues', 'vipAuth']) {
      expect(caps[key], key).toBe(false);
    }
  });

  it('does not change VIP packages', () => {
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP' })).toBe('vip');
    expect(djCapabilities('vip').vip).toBe(true);
  });

  it('does not expose Song Requestor as a stage role', () => {
    expect(ROLES.song_request).toBeUndefined();
    expect(ROLE_ORDER).not.toContain('song_request');
  });
});
