import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #771 remove MC timing and script metadata', () => {
  it('removes planned, real-start and estimated-end text from MC', () => {
    const mc = read('src/views/McMasterView.jsx');
    for (const key of [
      'mc.step.planned',
      'mc.step.realStart',
      'mc.step.estimatedEnd',
    ]) {
      expect(mc, key).not.toContain(key);
    }
    expect(mc).not.toContain('realStart');
    expect(mc).not.toContain('estimatedEnd');
  });

  it('keeps the completed counter', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("t('mc.step.completed'");
  });

  it('removes the no-script fallback but keeps the launchers', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('mc.step.noScript');
    expect(mc).toContain("setOverlay('teleprompter')");
    expect(mc).toContain("setOverlay('game')");
  });

  it('removes the keys from every locale', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'mc.step.planned',
        'mc.step.realStart',
        'mc.step.estimatedEnd',
        'mc.step.noScript',
      ]) {
        expect(dict, `${locale}:${key}`).not.toContain(`'${key}'`);
      }
    }
  });

  it('drops the unused model props from StageDeck', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).not.toContain('realStart,');
    expect(deck).not.toContain('estimatedEnd,');
  });
});
