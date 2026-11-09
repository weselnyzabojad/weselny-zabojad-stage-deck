import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const FORBIDDEN_LITERALS = [
  'HOLD TO ADVANCE',
  'EVENT COMPLETE',
  'Real start',
  'Est. end',
  'Planned:',
  'No script attached',
  'Open teleprompter / script',
  'Open Teleprompter / Script',
  'Game Clicker',
  'Sub-tasks',
];

describe('issue #428 MC view i18n', () => {
  it('routes current-step labels through t()', () => {
    const mc = read('src/views/McMasterView.jsx');
    for (const key of [
      'mc.step.holdAdvance',
      'mc.step.eventComplete',
      'mc.step.realStart',
      'mc.step.estimatedEnd',
      'mc.step.planned',
      'mc.step.noScript',
      'mc.step.openTeleprompter',
      'mc.step.gameClicker',
      'mc.step.cuesTitle',
      'mc.step.subtasksTitle',
      'mc.step.completed',
    ]) {
      expect(mc, key).toContain(key);
    }
  });

  it('leaves no user-facing English literals in the current-step body', () => {
    const mc = read('src/views/McMasterView.jsx');
    for (const literal of FORBIDDEN_LITERALS) {
      expect(mc, literal).not.toContain(literal);
    }
  });

  it('defines matching keys in every locale', () => {
    const keys = [
      'mc.step.holdAdvance',
      'mc.step.eventComplete',
      'mc.step.realStart',
      'mc.step.estimatedEnd',
      'mc.step.planned',
      'mc.step.noScript',
      'mc.step.openTeleprompter',
      'mc.step.gameClicker',
      'mc.step.cuesTitle',
      'mc.step.subtasksTitle',
      'mc.step.completed',
      'mc.step.childrenCake',
      'mc.step.childrenEntrance',
      'mc.step.childrenDancefloor',
    ];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
