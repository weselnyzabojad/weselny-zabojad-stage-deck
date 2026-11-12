import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BrandFrame from '../src/components/BrandFrame.jsx';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import TopBarLogo from '../src/components/TopBarLogo.jsx';
import VipDjLogo from '../src/components/VipDjLogo.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

const grid = () =>
  render(
    createElement(
      CulturalRulesBar,
      {
        rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } },
        oczepinyStatus: { state: 'ON' },
        grid: true,
        dense: true,
      },
      createElement(SpeechesChip, {
        mode: 'LIGHT',
        speeches: [{ id: 's1', speaker: { name: 'Anna' } }],
        dense: true,
      }),
    ),
  );

describe('issue #753 top bar action grid and co-brand sizing', () => {
  it('renders the four indicators in the required 2x2 order', () => {
    const html = grid();
    const positions = ['Sto Lat', 'Gorzko', 'Oczepiny', 'Speeches'].map((label) =>
      html.indexOf(label),
    );
    expect(positions.every((position) => position > -1)).toBe(true);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index]).toBeGreaterThan(positions[index - 1]);
    }
    expect(html).toContain('grid max-w-full grid-cols-2 gap-1.5');
  });

  it('uses the compact label-only footprint while keeping states accessible', () => {
    const html = grid();
    expect(html).toContain('rounded-xl px-2 py-1');
    expect(html).toContain('text-[10px]');
    expect(html).not.toContain('text-[9px]');
    expect(html).not.toContain('h-1 w-1');
    expect(html).toContain('border-tone-positive-border');
    expect(html).toContain('border-tone-negative-border');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('aria-label="Gorzko: STRICT NO"');
    expect(html).toContain('aria-label="Speeches: LIGHT · 1"');
  });

  it('wires the dense grid into MC, DJ VIP and Photographer', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('grid');
      expect(source, path).toContain('dense');
      expect(source, path).toContain('<SpeechesChip');
      expect(source.indexOf('<CulturalRulesBar')).toBeLessThan(
        source.indexOf('<SpeechesChip'),
      );
    }
  });

  it('keeps the pocket rule row compact and unchanged', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('compact');
    expect(shell).toContain('<CulturalRulesBar');
    expect(shell).toContain('<SpeechesChip');
    expect(shell).not.toContain('grid');
  });

  it('enlarges the co-branding frame and mark only', () => {
    const mark = render(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_mark' },
        vip: true,
      }),
    );
    expect(mark).toContain('h-20');
    expect(mark).toContain('px-4');
    expect(mark).toContain('h-16');
    expect(mark).toContain('max-w-[220px]');

    const primary = render(createElement(TopBarLogo));
    expect(primary).toContain('h-16');
    expect(primary).not.toContain('h-20');
    expect(primary).toContain('h-12');
  });

  it('uses the large frame variant without changing the shared surface', () => {
    const large = render(createElement(BrandFrame, { large: true }, 'partner'));
    expect(large).toContain('h-20');
    expect(large).toContain('rounded-2xl');
    expect(large).toContain('border-white/50');
    expect(large).toContain('bg-white/90');
    expect(large).toContain('shadow-sm');
  });
});
