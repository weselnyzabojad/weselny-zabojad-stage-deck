import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const NEW_KEYS = [
  'mc.title.signOut',
  'mc.title.savedLocally',
  'mc.savedLocally',
  'mc.localSaveUnavailable',
  'mc.undo.title',
  'mc.undo.nothing',
  'mc.undo.lastAction',
  'mc.undo.stepCompleted',
  'mc.undo.swappedSteps',
  'mc.undo.subtaskChanged',
  'mc.undo.speechSelection',
  'mc.undo.mediaOverride',
  'mc.undo.gameResults',
  'mc.confirm.signOut',
  'mc.confirm.swapCue',
  'mc.notice.swapped',
  'mc.notice.stepDone',
  'mc.notice.undone',
];

describe('issue #543 review follow-ups', () => {
  it('detects cake, entrance and first dance from stable cartridge signals', () => {
    const view = read('src/views/McMasterView.jsx');

    expect(view).toContain('cakeProtocol?.stepId');
    expect(view).toContain('step?.grandEntranceOrder');
    expect(view).toContain('step?.firstDanceMode');

    // Titles are localized cartridge content and must not drive the warning.
    expect(view).not.toMatch(/\/wedding cake\|cake cutting\//);
    expect(view).not.toMatch(/\/grand entrance\//);
    expect(view).not.toMatch(/\/first dance\//);
  });

  it('detects game steps only by the step game object', () => {
    const view = read('src/views/McMasterView.jsx');

    expect(view).toContain('Boolean(currentStep?.game)');
    expect(view).not.toContain('/games/i');
  });

  it('translates the MC confirm dialogs and control notices', () => {
    const deck = read('src/StageDeck.jsx');

    for (const key of [
      'mc.confirm.signOut',
      'mc.confirm.swapCue',
      'mc.notice.swapped',
      'mc.notice.stepDone',
      'mc.notice.undone',
      'mc.undo.swappedSteps',
      'mc.undo.stepCompleted',
    ]) {
      expect(deck).toContain(`t('${key}'`);
    }

    expect(deck).not.toContain('Sign out of this role? You will need the role PIN');
    expect(deck).not.toContain('Forget the room PIN on this device?');
    expect(deck).not.toContain('One of these steps carries a photographer cue.');
    expect(deck).not.toContain("setControlNotice('Step marked done.')");
    expect(deck).not.toContain("setControlNotice('Last action undone.')");
    expect(deck).not.toContain('notifyUndo(\'Swapped steps\')');
  });

  it('translates the MC pin, local-save and undo titles', () => {
    const view = read('src/views/McMasterView.jsx');
    const pin = read('src/components/RoleSignOutControl.jsx');

    for (const key of ['mc.title.signOut']) {
      expect(pin).toContain(`t('${key}'`);
    }
    for (const key of [
      'mc.title.savedLocally',
      'mc.savedLocally',
      'mc.localSaveUnavailable',
      'mc.undo.title',
      'mc.undo.nothing',
    ]) {
      expect(view).toContain(`t('${key}'`);
    }

    expect(view).not.toContain('title="Timeline progress survives');
    expect(view).not.toContain('"Nothing to undo"');
  });

  it('translates the shared role sign-out title', () => {
    const control = read('src/components/RoleSignOutControl.jsx');
    expect(control).toContain("from '../i18n/useI18n'");
    expect(control).toContain("t('mc.title.signOut')");
    expect(control).not.toContain("t('mc.title.forgetPin')");
  });

  it('defines every new key in all three locales', () => {
    for (const [locale, dictionary] of Object.entries({ en, fr, pl })) {
      for (const key of NEW_KEYS) {
        expect(dictionary[key], `${locale} is missing ${key}`).toBeTruthy();
      }
    }
  });

  it('aligns the roadmap status column with the delivery note', () => {
    const doc = read('project.md');
    const row = (issue) =>
      doc
        .split('\n')
        .find(
          (line) =>
            /^\| P\d \|/.test(line) && line.includes(`issues/${issue})`),
        );

    for (const issue of ['421', '426', '444', '469', '471']) {
      expect(row(issue)).toContain('| Shipped');
    }
    const optional459 = doc
      .split('\n')
      .find((line) => line.includes('| Optional | [#459]'));
    expect(optional459).toContain('| Open; owner approval required');
  });
});
