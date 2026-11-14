import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FirstDanceCueCard from '../../src/components/FirstDanceCueCard.jsx';
import {
  formatFirstDanceSeconds,
  resolveFirstDance,
} from '../../src/lib/firstDance.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const danceStep = (overrides = {}) => ({
  id: 'step_08',
  firstDanceMode: 'NORMAL',
  firstDanceStartAt: '00:12',
  firstDanceStopAt: '04:30',
  ...overrides,
});

describe('issue #305 First Dance modes and timing', () => {
  it('validates both modes and timing fields in the schema', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    const step = schema.$defs.step.properties;
    expect(step.firstDanceMode.enum).toEqual(['FAKE', 'NORMAL']);
    expect(step.firstDanceStartAt.$ref).toContain(
      'first-dance.json#/items/properties/firstDanceStartAt',
    );
    expect(step.firstDanceStopAt.$ref).toContain(
      'first-dance.json#/items/properties/firstDanceStopAt',
    );
  });

  it('resolves normal and fake modes', () => {
    expect(resolveFirstDance(danceStep()).mode).toBe('NORMAL');
    expect(resolveFirstDance(danceStep({ firstDanceMode: 'FAKE' })).meta.mcExplanation).toContain(
      'come around the dancefloor',
    );
  });

  it('formats start/stop timing', () => {
    expect(formatFirstDanceSeconds(12)).toBe('0:12');
    expect(formatFirstDanceSeconds(270)).toBe('4:30');
    expect(formatFirstDanceSeconds(-1)).toBeNull();
  });

  it('gives MC the guest explanation without DJ timing', () => {
    const html = renderToStaticMarkup(
      createElement(FirstDanceCueCard, { step: danceStep(), audience: 'mc' }),
    );
    expect(html).toContain('Normal first dance');
    expect(html).toContain('Standard first dance');
    expect(html).not.toContain('Start:');
    expect(html).not.toContain('Stop after:');
  });

  it('gives DJ VIP the exact start/stop timing', () => {
    const html = renderToStaticMarkup(
      createElement(FirstDanceCueCard, { step: danceStep(), audience: 'dj-vip' }),
    );
    expect(html).toContain('Start: 0:12');
    expect(html).toContain('Stop after: 4:30');
  });

  it('never exposes timing to other audiences', () => {
    for (const audience of ['photographer', 'speaker', 'venue']) {
      expect(
        renderToStaticMarkup(createElement(FirstDanceCueCard, {
          step: danceStep(),
          audience,
        })),
      ).toBe('');
    }
  });

  it('fails safely when mode or timing is missing', () => {
    expect(resolveFirstDance({}).mode).toBeNull();
    expect(
      renderToStaticMarkup(createElement(FirstDanceCueCard, { step: {}, audience: 'mc' })),
    ).toBe('');
    expect(
      renderToStaticMarkup(createElement(FirstDanceCueCard, {
        step: { firstDanceMode: 'NORMAL' },
        audience: 'dj-vip',
      })),
    ).toContain('Start: —');
  });

  it('carries the mode and timing in the cartridge and Google Doc', () => {
    const step = DEMO_WEDDING.steps.find((entry) => entry.id === 'step_08');
    expect(step).toMatchObject({
      firstDanceMode: 'NORMAL',
      firstDanceStartAt: '00:12',
      firstDanceStopAt: '04:30',
    });
    expect(read('schema/google-doc-template.md')).toContain(
      'Mode NORMAL; start at 12s; stop after 4m 30s.',
    );
  });

  it('wires MC and DJ VIP views', () => {
    expect(read('src/views/McMasterView.jsx')).toContain('audience="mc"');
    expect(read('src/components/DjBoothView.jsx')).toContain('audience="dj-vip"');
  });
});
