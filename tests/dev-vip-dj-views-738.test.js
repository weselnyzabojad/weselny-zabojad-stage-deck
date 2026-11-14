import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VipDjLogo from '../src/components/VipDjLogo.jsx';
import { DEV_VIEW_ROLES } from '../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #738 dev DJ Mark and DJ Szymoniak views', () => {
  it('adds both identities to the dev view roles and switcher', () => {
    expect(DEV_VIEW_ROLES).toEqual(
      expect.arrayContaining(['dj_mark', 'dj_szymoniak']),
    );
    const switcher = read('src/components/DevViewSwitcher.jsx');
    expect(switcher).toContain("dj_mark: 'DJ Mark'");
    expect(switcher).toContain("dj_szymoniak: 'DJ Szymoniak'");
  });

  it('builds a non-persisted VIP preview wedding from the dev role', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("import.meta.env.DEV && ['dj_mark', 'dj_szymoniak'].includes(currentRole)");
    expect(deck).toContain('djIdentityId: devDjPreviewId');
    expect(deck).toContain("servicePackage: 'HOST_AND_DJ_VIP'");
    expect(deck).toContain('|| devDjPreviewId');
    expect(deck).toContain('wedding={djViewWedding}');
    expect(deck).not.toContain('saveLiveState(djViewWedding');
  });

  it('renders the matching logo for each preview identity', () => {
    const mark = renderToStaticMarkup(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_mark', servicePackage: 'HOST_AND_DJ_VIP' },
        vip: true,
      }),
    );
    expect(mark).toContain('alt="DJ Mark"');

    const szymoniak = renderToStaticMarkup(
      createElement(VipDjLogo, {
        wedding: { djIdentityId: 'dj_szymoniak', servicePackage: 'HOST_AND_DJ_VIP' },
        vip: true,
      }),
    );
    expect(szymoniak).toContain('alt="DJ Szymoniak"');
  });
});
