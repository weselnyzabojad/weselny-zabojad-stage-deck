import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #778 Song Request pocket language switcher', () => {
  it('uses the pocket cycle variant on the guest page', () => {
    const app = read('src/components/SongRequestApp.jsx');
    expect(app).toContain('<LanguageToggle variant="cycle" />');
    expect(app).not.toContain('<LanguageToggle />');
  });

  it('keeps the cycle control accessible and touch-sized', () => {
    const toggle = read('src/components/LanguageToggle.jsx');
    expect(toggle).toContain("if (variant === 'cycle')");
    expect(toggle).toContain('min-h-11 min-w-11');
    expect(toggle).toContain("aria-label={action}");
  });
});
