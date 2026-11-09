import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { djCapabilities } from '../../src/lib/djCapabilities.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #616 DJ Standard DJ set timeline step', () => {
  it('maps a stable DJ set step from the Google Doc', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const step = result.cartridge.steps.find((entry) => entry.id === 'step_12');
    expect(step).toMatchObject({
      title: 'DJ Set',
      type: 'FLEXIBLE',
      optionalFlag: 'dj_set',
    });
    expect(result.errors).toEqual([]);
  });

  it('always includes the DJ set step in the active timeline', () => {
    expect(filterEnabledSteps({ steps: [{ id: 's', optionalFlag: 'dj_set' }] })).toHaveLength(1);
  });

  it('keeps the countdown VIP-only', () => {
    expect(djCapabilities('standard').vip).toBe(false);
    const source = read('src/components/DjBoothView.jsx');
    expect(source).toContain('caps.vip && isDjSet && nextEntry');
  });
});
