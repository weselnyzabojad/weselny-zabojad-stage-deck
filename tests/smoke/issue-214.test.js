import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #214 full-width MC Speeches card', () => {
  const mc = read('src/views/McMasterView.jsx');

  it('renders Speeches directly in the full-width content column', () => {
    expect(mc).toContain('<SpeechesCard');
    expect(mc).not.toContain('aria-label="Stage details"');
    expect(mc).not.toContain('md:grid-cols-2 xl:grid-cols-3');
  });

  it('keeps the empty-speeches guard', () => {
    expect(mc).toContain('{speeches?.length > 0 ? (');
  });
});
