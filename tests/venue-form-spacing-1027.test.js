import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1027 Venue mandatory-step form spacing', () => {
  it('spaces labels and inputs and softens the field borders', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted');
    expect(venue).toContain('border-line/70 bg-card px-2.5 py-2');
    expect(venue).toContain('focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/20');
  });

  it('gives course, cake and closure cards more internal whitespace', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    const cards = venue.match(/flex min-w-0 flex-col gap-3 rounded-xl border border-line\/70 bg-page\/60 p-4/g) ?? [];
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(venue).toContain('rounded-xl border border-line bg-card p-4 shadow-lg sm:p-5');
    expect(venue).toContain('grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3');
  });

  it('keeps validation, cascade and persistence behavior unchanged', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('cascadeFlexibleSteps');
    expect(venue).toContain('rescheduleBlocked');
    expect(venue).toContain('saveSteps');
    expect(venue).toContain('onUpdateMandatory');
  });
});
