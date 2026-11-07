import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CoupleIdentity from '../../src/components/CoupleIdentity.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const centeredGrid = 'xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]';

describe('issue #187 centered couple identity', () => {
  const mc = read('src/views/McMasterView.jsx');
  const dj = read('src/components/DjBoothView.jsx');

  it('centers the couple block between the left and right MC groups', () => {
    expect(mc).toContain(centeredGrid);
    expect(mc).toContain('<CoupleIdentity wedding={WEDDING}');
    expect(mc).toContain('items-center justify-center');
  });

  it('centers the couple and date for DJ VIP only', () => {
    expect(dj).toContain(centeredGrid);
    expect(dj).toContain('{isVip ? (');
    expect(dj).toContain('<CoupleIdentity wedding={wedding}');
    expect(dj).toContain('{wedding.date}');
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
    expect(html).toContain('>FR<');
    expect(html).toContain('>PL<');
  });
});
