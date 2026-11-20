import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const css = read('src/index.css');

describe('issue #697 French-flag light-mode background', () => {
  it('defines the French flag palette on the day theme', () => {
    expect(css).toContain('--flag-blue: #0055a4;');
    expect(css).toContain('--flag-white: #ffffff;');
    expect(css).toContain('--flag-red: #ef4135;');
  });

  it('applies a discreet tricolour wash to the light-mode body', () => {
    expect(css).toContain('[data-theme="day"] body');
    expect(css).toContain('rgb(0 85 164 / 0.07)');
    expect(css).toContain('rgb(239 65 53 / 0.07)');
    expect(css).toContain('background-attachment: fixed;');
  });
});
