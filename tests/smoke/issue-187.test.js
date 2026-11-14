import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CoupleIdentity from '../../src/components/CoupleIdentity.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const centeredGrid = 'lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]';

describe('issue #187 centered couple identity', () => {
  const mc = read('src/views/McMasterView.jsx');
  const dj = read('src/components/DjBoothView.jsx');

  it('centers the couple block between the left and right MC groups', () => {
    expect(mc).toContain('<TopBarShell');
    expect(mc).toContain('<TopBarCenterIdentity wedding={WEDDING}');
    expect(read('src/components/TopBarShell.jsx')).toContain(centeredGrid);
  });

  it('centers the couple and localized date for every DJ tier', () => {
    expect(dj).toContain('<TopBarShell');
    expect(dj).toContain('<TopBarCenterIdentity wedding={wedding}');
    expect(read('src/components/TopBarCenterIdentity.jsx')).toContain('formatWeekdayDate');
  });

  it('renders names, flags and shared language chips', () => {
    const html = renderToStaticMarkup(
      createElement(CoupleIdentity, {
        wedding: {
          coupleProfile: {
            bride: { firstName: 'Jennifer', nationalities: ['FR'] },
            groom: { firstName: 'Guillaume', nationalities: ['PL'] },
            commonLanguages: ['FR', 'PL'],
          },
        },
      }),
    );

    expect(html).toContain('Jennifer');
    expect(html).toContain('Guillaume');
    expect(html).toContain('flag-icons-fr');
    expect(html).toContain('flag-icons-pl');
    expect(html).toContain('French');
    expect(html).toContain('Polish');
  });
});
