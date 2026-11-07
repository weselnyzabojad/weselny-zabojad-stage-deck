import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #399 cake step consolidation', () => {
  it('removes the separate cake service block', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('Cake service');
    expect(mc).not.toContain('ask guests to come to the cake spot');
    expect(mc).not.toContain('return plated pieces');
  });

  it('folds the service mode into Cake Protocol', () => {
    const cake = read('src/components/CakeCard.jsx');
    expect(cake).toContain('cakeServiceMode');
    expect(cake).toContain('serviceModeLabel');
    expect(cake).toContain("t('mandatory.cake')");
  });

  it('does not render generic mandatory notes on the cake step', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('{isCakeStep ? null : <StepMandatoryNotes items={mandatoryItems} />}');
  });
});
