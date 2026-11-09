import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #298 DJ Standard hides Music Policy', () => {
  const djBooth = read('src/components/DjBoothView.jsx');

  it('gates every MusicPolicyCard render behind the VIP tier', () => {
    const renders = djBooth.match(/<MusicPolicyCard\b/g) ?? [];
    expect(renders).toHaveLength(2);
    expect(djBooth).toContain('{caps.musicPolicy ? <MusicPolicyCard policy={musicPolicy} /> : null}');
    expect(djBooth).toMatch(
      /caps\.musicPolicy \? \(\s*<div className="space-y-4 lg:col-span-2">\s*<MusicPolicyCard policy=\{musicPolicy\} \/>/,
    );
  });
});
