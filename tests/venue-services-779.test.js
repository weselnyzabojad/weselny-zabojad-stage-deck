import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #779 Venue service anchors and Jalons removal', () => {
  it('removes the Jalons editor from Venue Manager', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).not.toContain('MilestoneCard');
    expect(venue).not.toContain('editableMilestones');
    expect(venue).not.toContain("addMilestone('OTHER')");
    expect(venue).not.toContain("t('venueManager.milestones')");
  });

  it('keeps the service editor and preserves blank drafts', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain("t('venueManager.addCourse')");
    expect(venue).toContain('const drafts = (current.kitchenServices ?? []).filter((course) => !course.time);');
    expect(venue).toContain('isHardAnchor: true');
  });

  it('writes every kitchen service as a hard anchor', () => {
    const mandatory = read('src/lib/mandatorySteps.js');
    expect(mandatory).toContain("step.type = 'HARD_ANCHOR';");
    const start = mandatory.indexOf('} else if (course.time) {');
    const newCourse = mandatory.slice(start, mandatory.indexOf('}', start + 20));
    expect(newCourse).toContain("type: 'HARD_ANCHOR'");
  });

  it('removes the retired milestone i18n keys', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).not.toContain("'venueManager.milestones'");
      expect(dict).not.toContain("'venueManager.addMilestone'");
      expect(dict).not.toContain("'venueManager.kind.OTHER'");
    }
  });
});
