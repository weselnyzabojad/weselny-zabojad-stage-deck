import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../../src/components/CulturalRulesBar.jsx';
import SpeechesChip from '../../src/components/SpeechesChip.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const html = renderToStaticMarkup(
  createElement(
    CulturalRulesBar,
    {
      compact: true,
      rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } },
      oczepinyStatus: { state: 'OFF' },
    },
    createElement(SpeechesChip, { compact: true, mode: 'OFF', speeches: [] }),
  ),
);

describe('issue #333 mobile status pills', () => {
  it('uses a single wrapping row of compact pills', () => {
    expect(read('src/components/CulturalRulesBar.jsx')).not.toContain('grid grid-cols-2');
    expect(html).toContain('flex flex-wrap items-center justify-center gap-1.5');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Gorzko');
    expect(html).toContain('Oczepiny');
    expect(html).toContain('Speeches');
  });

  it('renders all four pills inside the shared grid', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('<CulturalRulesBar');
    expect(shell).toContain('<SpeechesChip');
    expect(shell.indexOf('<SpeechesChip')).toBeGreaterThan(shell.indexOf('<CulturalRulesBar'));
  });

  it('keeps the full accessible status label', () => {
    expect(html).toContain('Sto Lat: YES');
    expect(html).toContain('Gorzko: STRICT NO');
  });

  it('does not force the rules grid when only speeches are present', () => {
    const speechOnly = renderToStaticMarkup(
      createElement(
        CulturalRulesBar,
        { compact: true, rules: {}, showRules: false },
        createElement(SpeechesChip, { compact: true, mode: 'OFF', speeches: [] }),
      ),
    );
    expect(speechOnly).not.toContain('Sto Lat');
    expect(speechOnly).toContain('Speeches');
  });
});
