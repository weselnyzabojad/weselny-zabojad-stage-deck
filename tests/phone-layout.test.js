import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Regression coverage for the responsive phone layouts (issues #110-#114).
// The phone chrome is shared (RoleShell + BottomNav); only the MC role may
// advance or undo the live timeline from the phone. Every other role is
// strictly read-only.
describe('responsive phone role shell', () => {
  it('keeps the desktop layout untouched via a wide pass-through', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('if (!isCompact)');
    expect(shell).toContain('<BottomNav');
    // The shell must not add its own header on wide screens.
    expect(shell).toContain('return <>{children}</>');
  });

  it('renders the bottom navigation on phones only', () => {
    const nav = read('src/components/BottomNav.jsx');
    expect(nav).toContain('if (!isCompact) return null');
  });

  it('keeps step actions out of the bottom bar (issue #421)', () => {
    const nav = read('src/components/BottomNav.jsx');
    expect(nav).not.toContain('HoldToConfirmButton');
    expect(nav).not.toContain('onUndo');
    expect(nav).not.toContain('onAdvance');
    expect(nav).not.toContain('handleAdvance');
    expect(nav).not.toContain('handleUndo');
  });

  it('wraps every role view with the shared shell', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('RoleShell');
      expect(source.includes('compactContent') || source.includes('speakerBody'), path).toBe(true);
      expect(source, path).toContain('isCompact');
    }
  });

  it('gives the MC phone layout advance and undo actions', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('HoldToConfirmButton');
    expect(mc).toContain('onClick={handleUndo}');
    expect(mc).toContain('onConfirm={handleAdvance}');
  });

  it('keeps the read-only phone layouts free of step controls', () => {
    for (const path of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      const source = read(path);
      expect(source, path).not.toContain('HoldToConfirmButton');
      expect(source, path).not.toContain('handleAdvance');
    }
  });

  it('never references the React global without importing it', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/RoleShell.jsx',
      'src/components/BottomNav.jsx',
    ]) {
      const source = read(path);
      if (/\bReact\./.test(source)) {
        expect(source, path).toMatch(/import\s+React\b/);
      }
    }
  });
});
