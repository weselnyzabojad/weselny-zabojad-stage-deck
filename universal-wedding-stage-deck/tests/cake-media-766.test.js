import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #766 cake step card across MC and media views', () => {
  it('removes the cake photographer cue and ON AIR chip', () => {
    const cake = read('src/components/CakeCard.jsx');
    expect(cake).not.toContain('photographerCue');
    expect(cake).not.toContain('Photographer cue');
    expect(cake).not.toContain('ON AIR');
    expect(cake).not.toContain('STATE_LABELS.active');
  });

  it('uses the shared positive tone and enlarges the service mode', () => {
    const cake = read('src/components/CakeCard.jsx');
    expect(cake).toContain("import { desktopTone } from '../lib/topBarStyles.js'");
    expect(cake).toContain("desktopTone('positive')");
    expect(cake).toContain('text-xs font-semibold');
    expect(cake).toContain("if (sparklers !== true) return null");
  });

  it('renders the cake card on Photographer and Cameraman steps', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain("import CakeCard from './CakeCard'");
    expect(photo).toContain('cakeProtocol = null');
    expect(photo).toContain("cakeServiceMode = 'KITCHEN_RETURN'");
    expect(photo).toContain('if (cakeProtocol?.stepId)');
    expect(photo).toContain('cueBodies[cakeProtocol.stepId]');
    expect(photo).toContain('<CakeCard');
  });

  it('passes the resolved cake protocol from StageDeck', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('cakeProtocol={cakeProtocol}');
    expect(deck).toContain('cakeServiceMode={cakeServiceMode}');
  });
});
