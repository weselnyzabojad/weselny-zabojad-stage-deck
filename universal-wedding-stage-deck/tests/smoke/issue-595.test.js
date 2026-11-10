import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import stepsSchema from '../../schema/domains/steps.json';
import { deriveHardAnchors } from '../../src/lib/hardAnchors.js';
import { SECTION_MANIFEST } from '../../src/lib/googleDocTemplate.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const anchorStep = (id, time, label, milestoneKind) => ({
  id,
  time,
  durationMin: 1,
  title: label,
  type: 'HARD_ANCHOR',
  location: '',
  mandatory: { kind: 'MILESTONE', label, milestoneKind, alertBeforeMin: 45 },
});

describe('issue #595 derived hard anchors', () => {
  it('declares milestone metadata on steps', () => {
    const mandatory = stepsSchema.$defs.mandatory;
    expect(mandatory.properties.kind.enum).toContain('MILESTONE');
    expect(mandatory.properties.milestoneKind.enum).toContain('CAMERA');
    expect(stepsSchema.$defs.step.properties.mandatory).toBeTruthy();
  });

  it('derives anchors from HARD_ANCHOR steps', () => {
    const anchors = deriveHardAnchors([
      anchorStep('photo_leave', '20:30', 'Photo', 'PHOTO'),
      anchorStep('camera_leave', '20:30', 'Camera', 'CAMERA'),
      { id: 'optional', time: '21:00', title: 'Optional', type: 'FLEXIBLE', location: '' },
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
    expect(anchors.map((anchor) => anchor.id)).toEqual([
      'photo_leave',
      'camera_leave',
      'dinner',
    ]);
    expect(anchors[2]).toMatchObject({ label: 'Dinner', kind: 'VENDOR' });
  });

  it('keeps photo and camera separate and drops the Oczepiny anchor in the demo', () => {
    const ids = DEMO_WEDDING.hardAnchors.map((anchor) => anchor.id);
    expect(ids).toEqual(expect.arrayContaining(['photo_leave', 'camera_leave']));
    expect(ids.join(' ')).not.toMatch(/ocsepiny|oczepiny/i);
    const kinds = DEMO_WEDDING.hardAnchors.map((anchor) => anchor.kind);
    expect(kinds).toContain('PHOTO');
    expect(kinds).toContain('CAMERA');
  });

  it('removes HARD ANCHORS from the template and manifest', () => {
    expect(SECTION_MANIFEST.some((section) => section.marker === 'HARD ANCHORS')).toBe(false);
    expect(read('schema/google-doc-template.md')).not.toContain('## HARD ANCHORS');
    expect(read('scripts/validate-google-doc-template.mjs')).not.toContain("'HARD ANCHORS'");
  });

  it('keeps the real fixture on embedded milestones and derived anchors', () => {
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    expect(fixture).not.toHaveProperty('mandatorySteps');
    const milestones = fixture.steps.filter(
      (step) => step.mandatory?.kind === 'MILESTONE',
    );
    expect(milestones).toHaveLength(2);
    expect(fixture.hardAnchors.map((anchor) => anchor.id)).toEqual(
      expect.arrayContaining(['photo_leave', 'camera_leave']),
    );
  });
});
