import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import TopBarRoleIdentity from '../src/components/TopBarRoleIdentity.jsx';
import TopBarRoleLabel from '../src/components/TopBarRoleLabel.jsx';
import TopBarShell from '../src/components/TopBarShell.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

describe('issue #751 desktop top bar layout and overflow', () => {
  it('wraps right actions and keeps the co-brand in a separate shrink-safe slot', () => {
    const html = render(
      createElement(TopBarShell, {
        left: createElement('span', null, 'brand'),
        center: createElement('span', null, 'couple'),
        right: createElement('span', null, 'actions'),
        brand: createElement('span', null, 'partner'),
      }),
    );

    expect(html).toContain('flex min-w-0 max-w-full flex-wrap items-center justify-start gap-2 lg:justify-end');
    expect(html).toContain('<div class="shrink-0">');
    expect(html.indexOf('actions')).toBeLessThan(html.indexOf('partner'));
    expect(html).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(html).toContain('lg:items-center');
  });

  it('keeps the VIP partner logo out of the action row and on the brand slot', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('brand={<VipDjLogo wedding={wedding} vip={caps.vip} />}');
    const right = dj.slice(dj.indexOf('right={('), dj.indexOf('brand={'));
    expect(right).not.toContain('<VipDjLogo');
  });

  it('centres the left logo, clock, divider and role row', () => {
    const mc = read('src/views/McMasterView.jsx');
    const left = mc.slice(mc.indexOf('left={('), mc.indexOf('center={'));
    expect(left.indexOf('<TopBarLogo')).toBeLessThan(left.indexOf('<TopBarClock'));
    expect(left.indexOf('<TopBarClock')).toBeLessThan(left.indexOf('<TopBarRoleLabel'));
    expect(left).toContain('hidden h-8 w-px shrink-0 bg-panel-border sm:block');
    expect(read('src/components/TopBarClock.jsx')).toContain('leading-none');
    expect(read('src/components/TopBarShell.jsx')).toContain('gap-x-3 gap-y-2');
  });

  it('uses lighter chrome for the clock and role badge', () => {
    for (const path of [
      'src/components/TopBarRoleLabel.jsx',
      'src/components/TopBarRoleIdentity.jsx',
    ]) {
      const source = read(path);
      expect(source, path).not.toContain('shadow-sm');
      expect(source, path).not.toContain('backdrop-blur-sm');
      expect(source, path).toContain('border-line/70');
      expect(source, path).toContain('bg-raised/35');
    }
    expect(read('src/components/TopBarClock.jsx')).not.toContain('border');
    expect(read('src/components/TopBarClock.jsx')).not.toContain('shadow');
  });

  it('preserves green/red toggle states and existing handlers', () => {
    const rules = render(
      createElement(CulturalRulesBar, {
        rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } },
        oczepinyStatus: { state: 'ON' },
      }),
    );
    expect(rules).toContain('border-tone-positive-border');
    expect(rules).toContain('border-tone-negative-border');
    expect(rules).toContain('Sto Lat');
    expect(rules).toContain('STRICT NO');

    const speeches = render(
      createElement(SpeechesChip, {
        mode: 'LIGHT',
        speeches: [{ id: 's1', speaker: { name: 'Anna' } }],
      }),
    );
    expect(speeches).toContain('border-tone-positive-border');
    expect(speeches).toContain('Speeches');

    expect(read('src/components/CulturalRulesBar.jsx')).not.toContain('onClick');
    expect(read('src/components/SpeechesChip.jsx')).not.toContain('onClick');
  });

  it('renders the role badge text without changing labels', () => {
    expect(render(createElement(TopBarRoleLabel, { role: 'mc' }))).toContain('MC');
    expect(render(createElement(TopBarRoleIdentity, { role: 'dj', tier: 'VIP' }))).toContain(
      'Role: DJ VIP',
    );
  });
});
