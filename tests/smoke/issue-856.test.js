import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isHttpUrl } from '../../src/lib/importantSongs.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #856 cartridge URL scheme validation', () => {
  it('accepts only http/https links', () => {
    expect(isHttpUrl('https://example.com/song')).toBe(true);
    expect(isHttpUrl('http://example.com/song')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isHttpUrl('/relative')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });

  it('guards every ActionLink href in the key-songs card', () => {
    const source = read('src/components/KeySongsCard.jsx');

    expect(source).toContain('isHttpUrl');
    expect(source).toContain('if (!isHttpUrl(href)) return null;');
  });
});
