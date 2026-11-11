import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../../src/components/CulturalRulesBar.jsx';
import DriftPill from '../../src/components/DriftPill.jsx';
import RoleShell from '../../src/components/RoleShell.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const rules = {
  sto_lat: { status: 'STRICT_NO' },
  gorzko: { status: 'STRICT_NO' },
};

describe('issue #191 pocket mini cultural chips and trimmed drift', () => {
  it('renders mini chips with labels and colours but no status text', () => {
    const html = renderToStaticMarkup(
      createElement(CulturalRulesBar, {
        rules,
        oczepinyStatus: { state: 'ACTIVE' },
        compact: true,
      }),
    );

    expect(html).toContain('Sto Lat');
    expect(html).toContain('Gorzko');
    expect(html).toContain('Oczepiny');
    expect(html).toContain('bg-red-500');
    expect(html).toContain('bg-emerald-400');
    expect(html).not.toContain('>STRICT NO<');
    expect(html).not.toContain('>ACTIVE<');
    expect(html).toContain('Sto Lat: STRICT NO');
    expect(html).toContain('Oczepiny: ACTIVE');
  });

  it('keeps desktop status text unchanged', () => {
    const html = renderToStaticMarkup(
      createElement(CulturalRulesBar, {
        rules,
        oczepinyStatus: { state: 'ACTIVE' },
      }),
    );
    expect(html).toContain('STRICT NO');
    expect(html).toContain('ACTIVE');
  });

  it('shows compact late drift as a magnitude only', () => {
    const drift = {
      canonicalDriftLabel: '+25m LATE',
      canonicalDriftTone: 'late',
      canonicalDriftMinutes: 25,
      detail: 'start +25m LATE',
    };
    const compact = renderToStaticMarkup(
      createElement(DriftPill, { drift, compact: true }),
    );
    expect(compact).toContain('>+25 min<');
    expect(compact).not.toContain('LATE</span>');

    const desktop = renderToStaticMarkup(createElement(DriftPill, { drift }));
    expect(desktop).toContain('+25m LATE');
  });

  it('adds mini chips to the MC pocket header', () => {
    const shell = renderToStaticMarkup(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'mc',
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
          culturalRules: rules,
          oczepinyStatus: { state: 'OFF' },
        },
        createElement('div', null, 'Pocket content'),
      ),
    );

    expect(shell).toContain('Sto Lat');
    expect(shell).toContain('Gorzko');
    expect(shell).toContain('Oczepiny');
    expect(shell).not.toContain('>STRICT NO<');
  });

  it('wires compact cultural data and drift through the MC view', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<DriftPill drift={driftReport.drift} compact />');
    expect(mc).toContain('culturalRules={WEDDING.culturalRules}');
    expect(mc).toContain('oczepinyStatus={oczepinyStatus}');
  });
});
