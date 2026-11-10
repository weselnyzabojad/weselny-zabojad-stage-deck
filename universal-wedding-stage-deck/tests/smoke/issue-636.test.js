import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectSemanticErrors } from '../../src/lib/cartridgeValidation.js';
import { resolvePhotoPlan } from '../../src/lib/photoPlan.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #636 per-effect venue approvals', () => {
  it('replaces the generic fields with approval booleans', () => {
    const domain = json('schema/domains/special-effects.json');
    const effects = domain.properties.specialEffects.properties;
    expect(effects.permitRequired).toBeUndefined();
    expect(effects.venueApproved).toBeUndefined();
    expect(effects.safetyBriefing).toBeUndefined();
    expect(effects.approvals.properties).toMatchObject({
      sparklers: { type: 'boolean' },
      fire: { type: 'boolean' },
      heavySmoke: { type: 'boolean' },
      other: { type: 'boolean' },
    });
    expect(
      json('schema/domains/special-effects.example.json').specialEffects.approvals,
    ).toEqual({ sparklers: true, fire: false, heavySmoke: true, other: true });
  });

  it('resolves approvals and removes the old fields', () => {
    const plan = resolvePhotoPlan(json('schema/fixtures/real-jennifer-guillaume.json'));
    expect(plan.specialEffects.approvals).toEqual({
      sparklers: true,
      fire: false,
      heavySmoke: true,
      other: true,
    });
    expect(plan.specialEffects).not.toHaveProperty('permitRequired');
    expect(plan.specialEffects).not.toHaveProperty('venueApproved');
    expect(plan.specialEffects).not.toHaveProperty('safetyBriefing');
  });

  it('requires venue approval for fire', () => {
    const base = { photoPlan: { specialEffects: { fire: true } } };
    expect(
      collectSemanticErrors(base).some((error) =>
        error.message.includes('fire effects require venue approval'),
      ),
    ).toBe(true);
    expect(
      collectSemanticErrors({
        photoPlan: { specialEffects: { fire: true, approvals: { fire: true } } },
      }),
    ).toEqual([]);
  });

  it('maps per-effect approvals from the Google Doc', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.photoPlan.specialEffects.approvals).toEqual({
      sparklers: true,
      fire: false,
      heavySmoke: true,
      other: true,
    });
  });
});
