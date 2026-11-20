import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { djCapabilities } from '../../src/lib/djCapabilities.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #616 DJ Standard Musical Set timeline step', () => {
  it('maps a stable Musical Set step from the Google Doc', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const step = result.cartridge.steps.find((entry) => entry.id === 'step_12');
    expect(step).toMatchObject({
      title: 'Musical Set',
      type: 'FLEXIBLE',
      optionalFlag: 'dj_set',
    });
    expect(step).not.toHaveProperty('durationMin');
    expect(result.errors).toEqual([]);
  });

  it('always includes the Musical Set step in the active timeline', () => {
    expect(filterEnabledSteps({ steps: [{ id: 's', optionalFlag: 'dj_set' }] })).toHaveLength(1);
  });

  it('feeds the filtered timeline to every role that renders it', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('steps: filterEnabledSteps(wedding)');
    for (const view of ['DjBoothView', 'PhotographerView', 'VenueManagerView']) {
      expect(deck).toContain(`<${view}`);
    }
    expect(deck).toContain('timeline={timeline}');
    expect(deck).toContain('driftReport: displayedDriftReport');
  });

  it('keeps the countdown VIP-only', () => {
    expect(djCapabilities('standard').vip).toBe(false);
    const source = read('src/components/DjBoothView.jsx');
    expect(source).toContain('caps.vip && isDjSet && nextEntry');
  });
});
