import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #720 Venue Manager media-leave editors removal', () => {
  it('does not expose photo or camera milestone editing in Venue Manager', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('editableMilestones');
    expect(venue).toContain("milestone.kind !== 'PHOTO'");
    expect(venue).toContain("milestone.kind !== 'CAMERA'");
    expect(venue).not.toContain("addMilestone('PHOTO')");
    expect(venue).not.toContain("addMilestone('CAMERA')");
    expect(venue).not.toContain('addPhotoMilestone');
    expect(venue).not.toContain('addCameraMilestone');
  });

  it('keeps other milestone kinds editable', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('MilestoneCard');
    expect(venue).toContain("addMilestone('OTHER')");
  });
});
