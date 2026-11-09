import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveHardAnchors } from '../../src/lib/hardAnchors.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #596 admin mandatory milestones', () => {
  it('adds photo, camera and generic milestone controls', () => {
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).toContain('MilestoneCard');
    expect(view).toContain("addMilestone('PHOTO')");
    expect(view).toContain("addMilestone('CAMERA')");
    expect(view).toContain("addMilestone('OTHER')");
    expect(view).toContain('isHardAnchor');
    expect(view).toContain('onHardAnchor');
  });

  it('localizes the milestone editor', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const source = read(`src/i18n/${locale}.js`);
      for (const key of [
        'venueManager.milestones',
        'venueManager.addPhotoMilestone',
        'venueManager.addCameraMilestone',
        'venueManager.kind.PHOTO',
        'venueManager.kind.CAMERA',
        'venueManager.isHardAnchor',
      ]) {
        expect(source, `${locale}:${key}`).toContain(key);
      }
    }
  });

  it('derives anchors from the admin milestone shape', () => {
    const anchors = deriveHardAnchors({
      milestones: [
        { id: 'photo_1', time: '20:30', label: 'Photo', kind: 'PHOTO', isHardAnchor: true },
        { id: 'camera_1', time: '20:30', label: 'Camera', kind: 'CAMERA', isHardAnchor: true },
      ],
      kitchenServices: [{ id: 'dinner', name: 'Dinner', time: '18:30', isHardAnchor: true }],
    });
    expect(anchors.map((anchor) => anchor.id)).toEqual(['photo_1', 'camera_1', 'kitchen_dinner']);
  });
});
