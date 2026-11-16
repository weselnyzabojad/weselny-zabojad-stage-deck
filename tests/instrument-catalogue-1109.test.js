import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTS,
  instrumentChoice,
  instrumentLabel,
} from '../src/lib/instruments.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1109 instrument catalogue', () => {
  it('ships a short curated EN/FR/PL catalogue', () => {
    expect(INSTRUMENTS.length).toBeGreaterThanOrEqual(12);
    expect(INSTRUMENTS.map((entry) => entry.key)).toEqual(
      expect.arrayContaining(['violin', 'viola', 'cello', 'saxophone', 'piano', 'harp', 'other']),
    );
    expect(instrumentLabel('violin', 'en')).toBe('Violin');
    expect(instrumentLabel('violin', 'fr')).toBe('Violon');
    expect(instrumentLabel('violin', 'pl')).toBe('Skrzypce');
    expect(instrumentLabel('piano', 'pl')).toBe('Fortepian');
  });

  it('falls back to legacy free text and maps unknown values to Other', () => {
    expect(instrumentLabel('hardingfele', 'en')).toBe('hardingfele');
    expect(instrumentLabel('', 'en')).toBe('');
    expect(instrumentChoice('piano')).toBe('piano');
    expect(instrumentChoice(' Hardingfele ')).toBe('other');
    expect(instrumentChoice('')).toBe('other');
  });

  it('uses a closed admin select plus an Other text field', () => {
    const admin = read('src/admin/AdminMusicians.jsx');
    expect(admin).toContain('instrumentChoice');
    expect(admin).toContain('instrumentLabel');
    expect(admin).toContain('<select');
    expect(admin).toContain("instrumentChoice(form.instrument) === 'other'");
    expect(admin).not.toContain('musician-instruments');
  });

  it('localizes the musician and end-hour surfaces', () => {
    const view = read('src/components/MusicianView.jsx');
    const endHours = read('src/components/EndHoursCard.jsx');
    expect(view).toContain('instrumentLabel(musician.instrument, locale)');
    expect(endHours).toContain('instrumentLabel(row.instrument, locale)');
  });

  it('does not call an external API at runtime', () => {
    const module = read('src/lib/instruments.js');
    expect(module).not.toContain('fetch(');
    expect(module).toContain('MusicBrainz');
  });
});
