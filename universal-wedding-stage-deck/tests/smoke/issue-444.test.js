import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #444 MC cues, game clicker and speeches i18n', () => {
  it('routes game clicker chrome through t()', () => {
    const game = read('src/components/GameClickerOverlay.jsx');
    for (const key of [
      'game.title',
      'game.questions',
      'game.none',
      'game.question',
      'game.answer',
      'game.reveal',
      'game.hide',
      'game.previous',
      'game.next',
      'game.finish',
      'game.help',
    ]) {
      expect(game, key).toContain(key);
    }
    for (const literal of [
      'Game questions',
      'No game questions attached',
      'Question {index',
      'Reveal answer',
      'Hide answer',
      '← Previous',
      'Finish ✓',
      'navigate · Space',
    ]) {
      expect(game, literal).not.toContain(literal);
    }
  });

  it('routes speeches card chrome through t()', () => {
    const speeches = read('src/components/SpeechesCard.jsx');
    for (const key of [
      'speeches.title',
      'speeches.offBody',
      'speeches.scriptReady',
      'speeches.scriptMissing',
      'speeches.speakerHidden',
      'speeches.complexMissing',
      'speeches.footer',
    ]) {
      expect(speeches, key).toContain(key);
    }
    for (const literal of [
      "active ? 'Stop live'",
      "Script ready",
      "Script missing",
      "'Consent ✓'",
      'Speaker hidden',
      'Cue: {speech.cue}',
      'Reads {speech.readFrom',
      'COMPLEX speech has no script yet',
      'The speaker device only receives',
    ]) {
      expect(speeches, literal).not.toContain(literal);
    }
  });

  it('localizes chip mode labels', () => {
    expect(read('src/components/SpeechesChip.jsx')).toContain('t(`speeches.mode.${mode}`)');
  });

  it('keeps MC cue headings and warnings on i18n keys', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("t('mc.step.cuesTitle')");
    expect(mc).toContain("'mc.step.childrenCake'");
    expect(mc).toContain("'mc.step.childrenEntrance'");
    expect(mc).toContain("'mc.step.childrenDancefloor'");
  });

  it('defines all keys in every locale', () => {
    const keys = [
      'game.title',
      'game.questions',
      'game.none',
      'game.question',
      'game.answer',
      'game.reveal',
      'game.hide',
      'game.previous',
      'game.next',
      'game.finish',
      'game.help',
      'speeches.title',
      'speeches.mode.OFF',
      'speeches.mode.LIGHT',
      'speeches.mode.COMPLEX',
      'speeches.offBody',
      'speeches.scriptReady',
      'speeches.scriptMissing',
      'speeches.consent',
      'speeches.consentPending',
      'speeches.speakerHidden',
      'speeches.complexMissing',
      'speeches.in',
      'speeches.ago',
      'speeches.footer',
    ];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
