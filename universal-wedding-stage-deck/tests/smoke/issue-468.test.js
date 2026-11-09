import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjBoothView from '../../src/components/DjBoothView.jsx';
import { djCapabilities } from '../../src/lib/djCapabilities.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = { weddingId: '2026-08-20_test', dateISO: '2026-08-20' };
const clock = {
  now: new Date('2026-08-20T20:00:00Z'),
  nowClock: '22:00:00',
  timeZone: 'Europe/Warsaw',
  active: null,
  projectedFinish: '23:30',
  djCutoff: null,
};
const timeline = [
  {
    step: { id: 'step_01', title: 'Dinner', durationMin: 60 },
    isActive: true,
    isDone: false,
    projectedStart: '20:00',
    projectedEnd: '21:00',
  },
];
const musicPolicy = {
  hasData: true,
  mustPlay: [],
  doNotPlay: [],
  mainSongs: [],
  requestStatus: null,
  cleanVersions: true,
  discoPoloPolicy: 'YES',
};

const render = (servicePackage) => renderToStaticMarkup(
  createElement(DjBoothView, {
    wedding,
    timeline,
    projectedFinish: '23:30',
    clock,
    musicPolicy,
    syncStatus: 'disabled',
    role: 'dj',
    servicePackage,
    culturalRules: { sto_lat: { status: 'YES' } },
    speeches: [{ id: 's1' }],
    speechMode: 'LIGHT',
    roomCode: 'abc123',
  }),
);

describe('issue #468 DJ Standard capability gating', () => {
  it('documents the Standard/VIP matrix in one helper', () => {
    const standard = djCapabilities('standard');
    const vip = djCapabilities('vip');
    for (const key of [
      'guestRequests',
      'discoPolo',
      'culturalChips',
      'speeches',
      'musicPolicy',
      'boothCues',
      'vipAuth',
      'openOnPhone',
      'pocket',
      'devSimulator',
    ]) {
      expect(standard[key], key).toBe(false);
      expect(vip[key], key).toBe(true);
    }
    expect(standard.vip).toBe(false);
    expect(vip.vip).toBe(true);
  });

  it('renders no VIP-only controls for DJ Standard', () => {
    const html = render('HOST_AND_DJ_STANDARD');
    expect(html).toContain('Set notes');
    expect(html).toContain('Projected');
    for (const forbidden of [
      'Guest requests',
      'Song&#x27;s request QR',
      'Music policy',
      'Disco Polo',
      'Sto Lat',
      'Gorzko',
      'Speeches',
      'Open DJ VIP',
      'PIN:',
      'Accept',
      'Deny',
      'Played',
    ]) {
      expect(html, forbidden).not.toContain(forbidden);
    }
  });

  it('keeps approved VIP elements for DJ VIP', () => {
    const html = render('HOST_AND_DJ_VIP');
    expect(html).toContain('Guest requests');
    expect(html).toContain('Music policy');
    expect(html).toContain('Disco Polo');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Speeches');
  });

  it('uses the shared caps helper instead of ad-hoc isVip checks', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('const caps = djCapabilities(detailTier)');
    expect(dj).not.toContain('const isVip');
    expect((dj.match(/\bisVip\b/g) ?? []).length).toBe(0);
  });

  it('keeps Standard laptop-only and does not add auth/RLS work', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('if (!caps.pocket)');
    expect(read('docs/admin-setup-and-secrets.md')).not.toContain('djCapabilities');
  });
});
