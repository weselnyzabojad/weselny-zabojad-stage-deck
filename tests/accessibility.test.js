import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const ROLE_VIEWS = [
  'src/views/McMasterView.jsx',
  'src/components/DjBoothView.jsx',
  'src/components/PhotographerView.jsx',
  'src/components/SpeakerView.jsx',
];

describe('issue #97 skip link and focus targets', () => {
  it('gives every full-screen role view a skip link and a main landmark', () => {
    for (const path of ROLE_VIEWS) {
      const source = read(path);
      expect(source, path).toContain('<SkipLink');
      expect(source, path).toContain('id="main-content"');
      expect(source, path).toContain('tabIndex={-1}');
    }
  });

  it('gives the admin tabs a focusable panel', () => {
    const source = read('src/admin/AdminApp.jsx');
    expect(source).toContain('id="admin-tab-panel"');
    expect(source).toContain('changeTab');
  });
});
