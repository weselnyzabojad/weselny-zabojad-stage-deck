import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #246 remove ZAIKS/licensing from Music Policy', () => {
  const card = read('src/components/MusicPolicyCard.jsx');
  it('removes the licensing UI element', () => {
    expect(card).not.toContain('licensing');
    expect(card).not.toContain('ZAIKS');
  });
  it('keeps the other policy sections', () => {
    expect(card).toContain("music.mustPlay.title");
    expect(card).toContain("music.doNotPlay.title");
    expect(card).toContain('CleanChip');
  });
});
