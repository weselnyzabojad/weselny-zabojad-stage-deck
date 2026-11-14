import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('hotfix: admin MFA challenge import', () => {
  it('imports challengeExistingFactor before calling it from AdminApp', () => {
    const source = read('src/admin/AdminApp.jsx');
    expect(source).toContain('challengeExistingFactor');
    expect(source).toMatch(
      /import\s*\{[\s\S]*challengeExistingFactor[\s\S]*\}\s*from\s*'\.\/adminApi'/,
    );
  });
});
