import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #334 mobile overlay hardening', () => {
  it('keeps modal panels within the dynamic viewport and scrollable', () => {
    const modal = read('src/components/ModalShell.jsx');
    expect(modal).toContain('100dvh');
    expect(modal).toContain('overflow-hidden');
    expect(modal).toContain('safe-area-inset-bottom');
  });

  it('keeps the QR dialog content scrollable on narrow screens', () => {
    const qr = read('src/components/OpenOnPhoneButton.jsx');
    expect(qr).toContain('overflow-y-auto');
    expect(qr).toContain('safe-area-inset-bottom');
    expect(qr).toContain('sm:p-5');
  });

  it('keeps the mandatory update popup inside the viewport', () => {
    const popup = read('src/components/MandatoryUpdatePopup.jsx');
    expect(popup).toContain('max-h-[calc(100dvh-1rem)]');
    expect(popup).toContain('overflow-y-auto');
    expect(popup).toContain('safe-area-inset-bottom');
  });

  it('protects the bottom navigation from the home indicator', () => {
    const nav = read('src/components/BottomNav.jsx');
    expect(nav).toContain('safe-area-inset-bottom');
    expect(nav).toContain('min-h');
  });

  it('keeps the dev switcher inside the viewport', () => {
    expect(read('src/components/DevViewSwitcher.jsx')).toContain('max-h-[45dvh]');
  });
});
