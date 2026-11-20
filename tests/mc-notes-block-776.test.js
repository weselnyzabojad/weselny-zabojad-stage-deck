import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #776 MC Notes block replaces MC Cues', () => {
  it('renders the raw note with preserved line breaks and hides when empty', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('{currentStep.notes ? (');
    expect(mc).toContain('{currentStep.notes}');
    expect(mc).toContain('whitespace-pre-wrap');
  });

  it('removes the old MC Cues rendering and empty fallback', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('mcCues');
    expect(mc).not.toContain("t('mc.step.cuesTitle')");
    expect(mc).not.toContain("t('mc.cues.empty')");
    expect(mc).not.toContain('hideMcCues');
  });

  it('keeps the children warning independent of the Notes block', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('{childrenWarning ? (');
    expect(mc).toContain('{t(childrenWarning)}');
  });

  it('adds the Notes title and removes the retired cue keys in every locale', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).toContain("'mc.step.notesTitle'");
      expect(dict).not.toContain("'mc.step.cuesTitle'");
      expect(dict).not.toContain("'mc.cues.empty'");
    }
  });

  it('keeps the teleprompter and game clicker launchers', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("setOverlay('teleprompter')");
    expect(mc).toContain("setOverlay('game')");
  });
});
