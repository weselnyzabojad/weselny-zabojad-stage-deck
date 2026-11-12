import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #722 Venue Manager hard-anchor tick removal', () => {
  it('removes the hard-anchor checkbox from course and milestone cards', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).not.toContain('onHardAnchor');
    expect(venue).not.toContain('venueManager.isHardAnchor');
    expect(venue).not.toContain('checked={course.isHardAnchor');
    expect(venue).not.toContain('checked={milestone.isHardAnchor');
  });

  it('keeps the hard-anchor data helpers outside the UI', () => {
    const mandatory = read('src/lib/mandatorySteps.js');
    expect(mandatory).toContain('isHardAnchor');
  });
});
