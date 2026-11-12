import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #416 LATE stays stable on Undo', () => {
  it('captures and displays the frozen LATE drift across undo', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('setFrozenLateDrift(driftReport.drift)');
    expect(deck).toContain('const displayedDriftReport = frozenLateDrift');
    expect(deck).toContain('driftReport: displayedDriftReport');
  });

  it('releases the freeze on advance or swap', () => {
    const deck = read('src/StageDeck.jsx');
    const advance = deck.slice(deck.indexOf('const handleAdvance'), deck.indexOf('const handleUndo'));
    expect(advance).toContain('releaseLateFreeze()');
    const swap = deck.slice(deck.indexOf('const handleSwap'), deck.indexOf('const handleAdvance'));
    expect(swap).toContain('releaseLateFreeze()');
  });

  it('does not change the underlying drift engine', () => {
    expect(read('src/lib/driftEngine.js')).not.toContain('frozenLate');
  });
});
