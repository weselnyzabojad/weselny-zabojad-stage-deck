import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #189 right-hand two-row top-bar stack', () => {
  const mc = read('src/views/McMasterView.jsx');
  const header = mc.slice(
    mc.indexOf('{/* ================= TOP BAR'),
    mc.indexOf('</header>'),
  );

  it('puts cultural chips above the utility row', () => {
    const cultural = header.indexOf('<CulturalRulesBar');
    const open = header.indexOf('<OpenOnPhoneButton');
    const language = header.indexOf('<LanguageToggle');
    const theme = header.indexOf('<ThemeToggle');

    expect(cultural).toBeGreaterThan(-1);
    expect(cultural).toBeLessThan(open);
    expect(cultural).toBeLessThan(language);
    expect(cultural).toBeLessThan(theme);
    expect(header).toContain('flex-col');
    expect(header).toContain('xl:items-end');
  });

  it('keeps the right stack aligned to the right on desktop', () => {
    expect(header).toContain('xl:justify-end');
    expect(header).toContain('w-full min-w-0 flex-col');
  });

  it('keeps per-role utility visibility', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const photo = read('src/components/PhotographerView.jsx');
    const speaker = read('src/components/SpeakerView.jsx');

    expect(dj).toContain('<OpenOnPhoneButton role={role} tier={tierLabel}');
    expect(dj).not.toContain('<CulturalRulesBar');
    expect(photo).toContain('<OpenOnPhoneButton role={role}');
    expect(photo).not.toContain('<CulturalRulesBar');
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
