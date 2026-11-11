import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../../src/components/CulturalRulesBar.jsx';
import SpeechesChip from '../../src/components/SpeechesChip.jsx';
import TopBarCenterIdentity from '../../src/components/TopBarCenterIdentity.jsx';
import TopBarRoleLabel from '../../src/components/TopBarRoleLabel.jsx';
import TopBarRoleIdentity from '../../src/components/TopBarRoleIdentity.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const rules = { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } };

describe('issue #453 larger top-bar glyphs', () => {
  it('keeps the desktop cultural glyph and the compact text-only pill', () => {
    const desktop = renderToStaticMarkup(createElement(CulturalRulesBar, { rules }));
    expect(desktop).toContain('text-lg');
    const compact = renderToStaticMarkup(createElement(CulturalRulesBar, { rules, compact: true }));
    expect(compact).toContain('Sto Lat');
    expect(compact).not.toContain('text-base');
  });

  it('keeps the desktop speeches glyph and the compact text-only pill', () => {
    expect(renderToStaticMarkup(createElement(SpeechesChip, { mode: 'OFF' }))).toContain('text-lg');
    const compact = renderToStaticMarkup(
      createElement(SpeechesChip, { mode: 'OFF', compact: true }),
    );
    expect(compact).toContain('Speeches');
    expect(compact).not.toContain('text-base');
  });

  it('enlarges the common-languages glyph without changing the row type', () => {
    const html = renderToStaticMarkup(
      createElement(TopBarCenterIdentity, {
        wedding: {
          coupleProfile: {
            bride: { firstName: 'A', nationalities: ['FR'] },
            groom: { firstName: 'B', nationalities: ['FR'] },
            commonLanguages: ['FR', 'PL'],
          },
        },
      }),
    );
    expect(html).toContain('text-[13px]');
  });

  it('enlarges the role icon and lock arrow', () => {
    expect(renderToStaticMarkup(createElement(TopBarRoleLabel, { role: 'mc' }))).toContain('text-base');
    expect(renderToStaticMarkup(createElement(TopBarRoleIdentity, { role: 'speaker' }))).toContain('text-sm');
  });

  it('enlarges PIN and sign-out glyphs', () => {
    expect(read('src/components/RoleSignOutControl.jsx')).not.toContain('text-[10px]');
    expect(read('src/components/RoleSignOutControl.jsx')).toContain('text-sm');
    const mc = read('src/views/McMasterView.jsx');
    const pinControl = mc.slice(mc.indexOf('const pinControl'), mc.indexOf('const syncControl'));
    expect(pinControl).not.toContain('text-[10px]');
    expect(pinControl).toContain('text-sm');
  });

  it('keeps glyphs decorative and does not grow header height', () => {
    for (const file of [
      'src/components/CulturalRulesBar.jsx',
      'src/components/SpeechesChip.jsx',
      'src/components/TopBarRoleLabel.jsx',
      'src/components/TopBarRoleIdentity.jsx',
    ]) {
      const source = read(file);
      expect(source, file).toContain('leading-none');
      expect(source, file).toContain('shrink-0');
    }
  });
});
