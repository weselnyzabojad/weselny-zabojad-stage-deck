import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveHardAnchors } from '../../src/lib/hardAnchors.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #596 venue mandatory milestones', () => {
  it('removes the generic milestone editor from Venue Manager', () => {
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).not.toContain('MilestoneCard');
    expect(view).not.toContain("addMilestone('OTHER')");
    expect(view).not.toContain('onHardAnchor');
    expect(view).not.toContain('checked={course.isHardAnchor');
  });

  it('derives anchors from step-scoped milestone data', () => {
    const anchor = (id, label, milestoneKind) => ({
      id,
      time: '20:30',
      durationMin: 1,
      title: label,
      type: 'HARD_ANCHOR',
      location: '',
      mandatory: { kind: 'MILESTONE', label, milestoneKind, alertBeforeMin: 45 },
    });
    const anchors = deriveHardAnchors([
      anchor('photo_1', 'Photo', 'PHOTO'),
      anchor('camera_1', 'Camera', 'CAMERA'),
      {
        id: 'dinner',
        time: '18:30',
        durationMin: 1,
        title: 'Dinner',
        type: 'HARD_ANCHOR',
        location: '',
        mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
      },
    ]);
    expect(anchors.map((anchor) => anchor.id)).toEqual(['photo_1', 'camera_1', 'dinner']);
  });
});
