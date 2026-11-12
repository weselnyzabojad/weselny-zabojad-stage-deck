import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { deriveHardAnchors } from '../../src/lib/hardAnchors.js';
import {
  applyMandatorySettings,
  resolveMandatoryConstraints,
  settingsFromSteps,
} from '../../src/lib/mandatorySteps.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #622 mandatory data lives on timeline steps', () => {
  it('removes the top-level mandatorySteps block', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.mandatorySteps).toBeUndefined();
    expect(schema.$defs.mandatoryMilestone).toBeUndefined();
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty(
      'mandatorySteps',
    );
    expect(json('schema/fixtures/real-jennifer-guillaume.json')).not.toHaveProperty(
      'mandatorySteps',
    );
  });

  it('declares the mandatory object on timeline steps', () => {
    const steps = json('schema/domains/steps.json');
    expect(steps.$defs.step.properties.mandatory).toEqual({
      $ref: '#/$defs/mandatory',
    });
    expect(steps.$defs.mandatory.properties.kind.enum).toEqual([
      'FIRST_GUESTS_ARRIVAL',
      'KITCHEN_SERVICE',
      'CAKE_SERVICE',
      'CLOSURE',
      'MILESTONE',
    ]);
    expect(steps.$defs.step.properties.durationMin.minimum).toBe(0);
  });

  it('migrates a legacy mandatorySteps block on the client and server', async () => {
    const legacy = {
      ...json('schema/wedding-cartridge.example.json'),
      steps: [
        {
          id: 'step_01',
          time: '16:30',
          durationMin: 30,
          title: 'Cocktail',
          type: 'FLEXIBLE',
          location: 'Garden',
        },
      ],
      mandatorySteps: {
        firstGuestsArrival: '15:30',
        cakeServiceMode: 'CUT_IN_PLACE',
        closureTime: '02:00',
        closureExtensionAllowed: true,
        closureExtensionUntil: '03:00',
        lastSong: 'Perfect',
        kitchenServices: [
          { id: 'dinner', name: 'Dinner', time: '18:30', serviceMode: 'TABLE_SERVICE' },
        ],
        milestones: [
          {
            id: 'vendor_leave',
            time: '20:30',
            label: 'Vendor leaves',
            kind: 'VENDOR',
            alertBeforeMin: 45,
            isHardAnchor: true,
          },
        ],
      },
    };

    for (const clean of [sanitizeCartridge(legacy), sanitizeServerCartridge(legacy)]) {
      expect(clean).not.toHaveProperty('mandatorySteps');
      expect(clean.steps.find((step) => step.mandatory?.kind === 'FIRST_GUESTS_ARRIVAL')).toBeTruthy();
      expect(clean.steps.find((step) => step.mandatory?.kind === 'KITCHEN_SERVICE')).toBeTruthy();
      expect(clean.steps.find((step) => step.mandatory?.kind === 'CLOSURE')).toBeTruthy();
      expect(clean.steps.find((step) => step.mandatory?.kind === 'MILESTONE')).toBeTruthy();
      expect(await validateCartridge(clean)).toEqual([]);
    }
  });

  it('derives hard anchors from HARD_ANCHOR steps', () => {
    const anchors = deriveHardAnchors([
      {
        id: 'vendor_leave',
        time: '20:30',
        title: 'Vendor leaves',
        type: 'HARD_ANCHOR',
        mandatory: { kind: 'MILESTONE', label: 'Vendor leaves', milestoneKind: 'VENDOR' },
      },
      { id: 'flex', time: '21:00', title: 'Flex', type: 'FLEXIBLE' },
    ]);
    expect(anchors).toEqual([
      {
        id: 'vendor_leave',
        time: '20:30',
        label: 'Vendor leaves',
        kind: 'VENDOR',
      },
    ]);
  });

  it('round-trips the Venue Manager editor through step metadata', () => {
    const settings = {
      firstGuestsArrival: '15:30',
      kitchenServices: [
        { id: 'dinner', name: 'Dinner', time: '18:30', serviceMode: 'TABLE_SERVICE', isHardAnchor: true },
      ],
      milestones: [
        { id: 'vendor_leave', label: 'Vendor', time: '20:30', kind: 'VENDOR', alertBeforeMin: 45, isHardAnchor: true },
      ],
      cakeServiceMode: 'CUT_IN_PLACE',
      closureTime: '02:00',
      closureExtensionAllowed: true,
      closureExtensionUntil: '03:00',
      lastSong: 'Perfect',
    };
    const steps = applyMandatorySettings(
      {
        steps: [
          {
            id: 'cake',
            time: '20:30',
            durationMin: 30,
            title: 'Wedding cake',
            type: 'HARD_ANCHOR',
            location: 'Terrace',
          },
        ],
      },
      settings,
    );
    expect(steps).not.toHaveProperty('mandatorySteps');
    expect(settingsFromSteps(steps)).toMatchObject({
      firstGuestsArrival: '15:30',
      cakeServiceMode: 'CUT_IN_PLACE',
      closureTime: '02:00',
      closureExtensionAllowed: true,
      lastSong: 'Perfect',
    });
    const constraints = resolveMandatoryConstraints({ steps });
    expect(constraints.prestationReady).toBe('14:30');
    expect(constraints.kitchenServices[0].key).toBe('dinner');
  });

  it('maps the Google Doc mandatory section into steps', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge).not.toHaveProperty('mandatorySteps');
    const kinds = result.cartridge.steps
      .map((step) => step.mandatory?.kind)
      .filter(Boolean);
    expect(kinds).toEqual(
      expect.arrayContaining([
        'FIRST_GUESTS_ARRIVAL',
        'KITCHEN_SERVICE',
        'CAKE_SERVICE',
        'CLOSURE',
      ]),
    );
  });
});
