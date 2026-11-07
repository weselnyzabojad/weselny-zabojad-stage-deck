import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #199 remove MC DJ / Audio cues', () => {
  const mc = read('src/views/McMasterView.jsx');

  it('removes the DJ / Audio cues block from the current step', () => {
    expect(mc).not.toContain('DJ / Audio Cues');
    expect(mc).not.toContain('Remote Stage Ping Ready');
  });

  it('keeps MC cues and the step launchers', () => {
    expect(mc).toContain('MC Cues');
    expect(mc).toContain('Open Teleprompter / Script');
    expect(mc).toContain('Game Clicker');
  });
});
