import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import OczepinyCueCard from '../src/components/OczepinyCueCard.jsx';
import StageStepCard from '../src/components/StageStepCard.jsx';
import StepMandatoryNotes from '../src/components/StepMandatoryNotes.jsx';
import { DEMO_WEDDING } from '../src/demo/demoWedding.js';
import { setLocale } from '../src/i18n/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

afterEach(() => setLocale('en', { persist: false }));

describe('issue #765 MC step card header and cue cleanup', () => {
  it('gives the MC start–end summary the same weight as the step title', () => {
    setLocale('en', { persist: false });
    const entry = {
      step: {
        id: 'first_guests_arrival',
        time: '15:30',
        durationMin: 60,
        title: 'First guests arrival',
        type: 'HARD_ANCHOR',
        location: 'Garden',
      },
      index: 0,
      projectedStart: '15:30',
      projectedEnd: '16:30',
    };
    const html = renderToStaticMarkup(
      createElement(StageStepCard, { entry, variant: 'current', polished: true }),
    );

    expect(html).toContain('15:30–16:30');
    expect(html).toContain('font-heading text-sm font-semibold text-ink');
    expect(read('src/components/StageStepCard.jsx')).toContain(
      "? 'font-heading text-sm font-semibold text-ink'",
    );
  });

  it('hides the mandatory heading on MC but keeps every value', () => {
    setLocale('en', { persist: false });
    const html = renderToStaticMarkup(
      createElement(StepMandatoryNotes, {
        showHeading: false,
        items: [
          { kind: 'kitchenService', label: 'Dinner', time: '18:30', mode: 'TABLE_SERVICE' },
          { kind: 'cakeServiceMode', mode: 'KITCHEN_RETURN' },
        ],
      }),
    );

    expect(html).not.toContain('<h3');
    expect(html).not.toContain('📌');
    expect(html).toContain('18:30');
    expect(html).toContain('Dinner');
    expect(html).toContain('Cake');
  });

  it('removes the More/swap disclosure and keeps the game clicker', () => {
    const mc = read('src/views/McMasterView.jsx');

    expect(mc).not.toContain('CurrentStepOverflow');
    expect(mc).not.toContain('hideStepOverflow');
    expect(mc).not.toContain('onSwap={handleSwap}');
    expect(mc).toContain(
      'const showGameBriefing = isGameStep && !isPredefinedGameStep(currentStep)',
    );
    expect(mc).toContain("setOverlay('game')");
    expect(mc).toContain('<GameClickerOverlay');
    expect(mc).toContain('showHeading={false}');
  });

  it('renders Oczepiny as labeled chips with icons', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(
      createElement(OczepinyCueCard, { wedding: DEMO_WEDDING, audience: 'mc' }),
    );

    expect(html).toContain('💐');
    expect(html).toContain('Lancers');
    expect(html).toContain('🎮');
    expect(html).toContain('Jeu activé');
    expect(html).toContain('🎵');
    expect(html).toContain('Musique');
    expect(html).toContain('📸');
    expect(html).toContain('Repère photo des gagnants');
  });
});
