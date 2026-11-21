import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeSocialData } from '../src/admin/socialData.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const row = {
  wedding_id: 'W-UM-2026-08-001',
  couple: 'Anna & Piotr',
  date: '2026-08-20',
  venue_name: 'Dwor',
  venue_city: 'Warszawa',
  roles: ['mc', 'dj'],
};

const cartridge = {
  date: '2026-08-20',
  steps: [
    { id: 'step_01', time: '17:00', title: 'Ceremony', mandatory: { kind: 'FIRST_GUESTS_ARRIVAL' } },
  ],
  extensions: { languages: { supported: ['PL', 'fr', 'EN'] }, dateISO: '2026-08-20' },
  servicePackage: 'HOST_AND_DJ_VIP',
  djIdentityId: 'dj_mark',
};

describe('issue #1338 Admin Social Studio data wiring', () => {
  it('normalizes the row, cartridge, roles, languages and VIP DJ', () => {
    const data = normalizeSocialData({
      row,
      source: {
        wedding: cartridge,
        liveState: { active_step_id: 'step_01' },
        songRequests: [{ song: 'Perfect', artist: 'Ed Sheeran', status: 'accepted' }],
      },
      vipDjs: [{ id: 'dj_mark', display_name: 'DJ Mark' }],
    });

    expect(data.wedding).toMatchObject({
      wedding_id: row.wedding_id,
      cartridge,
      roles: ['mc', 'dj'],
      languages: ['PL', 'FR', 'EN'],
      servicePackage: 'HOST_AND_DJ_VIP',
      djIdentityId: 'dj_mark',
      vipDjName: 'DJ Mark',
    });
    expect(data.liveState).toMatchObject({ active_step_id: 'step_01' });
    expect(data.requests).toHaveLength(1);
    expect(data.recap).toBeTruthy();
  });

  it('uses null for a missing VIP DJ and tolerates partial data', () => {
    const data = normalizeSocialData({
      row,
      source: { wedding: null, liveState: null, songRequests: null },
      vipDjs: [],
    });
    expect(data.liveState).toBeNull();
    expect(data.requests).toEqual([]);
    expect(data.vipDjName).toBeNull();
    expect(data.wedding.cartridge).toEqual({});
  });

  it('fetches once per open and retries only on demand', () => {
    const hook = read('src/admin/useSocialData.js');
    expect(hook).toContain('getRecapSource(weddingId)');
    expect(hook).toContain('listVipDjs()');
    expect(hook).toContain('normalizeSocialData({');
    expect(hook).toContain('}, [active, weddingId, attempt]);');
    expect(hook).toContain('const retry = useCallback');
    expect(hook).toContain('let alive = true');
    expect(hook).toContain('alive = false');
  });

  it('wires the studio and keeps existing season props', () => {
    const portfolio = read('src/admin/AdminPortfolioOverview.jsx');
    expect(portfolio).toContain("import { useSocialData } from './useSocialData';");
    expect(portfolio).toContain('const social = useSocialData({ row: socialRow, active: Boolean(socialRow) });');
    expect(portfolio).toContain('wedding={social.data?.wedding ?? socialRow}');
    expect(portfolio).toContain('liveState={social.data?.liveState ?? null}');
    expect(portfolio).toContain('recap={social.data?.recap ?? null}');
    expect(portfolio).toContain('requests={social.data?.requests ?? []}');
    expect(portfolio).toContain('seasonData={season.data}');
    expect(portfolio).toContain('onRetry={social.retry}');
  });

  it('shows loading, error and retry states in the admin studio', () => {
    const studio = read('src/components/SocialExportStudio.jsx');
    expect(studio).toContain("t('social.loading')");
    expect(studio).toContain("t('social.retry')");
    expect(studio).toContain('dataLoading');
    expect(studio).toContain('dataError');
    expect(studio).toContain('onRetry');
  });
});
