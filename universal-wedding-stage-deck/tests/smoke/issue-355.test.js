import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #355 MC Cues children warnings and language tags', () => {
  const mc = read('src/views/McMasterView.jsx');

  it('adds a warning for cake, entrance and first dance when children are expected', () => {
    expect(mc).toContain('childrenWarningFor(currentStep, cakeProtocol)');
    expect(mc).toContain("'mc.step.childrenCake'");
    expect(mc).toContain("'mc.step.childrenEntrance'");
    expect(mc).toContain("'mc.step.childrenDancefloor'");
    expect(mc).toContain('childrenExpected');
  });

  it('removes the language suffix and cue-line tags', () => {
    expect(mc).toContain("t('mc.step.cuesTitle')");
    expect(mc).not.toContain('MC Cues (FR / PL / EN)');
    expect(mc).not.toContain('[FR/PL]');
    expect(mc).not.toContain('>[FR]<');
    expect(mc).not.toContain('[ALL]');
  });

  it('no longer hardcodes demo cue text (#426)', () => {
    expect(mc).not.toContain('Inform guests: NO Sto Lat tonight!');
    expect(mc).not.toContain('Explain Polish Steak Tartare + Vodka tradition.');
    expect(mc).not.toContain('Announce Instax + Guestbook + 1st Anniv Bottle.');
  });
});
