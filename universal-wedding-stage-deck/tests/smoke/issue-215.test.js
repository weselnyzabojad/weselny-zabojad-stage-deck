import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleSignOutControl from '../../src/components/RoleSignOutControl.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #215 DJ top bar rework', () => {
  const dj = read('src/components/DjBoothView.jsx');
  const deck = read('src/StageDeck.jsx');

  it('removes the duplicate headphone/DJ VIP role label', () => {
    expect(dj).not.toContain('TopBarRoleLabel');
    expect(dj).toContain('<TopBarRoleIdentity role={role} tier={tierLabel} />');
  });

  it('adds cultural, Speeches and auth controls only for VIP', () => {
    expect(dj).toContain('{caps.culturalChips && culturalRules ? (');
    expect(dj).toContain('<CulturalRulesBar rules={culturalRules}');
    expect(dj).toContain('{caps.guestRequests ? (');
    expect(dj).toContain('<SpeechesChip');
    expect(dj).toContain('{caps.vipAuth && authControl ? authControl : null}');
  });

  it('does not add the MC drift pill', () => {
    expect(dj).not.toContain('<DriftPill');
  });

  it('passes VIP data and the authenticated control from StageDeck', () => {
    expect(deck).toContain('culturalRules={WEDDING.culturalRules}');
    expect(deck).toContain('speeches={speeches}');
    expect(deck).toContain('speechMode={speechMode}');
    expect(deck).toContain('activeSpeechId={liveState.active_speech_id}');
    expect(deck).toContain('<RoleSignOutControl');
    expect(deck).toContain('role={baseRole}');
  });

  it('renders the authenticated role sign-out element', () => {
    const html = renderToStaticMarkup(
      createElement(RoleSignOutControl, {
        isProduction: true,
        role: 'dj',
        onSignOut: () => {},
      }),
    );
    expect(html).toContain('ROLE:');
    expect(html).toContain('DJ');
  });
});
