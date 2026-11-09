import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #441 mobile touch targets', () => {
  it('gives language and theme controls 44px targets', () => {
    expect(read('src/components/LanguageToggle.jsx')).toContain('min-h-11 min-w-11');
    const theme = read('src/components/ThemeToggle.jsx');
    expect(theme).toContain('h-11 w-11');
    expect(theme).toContain('sm:h-8 sm:w-8');
  });

  it('gives PIN, sync, open-on-phone and live controls a 44px target', () => {
    expect(read('src/components/SyncStatusBadge.jsx')).toContain('min-h-11');
    expect(read('src/components/OpenOnPhoneButton.jsx')).toContain('min-h-11');
    expect(read('src/components/SpeechesCard.jsx')).toContain('min-h-11');
    expect(read('src/components/RoleShell.jsx')).toContain('min-h-11');
    expect(read('src/views/McMasterView.jsx')).toContain('min-h-11');
  });

  it('gives Swap 44px and Undo 48px targets', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('min-h-11');
    expect(mc).toContain('min-h-12');
    const toast = read('src/components/UndoToast.jsx');
    expect(toast).toContain('min-h-11 min-w-11');
  });

  it('uses 24px checkbox visuals inside 44px rows', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/GroupPhotoChecklist.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('h-6 w-6');
      expect(source, path).toContain('min-h-11');
    }
  });
});
