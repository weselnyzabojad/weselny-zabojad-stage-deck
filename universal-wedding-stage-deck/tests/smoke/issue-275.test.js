import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #275 Venue Manager overrides and popup', () => {
  it('sends mandatory changes through the shared override setter', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("setMediaOverride('steps', nextSteps)");
    expect(deck).toContain('mandatoryOverride={liveState.media_overrides?.steps');
  });

  it('shows a non-auto-closing acknowledgement popup to non-Venue-Manager roles', () => {
    const popup = read('src/components/MandatoryUpdatePopup.jsx');
    expect(popup).toContain('role === \'venue_manager\'');
    expect(popup).toContain('Acknowledge');
    expect(popup).not.toContain('setTimeout');
  });

  it('audits overrides through the shared live-state mutation log', () => {
    expect(read('src/hooks/useLiveStageState.js')).toContain("appendMutation(next, actor, 'media_override'");
    expect(read('src/StageDeck.jsx')).toContain('<MandatoryUpdatePopup');
  });
});
