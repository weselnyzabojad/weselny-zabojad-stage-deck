import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #434 scoped text selection', () => {
  it('removes the body-level selection lock', () => {
    expect(read('index.html')).not.toMatch(/<body[^>]*select-none/);
  });

  it('lets role roots and content be selectable', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/PairingScreen.jsx',
      'src/components/RoleJoinScreen.jsx',
    ]) {
      const source = read(path);
      expect(source, path).not.toContain('select-none');
    }
  });

  it('keeps select-none on press-and-hold chrome only', () => {
    expect(read('src/components/HoldToConfirmButton.jsx')).toContain('select-none');
  });
});
