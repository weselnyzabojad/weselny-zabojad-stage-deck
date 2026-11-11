import { createElement } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VipDjLogo from '../src/components/VipDjLogo.jsx';
import { VIP_DJS } from '../src/lib/vipDjs.js';
import { djDetailTier } from '../src/lib/importantSongs.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

describe('issue #726 VIP DJ logos', () => {
  it('keeps the registry limited to Mark and Szymoniak', () => {
    expect(VIP_DJS.map((dj) => dj.id)).toEqual(['dj_mark', 'dj_szymoniak']);
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP' })).toBe('vip');
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_STANDARD' })).toBe('standard');
    expect(
      djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: 'unknown_dj' }),
    ).toBe('standard');
  });

  it('renders the matching logo for each VIP identity', () => {
    const mark = renderToStaticMarkup(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_mark' },
        vip: true,
      }),
    );
    expect(mark).toContain('alt="DJ Mark"');
    expect(mark).toContain('title="DJ Mark"');

    const szymoniak = renderToStaticMarkup(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_szymoniak' },
        vip: true,
      }),
    );
    expect(szymoniak).toContain('alt="DJ Szymoniak"');
  });

  it('renders no logo for Standard, pocket or unknown identities', () => {
    expect(
      renderToStaticMarkup(
        createElement(VipDjLogo, {
          wedding: { djIdentityId: 'dj_mark' },
          vip: false,
        }),
      ),
    ).toBe('');
    expect(
      renderToStaticMarkup(
        createElement(VipDjLogo, {
          wedding: { djIdentityId: 'unknown_dj' },
          vip: true,
        }),
      ),
    ).toBe('');
  });

  it('ships the PNG assets and a safe glob fallback', () => {
    expect(exists('src/assets/img/dj-vip/logo_mark.png')).toBe(true);
    expect(exists('src/assets/img/dj-vip/logo_szymoniak.png')).toBe(true);
    const logo = read('src/components/VipDjLogo.jsx');
    expect(logo).toContain('import.meta.glob');
    expect(logo).toContain('logo_mark.png');
    expect(logo).toContain('logo_szymoniak.png');
  });
});
