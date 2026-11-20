import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VenuePolicyWarnings from '../src/components/VenuePolicyWarnings.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const warnings = [
  { type: 'redline', decibelLimit: 95, advice: { masterDb: -3 } },
  { type: 'dmx-lock', effect: 'smoke' },
  { type: 'dmx-lock', effect: 'sparks' },
];

describe('issue #1197 venue policy alerts', () => {
  it('renders the redline, advice and DMX labels', () => {
    const html = renderToStaticMarkup(createElement(VenuePolicyWarnings, { warnings }));
    expect(html).toContain('data-testid="venue-policy-warnings"');
    expect(html).toContain('Limiter active (95 dB)');
    expect(html).toContain('Lower the Master by -3 dB');
    expect(html).toContain('No smoke');
    expect(html).toContain('No sparks');
  });

  it('can render only DMX locks on the DJ current card', () => {
    const html = renderToStaticMarkup(
      createElement(VenuePolicyWarnings, { warnings, effectsOnly: true }),
    );
    expect(html).not.toContain('Limiter active');
    expect(html).toContain('No smoke');
  });

  it('uses the paper palette inside the DJ notepad', () => {
    const html = renderToStaticMarkup(
      createElement(VenuePolicyWarnings, { warnings, paper: true }),
    );
    expect(html).toContain('border-amber-700/70');
    expect(html).toContain('text-amber-950');
  });

  it('wires MC, DJ and the notepad to the shared warnings', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('useVenuePolicies');
    expect(mc).toContain('VenuePolicyWarnings');
    expect(mc).toContain('currentStep?.tags');

    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('useVenuePolicies');
    expect(dj).toContain('venuePolicies');
    expect(dj).toContain('effectsOnly');
    expect(dj).toContain('venueWarnings={venueGuard.warnings}');

    const notes = read('src/components/DjSetNotesNotepad.jsx');
    expect(notes).toContain('VenuePolicyWarnings');
    expect(notes).toContain('venueWarnings');
    expect(notes).toContain('paper');
  });

  it('keeps the alert copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'venuePolicy.redline',
        'venuePolicy.redlineAdvice',
        'venuePolicy.dmx.smoke',
        'venuePolicy.dmx.haze',
        'venuePolicy.dmx.sparks',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
