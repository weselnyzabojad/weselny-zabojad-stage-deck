import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #429 BottomNav i18n and literal-lint proposal', () => {
  it('renders role labels through t()', () => {
    const nav = read('src/components/BottomNav.jsx');
    expect(nav).toContain('useI18n');
    expect(nav).toContain("t('role.' + role + '.short')");
    expect(nav).toContain("t('role.' + role + '.label')");
  });

  it('carries no hardcoded step-action labels', () => {
    const nav = read('src/components/BottomNav.jsx');
    expect(nav).not.toContain('Undo');
    expect(nav).not.toContain('EVENT COMPLETE');
    expect(nav).not.toContain('HOLD TO ADVANCE');
  });

  it('documents the literal-lint rule, scope and CI hook', () => {
    const doc = read('docs/i18n-literal-lint.md');
    expect(doc).toContain('## Rule');
    expect(doc).toContain('## Scope');
    expect(doc).toContain('## CI hook');
    expect(doc).toContain('validate:literals');
    expect(doc).toContain('validate:i18n');
  });
});
