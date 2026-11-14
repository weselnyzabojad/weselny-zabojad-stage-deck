import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChildrenExpectedBadge from '../src/components/ChildrenExpectedBadge.jsx';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import DriftPill from '../src/components/DriftPill.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import ThemeToggle from '../src/components/ThemeToggle.jsx';
import { buildDriftReport } from '../src/lib/driftEngine.js';

const render = (element) => renderToStaticMarkup(element);

const WHITE = 'border-black bg-white text-black';
const NEUTRAL = 'border-line bg-raised/45 text-ink';
const GREEN = 'border-tone-positive-border bg-tone-positive-bg text-tone-positive-text';
const RED = 'border-tone-negative-border bg-tone-negative-bg text-tone-negative-text';

describe('top-bar control colours', () => {
  it('keeps undecided cultural rules on the neutral surface', () => {
    const html = render(
      createElement(CulturalRulesBar, {
        rules: { sto_lat: { status: 'TBC' }, gorzko: { status: 'TBC' } },
        oczepinyStatus: { state: 'ON' },
      }),
    );
    expect(html).toContain(NEUTRAL);
  });

  it('turns requested cultural rules green and refused ones red', () => {
    const wanted = render(
      createElement(CulturalRulesBar, {
        rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'YES' } },
        oczepinyStatus: { state: 'ON' },
      }),
    );
    expect(wanted).toContain(GREEN);

    const refused = render(
      createElement(CulturalRulesBar, {
        rules: { sto_lat: { status: 'STRICT_NO' }, gorzko: { status: 'STRICT_NO' } },
        oczepinyStatus: { state: 'OFF' },
      }),
    );
    expect(refused).toContain(RED);
  });

  it('turns the speeches chip green when speeches are wanted', () => {
    const off = render(
      createElement(SpeechesChip, { mode: 'OFF', speeches: [] }),
    );
    expect(off).toContain(RED);

    const wanted = render(
      createElement(SpeechesChip, {
        mode: 'COMPLEX',
        speeches: [{ id: 'speech_1', speaker: { name: 'Bartek' } }],
      }),
    );
    expect(wanted).toContain(GREEN);
  });

  it('keeps children expected red and children not expected green', () => {
    const expected = render(
      createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: true }, inline: true }),
    );
    expect(expected).toContain(RED);

    const notExpected = render(
      createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: false }, inline: true }),
    );
    expect(notExpected).toContain(GREEN);
  });

  it('shows the timeline tracker red when late and green with the next-step countdown on time', () => {
    const late = render(
      createElement(DriftPill, {
        drift: {
          canonicalDriftTone: 'late',
          canonicalDriftLabel: '+5 min LATE',
          canonicalDriftMinutes: 5,
          nextStepInSec: 120,
        },
      }),
    );
    expect(late).toContain(RED);
    expect(late).not.toContain('2:00');

    const onTime = render(
      createElement(DriftPill, {
        drift: {
          canonicalDriftTone: 'ontime',
          canonicalDriftLabel: 'ON TIME',
          canonicalDriftMinutes: 0,
          nextStepInSec: 120,
        },
      }),
    );
    expect(onTime).toContain(GREEN);
    expect(onTime).toContain('2:00');
  });

  it('gives the theme toggle the white/black default', () => {
    const html = render(createElement(ThemeToggle, { theme: 'night' }));
    expect(html).toContain(WHITE);
  });
});

describe('next-step countdown in the drift report', () => {
  const steps = [
    { id: 'step_1', type: 'FLEXIBLE', planned: '15:00' },
    { id: 'closure', type: 'HARD_ANCHOR', planned: '15:30', mandatory: { kind: 'CLOSURE' } },
  ];
  const context = { eventDateISO: '2026-11-07', timeZone: 'UTC' };

  it('counts down to the first step before the event starts', () => {
    const report = buildDriftReport(steps, {}, {
      ...context,
      now: new Date('2026-11-07T14:00:00Z'),
    });
    expect(report.drift.nextStepInSec).toBe(3600);
  });

  it('counts down to the end of the live step', () => {
    const report = buildDriftReport(
      steps,
      {
        active_step_id: 'step_1',
        actual_timestamps: { step_1: '2026-11-07T15:00:00.000Z' },
      },
      { ...context, now: new Date('2026-11-07T15:10:00Z') },
    );
    expect(report.drift.nextStepInSec).toBe(1200);
  });
});
