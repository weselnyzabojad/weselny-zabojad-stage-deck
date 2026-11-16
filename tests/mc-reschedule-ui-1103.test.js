import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1103 MC reschedule UI', () => {
  const view = read('src/views/McMasterView.jsx');
  const stack = read('src/components/TimelineFocusStack.jsx');
  const card = read('src/components/StageStepCard.jsx');
  const deck = read('src/StageDeck.jsx');

  it('wires upcoming rail actions on both MC layouts', () => {
    expect(view).toContain('rescheduleActions');
    expect(view.match(/entryActions=\{rescheduleActions\}/g)).toHaveLength(2);
    expect(stack).toContain('entryActions');
    expect(stack).toContain('action={entryActions?.[key] ?? null}');
    expect(card).toContain('action = null');
    expect(card).toContain('{action ? <div className="shrink-0 pt-0.5">{action}</div> : null}');
  });

  it('uses the shared modal and the core reschedule action', () => {
    expect(view).toContain('<ModalShell');
    expect(view).toContain("type=\"time\"");
    expect(view).toContain('rescheduleStep(editingStepId, time)');
    expect(view).toContain("t('mc.reschedule.error')");
    expect(view).toContain("setUndoToast({ id: Date.now(), label: t('mc.undo.scheduleChanged') })");
    expect(deck).toContain('handleRescheduleStep');
    expect(deck).toContain("setMediaOverride('steps', result.steps, {");
    expect(deck).toContain("kind: 'reschedule'");
  });

  it('shows a disabled hard-anchor control with an accessible info tooltip', () => {
    expect(view).toContain('function LockedStepInfo');
    expect(view).toContain('disabled');
    expect(view).toContain("aria-label={t('mc.reschedule.locked')}");
    expect(view).toContain("aria-describedby={open ? tooltipId : undefined}");
    expect(view).toContain("role=\"tooltip\"");
    expect(view).toContain("setOpen((value) => !value)");
    expect(view).toContain('onMouseEnter');
    expect(view).toContain('onFocus');
  });

  it('keeps compact and wide undo toasts', () => {
    expect(view.match(/<UndoToast/g)).toHaveLength(2);
  });

  it('localizes every new label', () => {
    const en = read('src/i18n/en.js');
    const fr = read('src/i18n/fr.js');
    const pl = read('src/i18n/pl.js');
    for (const key of [
      'mc.reschedule.actionLabel',
      'mc.reschedule.title',
      'mc.reschedule.description',
      'mc.reschedule.time',
      'mc.reschedule.apply',
      'mc.reschedule.cancel',
      'mc.reschedule.error',
      'mc.reschedule.locked',
      'mc.reschedule.info',
      'mc.undo.scheduleChanged',
    ]) {
      expect(en).toContain(`'${key}'`);
      expect(fr).toContain(`'${key}'`);
      expect(pl).toContain(`'${key}'`);
    }
  });
});
