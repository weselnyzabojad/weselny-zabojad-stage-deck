import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { songRequestEligible } from '../../supabase/functions/_shared/songRequestEligibility.js';
import { VIEW_CATALOG, SONG_REQUEST_VIEW } from '../../src/lib/viewCatalog.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #886 Song Requestor eligibility', () => {
  it('requires a VIP package and a VIP DJ identity', () => {
    expect(
      songRequestEligible({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: 'dj_mark' }),
    ).toBe(true);
    expect(
      songRequestEligible({ servicePackage: 'DJ_MC', djIdentityId: 'dj_szymoniak' }),
    ).toBe(true);
    expect(songRequestEligible({ servicePackage: 'HOST_ONLY', djIdentityId: 'dj_mark' })).toBe(
      false,
    );
    expect(
      songRequestEligible({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: 'other_dj' }),
    ).toBe(false);
    expect(songRequestEligible({ servicePackage: 'HOST_AND_DJ_VIP' })).toBe(false);
  });

  it('rejects the server request for ineligible weddings', () => {
    const fn = read('supabase/functions/submit_song_request/index.ts');
    expect(fn).toContain("select('wedding_id, expires_at, archived_at, cartridge')");
    expect(fn).toContain('songRequestEligible(wedding.cartridge)');
    expect(fn).toContain('SONG_REQUESTS_UNAVAILABLE');
    expect(fn).toContain('403');
  });

  it('shows the unavailable state on the guest page', () => {
    const app = read('src/components/SongRequestApp.jsx');
    expect(app).toContain("result.code === 'song_requests_unavailable'");
    expect(app).toContain('setUnavailable(true)');
    expect(app).toContain('!config.enabled || unavailable');
  });

  it('models Song Requestor as an independent view, not a PIN role', () => {
    expect(VIEW_CATALOG.song_request).toBe(SONG_REQUEST_VIEW);
    expect(SONG_REQUEST_VIEW).toMatchObject({
      kind: 'public',
      pin: false,
      session: false,
      vipOnly: true,
    });
    expect(read('src/lib/roles.js')).not.toContain("id: 'song_request'");
  });
});
