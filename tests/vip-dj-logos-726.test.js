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
  it('keeps the seeded registry and accepts registered identities on VIP packages', () => {
    expect(VIP_DJS.map((dj) => dj.id)).toEqual(['dj_mark', 'dj_szymoniak']);
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP' })).toBe('vip');
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_STANDARD' })).toBe('standard');
    expect(
      djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: 'unknown_dj' }),
    ).toBe('vip');
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
    expect(mark).toContain('logo_mark');

    const szymoniak = renderToStaticMarkup(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_szymoniak' },
        vip: true,
      }),
    );
    expect(szymoniak).toContain('alt="DJ Szymoniak"');
    expect(szymoniak).toContain('logo_szymoniak');
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

  it('ships the PNG assets and imports them explicitly with a silent failure fallback', () => {
    expect(exists('src/assets/img/dj-vip/logo_mark.png')).toBe(true);
    expect(exists('src/assets/img/dj-vip/logo_szymoniak.png')).toBe(true);
    const logo = read('src/components/VipDjLogo.jsx');
    expect(logo).not.toContain('import.meta.glob');
    expect(logo).toContain("import logoMark from '../assets/img/dj-vip/logo_mark.png'");
    expect(logo).toContain(
      "import logoSzymoniak from '../assets/img/dj-vip/logo_szymoniak.png'",
    );
    expect(logo).toContain('onError={() => setFailedSrc(src)}');
  });
});
