import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #298 DJ Standard hides Music Policy', () => {
  const djBooth = read('src/components/DjBoothView.jsx');

  it('gates every Music Policy surface behind the VIP tier', () => {
    const renders = djBooth.match(/<MusicPolicyCard\b/g) ?? [];
    expect(renders).toHaveLength(1);
    expect(
      djBooth.match(
        /\{caps\.musicPolicy \? <MusicPolicyCard policy=\{musicPolicy\} \/> : null\}/g,
      ),
    ).toHaveLength(1);
    expect(djBooth).toContain('<DjSetNotesNotepad');
    expect(djBooth).toMatch(/const currentColumnFooter = caps\.musicPolicy \?/);
  });
});
