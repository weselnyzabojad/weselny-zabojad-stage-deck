import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #189 right-hand two-row top-bar stack', () => {
  const mc = read('src/views/McMasterView.jsx');
  const header = mc;

  it('puts cultural chips and utilities in the shared right zone', () => {
    const cultural = header.indexOf('<CulturalRulesBar');
    const open = header.indexOf('<OpenOnPhoneButton');
    const language = header.indexOf('<LanguageToggle');
    const theme = header.indexOf('<ThemeToggle');

    expect(cultural).toBeGreaterThan(-1);
    expect(cultural).toBeLessThan(open);
    expect(cultural).toBeLessThan(language);
    expect(cultural).toBeLessThan(theme);
    expect(header).toContain('<TopBarShell');
  });

  it('keeps the right stack aligned to the right on desktop', () => {
    expect(read('src/components/TopBarShell.jsx')).toContain('lg:justify-end');
  });

  it('keeps per-role utility visibility', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const photo = read('src/components/PhotographerView.jsx');
    const speaker = read('src/components/SpeakerView.jsx');

    expect(dj).toContain('<OpenOnPhoneButton role={role} tier={tierLabel}');
    expect(dj).toContain('<CulturalRulesBar');
    expect(photo).toContain('<OpenOnPhoneButton role={role}');
    expect(photo).toContain('<CulturalRulesBar');
    expect(speaker).toContain('<OpenOnPhoneButton role="speaker"');
    expect(speaker).not.toContain('<CulturalRulesBar');
  });

  it('keeps the pocket header free of Open on phone', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).not.toContain('<OpenOnPhoneButton');
    expect(shell).toContain('<CulturalRulesBar');
    expect(shell).toContain('compact');
  });
});
