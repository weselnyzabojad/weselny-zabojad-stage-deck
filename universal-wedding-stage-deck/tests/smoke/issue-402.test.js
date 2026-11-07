import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
describe('issue #402 centered mini-session hour control', () => {
  it('centers the override form', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('mx-auto mt-2 flex max-w-xl flex-wrap items-center justify-center');
    expect(photo).toContain('Chosen mini-session hour');
  });
});
