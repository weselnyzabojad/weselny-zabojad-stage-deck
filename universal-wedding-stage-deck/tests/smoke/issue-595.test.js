import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import weddingSchema from '../../schema/wedding-schema-v1.1.json';
import { deriveHardAnchors } from '../../src/lib/hardAnchors.js';
import { SECTION_MANIFEST } from '../../src/lib/googleDocTemplate.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #595 derived hard anchors', () => {
  it('declares milestones and isHardAnchor on mandatory steps', () => {
    const required = weddingSchema.properties.mandatorySteps.properties;
    expect(required.milestones.items.$ref).toBe('#/$defs/mandatoryMilestone');
    expect(required.kitchenServices.items.properties.isHardAnchor.type).toBe('boolean');
    expect(weddingSchema.$defs.mandatoryMilestone.properties.kind.enum).toContain('CAMERA');
  });

  it('derives only flagged milestones and kitchen courses', () => {
    const anchors = deriveHardAnchors({
      milestones: [
        { id: 'photo_leave', time: '20:30', label: 'Photo', kind: 'PHOTO', isHardAnchor: true },
        { id: 'camera_leave', time: '20:30', label: 'Camera', kind: 'CAMERA', isHardAnchor: true },
        { id: 'optional', time: '21:00', label: 'Optional', isHardAnchor: false },
      ],
      kitchenServices: [
        { id: 'dinner', name: 'Dinner', time: '18:30', isHardAnchor: true },
        { id: 'supper', time: '22:00', isHardAnchor: false },
      ],
    });
    expect(anchors.map((anchor) => anchor.id)).toEqual([
      'photo_leave',
      'camera_leave',
      'kitchen_dinner',
    ]);
    expect(anchors[2]).toMatchObject({ label: 'Dinner', kind: 'VENDOR' });
  });

  it('keeps photo and camera separate and drops the Oczepiny anchor in the demo', () => {
    const ids = DEMO_WEDDING.mandatorySteps.milestones.map((milestone) => milestone.id);
    expect(ids).toEqual(expect.arrayContaining(['photo_leave', 'camera_leave']));
    expect(ids.join(' ')).not.toMatch(/ocsepiny|oczepiny/i);
    expect(DEMO_WEDDING.hardAnchors.map((anchor) => anchor.kind)).toEqual(['PHOTO', 'CAMERA']);
  });

  it('removes HARD ANCHORS from the template and manifest', () => {
    expect(SECTION_MANIFEST.some((section) => section.marker === 'HARD ANCHORS')).toBe(false);
    expect(read('schema/google-doc-template.md')).not.toContain('## HARD ANCHORS');
    expect(read('scripts/validate-google-doc-template.mjs')).not.toContain("'HARD ANCHORS'");
  });

  it('moves the real fixture to milestones', () => {
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    expect(fixture).not.toHaveProperty('hardAnchors');
    expect(fixture.mandatorySteps.milestones).toHaveLength(2);
  });
});
