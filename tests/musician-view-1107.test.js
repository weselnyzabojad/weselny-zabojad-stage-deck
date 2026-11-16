import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1107 standalone musician view', () => {
  const view = read('src/components/MusicianView.jsx');

  it('is documented as an intentional Photographer-layout fork', () => {
    expect(view).toContain('intentional fork');
    expect(view).toContain('PhotographerView');
    expect(view).toContain('must not be copied here automatically');
  });

  it('keeps the shared timeline and wide/compact shells', () => {
    expect(view).toContain('<TimelineFocusStack');
    expect(view).toContain('<RoleShell');
    expect(view).toContain('<TopBarShell');
    expect(view).toContain('<SecondaryControlBar');
  });

  it('shows a personal end hour and the shared end-hours card', () => {
    expect(view).toContain('data-testid="musician-availability"');
    expect(view).toContain("t('musician.endHour')");
    expect(view).toContain("t('musician.until'");
    expect(view).toContain('<EndHoursCard');
    expect(view).toContain('instrumentLabel(musician.instrument, locale)');
  });

  it('contains no photographer-only blocks', () => {
    for (const forbidden of [
      'GroupPhotoChecklist',
      'MiniSessionTwinTask',
      'mapPhotoPlanToSteps',
      'resolveSunset',
      'lightWindows',
      'photoPlan',
      'photographerCue',
    ]) {
      expect(view).not.toContain(forbidden);
    }
  });

  it('localizes all new copy', () => {
    for (const [file, key] of [
      ['src/i18n/en.js', 'musician.endHour'],
      ['src/i18n/fr.js', 'musician.endHour'],
      ['src/i18n/pl.js', 'musician.endHour'],
      ['src/i18n/en.js', 'musician.until'],
      ['src/i18n/fr.js', 'musician.until'],
      ['src/i18n/pl.js', 'musician.until'],
    ]) {
      expect(read(file)).toContain(`'${key}'`);
    }
  });
});
