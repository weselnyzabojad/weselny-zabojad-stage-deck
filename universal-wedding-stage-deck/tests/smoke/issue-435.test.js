import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #435 dynamic viewport units', () => {
  it('uses h-dvh on the MC root without a screen-height lock', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('h-dvh');
    expect(mc).not.toContain('h-screen');
  });

  it('uses min-h-dvh on every role root', () => {
    for (const path of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/PairingScreen.jsx',
      'src/components/RoleJoinScreen.jsx',
      'src/components/RoleShell.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('min-h-dvh');
      expect(source, path).not.toContain('min-h-screen');
    }
  });

  it('keeps safe-area padding on the bottom bar', () => {
    expect(read('src/components/BottomNav.jsx')).toContain('safe-area-inset-bottom');
  });
});
