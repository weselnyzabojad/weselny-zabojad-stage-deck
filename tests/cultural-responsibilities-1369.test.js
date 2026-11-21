import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import {
  culturalParentActions,
  frenchParentSides,
} from '../src/lib/culturalResponsibilities.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const rules = {
  sto_lat: { status: 'ON_REQUEST', actor: 'PARENTS' },
  gorzko: { status: 'IF_GUESTS_START', actor: 'VENUE' },
  bread_salt: { status: 'YES' },
};

describe('issue #1369 MC cultural-rule responsibilities', () => {
  it('derives the French side from nationality first, then spoken languages', () => {
    expect(
      frenchParentSides({
        bride: { nationalities: ['FR'], spokenLanguages: ['EN'] },
        groom: { nationalities: [], spokenLanguages: ['FR'] },
      }),
    ).toEqual(['bride', 'groom']);
    expect(
      frenchParentSides({
        bride: { nationalities: ['PL'], spokenLanguages: ['FR'] },
        groom: { nationalities: ['FR'], spokenLanguages: ['EN'] },
      }),
    ).toEqual(['groom']);
    expect(
      frenchParentSides({
        bride: { nationalities: ['PL'], spokenLanguages: ['PL'] },
        groom: { nationalities: ['EN'], spokenLanguages: ['EN'] },
      }),
    ).toEqual([]);
  });

  it('generates French actions only for PARENTS rules and French sides', () => {
    const actions = culturalParentActions(rules, {
      bride: { nationalities: ['FR'], spokenLanguages: ['FR'] },
      groom: { nationalities: ['PL'], spokenLanguages: ['PL'] },
    });
    expect(actions).toEqual([
      expect.objectContaining({
        ruleKey: 'sto_lat',
        side: 'bride',
        text: 'Expliquer Sto Lat aux parents francophones',
      }),
    ]);
  });

  it('shows one action per French parent group', () => {
    const actions = culturalParentActions(rules, {
      bride: { nationalities: ['FR'], spokenLanguages: ['FR'] },
      groom: { nationalities: ['FR'], spokenLanguages: ['FR'] },
    });
    expect(actions.map((action) => action.side)).toEqual(['bride', 'groom']);
    expect(actions.every((action) => action.text === 'Expliquer Sto Lat aux parents francophones')).toBe(
      true,
    );
  });

  it('renders all rules with PARENTS highlighted and instruction-only actions', () => {
    const html = renderToStaticMarkup(
      createElement(CulturalRulesBar, {
        rules,
        coupleProfile: {
          bride: { nationalities: ['FR'], spokenLanguages: ['FR'] },
          groom: { nationalities: ['PL'], spokenLanguages: ['PL'] },
        },
        showParentActions: true,
      }),
    );
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Gorzko');
    expect(html).toContain('Bread &amp; Salt');
    expect(html).toContain('ring-2 ring-amber-500');
    expect(html).toContain('data-cultural-action="parents"');
    expect(html).toContain('Expliquer Sto Lat aux parents francophones');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('type="checkbox"');
  });

  it('wires the MC master view to the responsibility props', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('coupleProfile={WEDDING.coupleProfile}');
    expect(view).toContain('showParentActions');
  });
});
