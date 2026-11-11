import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBarRoleIdentity from '../../src/components/TopBarRoleIdentity.jsx';
import TopBarRoleLabel from '../../src/components/TopBarRoleLabel.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

describe('issue #454 DJ Standard role label', () => {
  it('shows only DJ for the Standard and Solo tiers', () => {
    for (const tier of ['STANDARD', 'SOLO', null]) {
      const html = render(TopBarRoleIdentity, { role: 'dj', tier });
      expect(html, String(tier)).toContain('Role: DJ');
      expect(html, String(tier)).not.toContain('Standard');
      expect(html, String(tier)).not.toContain('Solo');
      expect(html, String(tier)).not.toContain('MC');
    }
  });

  it('keeps DJ VIP for the VIP tier', () => {
    expect(render(TopBarRoleIdentity, { role: 'dj', tier: 'VIP' })).toContain('Role: DJ VIP');
    expect(render(TopBarRoleLabel, { role: 'dj', tier: 'VIP' })).toContain('DJ VIP');
  });

  it('applies the same rule to the static role label', () => {
    const html = render(TopBarRoleLabel, { role: 'dj', tier: 'STANDARD' });
    expect(html).toContain('DJ');
    expect(html).not.toContain('Standard');
    expect(html).not.toContain('MC');
  });

  it('renders the DJ view under the dj role while keeping auth identity', () => {
    const deck = read('src/StageDeck.jsx');
    const djStart = deck.indexOf('<DjBoothView');
    const djView = deck.slice(djStart, deck.indexOf('</AppErrorBoundary>', djStart));
    expect(djView).toContain('role="dj"');
    expect(djView).not.toContain("role={currentRole === 'dj_standard' ? 'dj' : role}");
    expect(deck).toContain('role={baseRole}');
  });
});
