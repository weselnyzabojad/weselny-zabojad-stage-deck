import { createElement } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VipDjLogo from '../src/components/VipDjLogo.jsx';
import { VIP_DJS, isVipDjId } from '../src/lib/vipDjs.js';
import { VIP_DJ_IDS } from '../supabase/functions/_shared/vipRules.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

describe('issue #1056 Zaremba VIP partner', () => {
  it('seeds the registry row and VIP identity set', () => {
    const sql = read('supabase/migrations/202611150006_zaremba_vip.sql');
    expect(sql).toContain("'dj_zaremba'");
    expect(sql).toContain("'DJ Zaremba'");
    expect(sql).toContain("'/assets/img/dj-vip/logo_zaremba.png'");
    expect(sql).toContain('null, 3, true');
    expect(VIP_DJ_IDS.has('dj_zaremba')).toBe(true);
    expect(isVipDjId('dj_zaremba')).toBe(true);
    expect(VIP_DJS.find((dj) => dj.id === 'dj_zaremba')).toMatchObject({
      displayName: 'DJ Zaremba',
      defaultForPackage: null,
    });
  });

  it('renders the bundled Zaremba logo with the right alt/title', () => {
    const html = renderToStaticMarkup(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_zaremba' },
        vip: true,
      }),
    );
    expect(html).toContain('alt="DJ Zaremba"');
    expect(html).toContain('title="DJ Zaremba"');
    expect(html).toContain('logo_zaremba');
  });

  it('ships the asset and imports it through the bundler', () => {
    expect(exists('src/assets/img/dj-vip/logo_zaremba.png')).toBe(true);
    const logo = read('src/components/VipDjLogo.jsx');
    expect(logo).toContain("import logoZaremba from '../assets/img/dj-vip/logo_zaremba.png'");
    expect(logo).toContain('dj_zaremba: logoZaremba');
  });

  it('keeps Mark and Szymoniak behaviour', () => {
    for (const [id, name] of [
      ['dj_mark', 'DJ Mark'],
      ['dj_szymoniak', 'DJ Szymoniak'],
    ]) {
      const html = renderToStaticMarkup(
        createElement(VipDjLogo, { wedding: { djIdentityId: id }, vip: true }),
      );
      expect(html, id).toContain(`alt="${name}"`);
    }
  });
});
