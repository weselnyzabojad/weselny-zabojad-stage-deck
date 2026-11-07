import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url));

describe('issue #202 MC summary card cleanup and embedded cake protocol', () => {
  const mc = read('src/views/McMasterView.jsx');
  const dj = read('src/components/DjBoothView.jsx');

  it('removes standalone Cake, Music Policy and Pre-wedding Checklist cards from MC', () => {
    expect(mc).not.toContain('<MusicPolicyCard');
    expect(mc).not.toContain('<PreWeddingChecklistCard');
    expect(mc).not.toContain('preWeddingTodos');
    expect(mc).not.toContain('musicPolicy');
    expect(exists('src/components/PreWeddingChecklistCard.jsx')).toBe(false);
  });

  it('embeds cake protocol only in the active cake step', () => {
    expect(mc).toContain('cakeProtocol?.stepId && currentStep.id === cakeProtocol.stepId');
    expect(mc).toContain('<CakeCard cake={cakeProtocol} />');
    expect(mc.match(/<CakeCard/g)?.length).toBe(1);
  });

  it('keeps Music Policy in the DJ Booth view', () => {
    expect(dj).toContain('<MusicPolicyCard');
    expect(exists('src/components/MusicPolicyCard.jsx')).toBe(true);
  });
});
