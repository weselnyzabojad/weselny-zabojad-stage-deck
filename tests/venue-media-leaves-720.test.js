import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #720 Venue Manager media-leave editors removal', () => {
  it('no longer exposes any milestone editor in Venue Manager', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).not.toContain('editableMilestones');
    expect(venue).not.toContain('MilestoneCard');
    expect(venue).not.toContain("addMilestone('PHOTO')");
    expect(venue).not.toContain("addMilestone('CAMERA')");
  });

  it('keeps the kitchen service editor', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('CourseCard');
    expect(venue).toContain("t('venueManager.addCourse')");
  });
});
