import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #232 Photographer VIP parity', () => {
  const photo = read('src/components/PhotographerView.jsx');
  const deck = read('src/StageDeck.jsx');

  it('adds cultural, Speeches and auth controls to the Photographer top bar', () => {
    expect(photo).toContain('<CulturalRulesBar');
    expect(photo).toContain('<SpeechesChip');
    expect(photo).toContain('{authControl}');
    expect(deck).toContain('culturalRules={WEDDING.culturalRules}');
    expect(deck).toContain('activeSpeechId={liveState.active_speech_id}');
  });

  it('adds the same VIP top-bar data to the pocket shell', () => {
    expect(photo).toContain('culturalRules={culturalRules}');
    expect(photo).toContain('speechMode={speechMode}');
    expect(photo).toContain('authControl={authControl}');
  });

  it('does not add the DJ guest request bar', () => {
    expect(photo).not.toContain('DjSongRequestQueue');
  });
});
