import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import useCompact, { COMPACT_QUERY } from '../../src/hooks/useCompact.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #432 shell fixes', () => {
  it('uses the three-column top bar from lg', () => {
    const shell = read('src/components/TopBarShell.jsx');
    expect(shell).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(shell).toContain('lg:items-center');
    expect(shell).toContain('lg:justify-end');
    expect(shell).not.toContain('xl:grid-cols');
  });

  it('exposes one shared compact hook', () => {
    expect(COMPACT_QUERY).toBe('(max-width: 639px)');
    expect(typeof useCompact).toBe('function');

    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/RoleShell.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('useCompact');
      expect(source, path).not.toContain("matchMedia('(max-width: 639px)')");
    }
  });

  it('stores DjBoothView and PhotographerView as UTF-8 without BOM', () => {
    for (const path of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/admin/adminDemoApi.js',
    ]) {
      const source = read(path);
      expect(source.charCodeAt(0), path).not.toBe(0xfeff);
      expect(source, path).not.toMatch(/[âÂđď]/);
    }
  });
});
