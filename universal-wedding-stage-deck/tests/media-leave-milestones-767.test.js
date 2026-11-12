import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../src/demo/demoWedding.js';
import { filterEnabledSteps } from '../src/lib/predefinedSteps.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

const milestone = (id, kind, title) => ({
  id,
  time: '20:30',
  durationMin: 1,
  title,
  type: 'HARD_ANCHOR',
  location: '',
  mandatory: { kind: 'MILESTONE', label: title, milestoneKind: kind, alertBeforeMin: 45 },
});

describe('issue #767 remove media leave milestones from the timeline', () => {
  it('filters legacy PHOTO and CAMERA milestones but keeps other milestones', () => {
    const steps = [
      milestone('photo_leave', 'PHOTO', 'Photographer leaves'),
      milestone('camera_leave', 'CAMERA', 'Cameraman leaves'),
      milestone('vendor_leave', 'VENDOR', 'Vendor leaves'),
      milestone('sunset_anchor', 'SUNSET', 'Sunset'),
      { id: 'dinner', time: '18:30', title: 'Dinner', type: 'HARD_ANCHOR' },
    ];

    expect(filterEnabledSteps({ steps }).map((step) => step.id)).toEqual([
      'vendor_leave',
      'sunset_anchor',
      'dinner',
    ]);
  });

  it('removes the media leave steps from the demo and keeps media team times', () => {
    const titles = DEMO_WEDDING.steps.map((step) => step.title);
    expect(titles).not.toContain('Photographer leaves');
    expect(titles).not.toContain('Cameraman leaves');
    expect(DEMO_WEDDING.mediaTeam.map((member) => member.endTime)).toEqual(
      expect.arrayContaining(['21:30', '00:30']),
    );
  });

  it('cleans the schema example and real fixture', () => {
    for (const path of [
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const cartridge = json(path);
      const ids = cartridge.steps.map((step) => step.id);
      expect(ids).not.toContain('photo_leave');
      expect(ids).not.toContain('camera_leave');
      expect(
        cartridge.steps.filter(
          (step) =>
            step.mandatory?.kind === 'MILESTONE' &&
            ['PHOTO', 'CAMERA'].includes(step.mandatory.milestoneKind),
        ),
      ).toHaveLength(0);
      const anchorIds = cartridge.hardAnchors.map((anchor) => anchor.id);
      expect(anchorIds).not.toContain('photo_leave');
      expect(anchorIds).not.toContain('camera_leave');
    }
  });

  it('removes the dedicated admin editor without dead code', () => {
    expect(exists('src/admin/adminMediaLeaves.js')).toBe(false);
    expect(exists('tests/admin-media-leaves-721.test.js')).toBe(false);

    const app = read('src/admin/AdminApp.jsx');
    expect(app).not.toContain('AdminMediaLeaveDialog');
    expect(app).not.toContain('applyMediaLeaveTimes');
    expect(app).not.toContain('Edit media leaves');
    expect(app).not.toContain('mediaLeaveDialog');

    const dialogs = read('src/admin/AdminDialogs.jsx');
    expect(dialogs).not.toContain('AdminMediaLeaveDialog');
    expect(dialogs).not.toContain('readMediaLeaveTimes');
  });

  it('keeps the generic milestone editor for Venue Manager', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('MilestoneCard');
    expect(venue).toContain("addMilestone('OTHER')");
    expect(read('schema/domains/steps.json')).toContain('"MILESTONE"');
  });

  it('documents media departures as planning data', () => {
    const schemaReadme = read('schema/README.md');
    expect(schemaReadme).toContain('mediaTeam[].endTime');
    expect(schemaReadme).toContain('filters them out of every timeline');
    expect(schemaReadme).not.toContain('"id": "photo_leave"');
  });
});
