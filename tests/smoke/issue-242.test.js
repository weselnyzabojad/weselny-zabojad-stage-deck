import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #242 full-width media step layout', () => {
  const photo = read('src/components/PhotographerView.jsx');

  it('removes the centered max-width content cap', () => {
    expect(photo).not.toContain('max-w-5xl');
    expect(photo).not.toContain('max-w-3xl');
    expect(photo).toContain('w-full space-y-4');
  });

  it('keeps the shared media view used by all media roles', () => {
    expect(read('src/StageDeck.jsx')).toContain('isMediaRole(currentRole)');
  });
});
