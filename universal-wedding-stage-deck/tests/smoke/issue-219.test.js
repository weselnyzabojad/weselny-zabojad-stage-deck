import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjBoothView from '../../src/components/DjBoothView.jsx';

const wedding = {
  weddingId: 'w1',
  date: '2026-11-07',
  couple: 'Jennifer & Guillaume',
  hostingMode: 'CLOUD',
  servicePackage: 'HOST_AND_DJ_STANDARD',
  culturalRules: {
    sto_lat: { status: 'STRICT_NO' },
    gorzko: { status: 'YES' },
  },
};

const timeline = [
  {
    index: 0,
    isActive: true,
    isDone: false,
    projectedStart: '18:00',
    projectedEnd: '18:30',
    step: {
      id: 'step_01',
      title: 'Hall Entrance',
      type: 'ELASTIC',
      location: 'Main Hall',
      durationMin: 30,
      dj: { track: 'Track A' },
    },
  },
];

const clock = {
  nowClock: '18:05:00',
  active: { title: 'Hall Entrance', elapsedSec: 300, remainingSec: 1500 },
  projectedFinish: '23:00',
  nextAnchor: null,
  djCutoff: null,
};

const baseProps = {
  wedding,
  timeline,
  projectedFinish: '23:00',
  clock,
  musicPolicy: {
    hasData: true,
    mustPlay: [],
    doNotPlay: [],
    requestStatus: null,
    cleanVersions: null,
    licensing: null,
  },
  syncStatus: 'connected',
  syncError: null,
  remoteUpdatedAt: null,
  role: 'dj',
  theme: 'night',
  onToggleTheme: () => {},
  culturalRules: wedding.culturalRules,
  speeches: [{ id: 's1', speaker: { name: 'Anna' } }],
  speechMode: 'COMPLEX',
  activeSpeechId: null,
};

function renderDj(overrides = {}) {
  return renderToStaticMarkup(createElement(DjBoothView, { ...baseProps, ...overrides }));
}

describe('issue #219 DJ Standard vs VIP restrictions', () => {
  it('keeps Standard free of VIP request and top-bar additions', () => {
    const html = renderDj({ servicePackage: 'HOST_AND_DJ_STANDARD' });
    expect(html).toContain('Set notes');
    expect(html).toMatch(/Music policy/i);
    expect(html).toContain('18:05:00');
    expect(html).not.toContain('Guest requests');
    expect(html).not.toContain('Sto Lat');
    expect(html).not.toContain('Speeches');
    expect(html).not.toContain('VIP booth cues');
  });

  it('shows VIP request bar and selected top-bar additions', () => {
    const html = renderDj({
      servicePackage: 'HOST_AND_DJ_VIP',
      authControl: createElement('span', null, 'ROLE: DJ'),
    });
    expect(html).toContain('Guest requests');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Speeches');
    expect(html).toContain('ROLE: DJ');
    expect(html).not.toContain('VIP booth cues');
    expect(html).not.toContain('Key Songs');
  });

  it('keeps both tiers on the shared timeline, clock, policy and notes', () => {
    for (const servicePackage of ['HOST_AND_DJ_STANDARD', 'HOST_AND_DJ_VIP']) {
      const html = renderDj({ servicePackage });
      expect(html).toContain('timeline-focus-stack');
      expect(html).toContain('18:05:00');
      expect(html).toMatch(/Music policy/i);
      expect(html).toContain('Set notes');
    }
  });
});
