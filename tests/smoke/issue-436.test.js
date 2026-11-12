import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #436 modal/toast i18n', () => {
  it('localizes the modal close label', () => {
    const modal = read('src/components/ModalShell.jsx');
    expect(modal).toContain("t('modal.close')");
    expect(modal).not.toContain('Close overlay');
  });

  it('localizes toast copy and actions', () => {
    const toast = read('src/components/UndoToast.jsx');
    for (const key of ['toast.actionApplied', 'toast.undo', 'toast.dismiss']) {
      expect(toast).toContain(key);
    }
    expect(toast).not.toContain('Action applied');
    expect(toast).not.toContain('aria-label="Dismiss"');
  });

  it('defines every key in all locales', () => {
    const keys = ['modal.close', 'toast.actionApplied', 'toast.undo', 'toast.dismiss'];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
