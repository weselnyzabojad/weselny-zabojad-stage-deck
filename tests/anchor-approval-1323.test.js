import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AnchorApprovalPanel from '../src/components/AnchorApprovalPanel.jsx';
import {
  anchorApprovalFor,
  decideAnchorApproval,
  isApprovableAnchor,
} from '../src/lib/anchorApprovals.js';
import {
  applyMediaOverride,
  createLiveState,
  mergeMutationLogs,
  normalizeLiveState,
} from '../src/lib/liveStageState.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const NOW = new Date('2026-11-21T00:00:00Z');

const cake = {
  id: 'step_05',
  title: 'Wedding Cake',
  time: '20:30',
  type: 'HARD_ANCHOR',
  mandatory: { kind: 'CAKE_SERVICE' },
};
const dinner = {
  id: 'step_04',
  title: 'Dinner',
  time: '19:00',
  type: 'FLEXIBLE',
  mandatory: { kind: 'KITCHEN_SERVICE' },
};
const steps = [dinner, cake];

describe('issue #1323 Venue Manager hard-anchor approval', () => {
  it('starts every CAKE and KITCHEN anchor as PENDING', () => {
    expect(steps.filter(isApprovableAnchor)).toEqual([dinner, cake]);
    for (const anchor of steps) {
      expect(anchorApprovalFor({}, anchor)).toMatchObject({
        anchorId: anchor.id,
        status: 'PENDING',
        approvedBy: null,
        approvedAt: null,
        approvedValue: anchor.time,
        reason: null,
      });
    }
  });

  it('records actor, timestamp, exact value and optional reason', () => {
    const approved = decideAnchorApproval({
      status: 'APPROVED',
      anchor: cake,
      actor: { role: 'venue_manager', deviceId: 'venue-tablet' },
      now: NOW,
    });
    expect(approved).toMatchObject({
      anchorId: 'step_05',
      anchorLabel: 'Wedding Cake',
      status: 'APPROVED',
      approvedBy: 'venue-tablet',
      approvedAt: '2026-11-21T00:00:00.000Z',
      approvedValue: '20:30',
      reason: null,
    });

    const rejected = decideAnchorApproval({
      status: 'REJECTED',
      anchor: dinner,
      actor: { role: 'venue_manager' },
      reason: '  Kitchen cannot serve that early  ',
      now: NOW,
    });
    expect(rejected).toMatchObject({
      status: 'REJECTED',
      approvedBy: 'venue_manager',
      approvedValue: '19:00',
      reason: 'Kitchen cannot serve that early',
    });
  });

  it('resets to PENDING when the anchor time changes', () => {
    const approved = decideAnchorApproval({
      status: 'APPROVED',
      anchor: cake,
      actor: { role: 'venue_manager' },
      now: NOW,
    });
    expect(anchorApprovalFor({ step_05: approved }, cake).status).toBe('APPROVED');
    expect(anchorApprovalFor({ step_05: approved }, { ...cake, time: '21:00' })).toMatchObject({
      status: 'PENDING',
      approvedBy: null,
      approvedValue: '21:00',
    });
  });

  it('renders pending, approved and rejected states with controls', () => {
    const approved = decideAnchorApproval({
      status: 'APPROVED',
      anchor: cake,
      actor: { role: 'venue_manager' },
      now: NOW,
    });
    const rejected = decideAnchorApproval({
      status: 'REJECTED',
      anchor: dinner,
      actor: { role: 'venue_manager' },
      reason: 'Too early',
      now: NOW,
    });
    const html = renderToStaticMarkup(
      createElement(AnchorApprovalPanel, {
        steps,
        approvals: { step_05: approved, step_04: rejected },
      }),
    );
    expect(html).toContain('Cake and kitchen approval');
    expect(html).toContain('APPROVED');
    expect(html).toContain('REJECTED');
    expect(html).toContain('Too early');
    expect(html).toContain('Approve Wedding Cake');
    expect(html).toContain('Reject Dinner');
    expect(html).toContain('Reason (optional)');

    const pending = renderToStaticMarkup(
      createElement(AnchorApprovalPanel, { steps }),
    );
    expect(pending).toContain('PENDING');
  });

  it('disables approval controls for a read-only wedding', () => {
    const html = renderToStaticMarkup(
      createElement(AnchorApprovalPanel, { steps, readOnly: true }),
    );
    expect(html).toContain('disabled=""');
  });

  it('is wired only into the Venue Manager view', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain("import AnchorApprovalPanel from './AnchorApprovalPanel';");
    expect(venue).toContain('<AnchorApprovalPanel');
    expect(venue).toContain('onSetAnchorApproval');
    expect(venue).toContain('decideAnchorApproval({');

    for (const view of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      if (view.endsWith('VenueManagerView.jsx')) continue;
      expect(read(view), view).not.toContain('AnchorApprovalPanel');
    }

    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('anchorApprovals={liveState.media_overrides?.anchorApprovals?.value ?? {}}');
    expect(deck).toContain("setMediaOverride('anchorApprovals', approvals)");
  });

  it('persists across reconnect and keeps the audit append-only on replay', () => {
    let state = createLiveState(steps);
    state = applyMediaOverride(
      state,
      'anchorApprovals',
      {
        step_05: decideAnchorApproval({
          status: 'APPROVED',
          anchor: cake,
          actor: { role: 'venue_manager' },
          now: NOW,
        }),
      },
      { role: 'venue_manager' },
      NOW,
    );
    const normalized = normalizeLiveState(state, steps);
    expect(normalized.media_overrides.anchorApprovals.value.step_05.status).toBe('APPROVED');

    const replayed = mergeMutationLogs(state.mutation_log, state.mutation_log);
    expect(replayed).toHaveLength(state.mutation_log.length);
    expect(state.mutation_log.at(-1).op).toBe('media_override');
  });

  it('never changes the anchor time or blocks the timeline', () => {
    const approved = decideAnchorApproval({
      status: 'APPROVED',
      anchor: cake,
      actor: { role: 'venue_manager' },
      now: NOW,
    });
    expect(approved.approvedValue).toBe(cake.time);
    expect(cake).toMatchObject({ time: '20:30', type: 'HARD_ANCHOR' });
  });
});
