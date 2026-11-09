import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeLiveState } from '../../src/lib/liveStageState.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const steps = [{ id: 's1', title: 'Mini session' }];

describe('issue #229 sunset lifecycle and shared mini-session override', () => {
  it('normalizes and preserves shared media overrides', () => {
    const state = normalizeLiveState({
      step_order: ['s1'],
      active_step_id: 's1',
      media_overrides: { miniSessionTime: { value: '19:15' } },
    }, steps);
    expect(state.media_overrides.miniSessionTime.value).toBe('19:15');
  });

  it('wires the shared override and audit setter', () => {
    const hook = read('src/hooks/useLiveStageState.js');
    const deck = read('src/StageDeck.jsx');
    expect(hook).toContain("appendMutation(next, actor, 'media_override'");
    expect(hook).toContain('setMediaOverride');
    expect(deck).toContain("setMediaOverride('miniSessionTime', time)");
  });

  it('hides the sunset card after the mini session and exposes the override form', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('miniSessionDone');
    expect(photo).toContain('visibility.sunset && !miniSessionDone');
    expect(photo).not.toContain('visibility.sunset && sunset?.usable && !miniSessionDone');
    expect(photo).toContain('MiniSessionOverride');
    expect(photo).toContain('photo.saveForAllMedia');
  });
});
