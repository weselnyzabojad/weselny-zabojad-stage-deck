import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BrandFrame from '../src/components/BrandFrame.jsx';
import TopBarLogo from '../src/components/TopBarLogo.jsx';
import VipDjLogo from '../src/components/VipDjLogo.jsx';
import { BRAND_FRAME } from '../src/lib/topBarStyles.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const render = (element) => renderToStaticMarkup(element);
const partner = (djIdentityId) =>
  render(
    createElement(VipDjLogo, {
      wedding: { djIdentityId, servicePackage: 'HOST_AND_DJ_VIP' },
      vip: true,
    }),
  );

describe('issue #749 unified header branding containers', () => {
  it('exports one shared brand frame used by both logo components', () => {
    for (const token of [
      'h-16',
      'rounded-2xl',
      'border-white/50',
      'bg-white/90',
      'px-3',
      'py-1.5',
      'shadow-sm',
    ]) {
      expect(BRAND_FRAME, token).toContain(token);
    }
    expect(read('src/components/BrandFrame.jsx')).toContain('BRAND_FRAME');
    expect(read('src/components/TopBarLogo.jsx')).toContain('<BrandFrame');
    expect(read('src/components/VipDjLogo.jsx')).toContain('<BrandFrame');
  });

  it('renders the primary and partner logos inside the same frame styling', () => {
    const primary = render(createElement(TopBarLogo));
    for (const identity of ['dj_mark', 'dj_szymoniak']) {
      const html = partner(identity);
      expect(html).toContain('rounded-2xl');
      expect(html).toContain('border-white/50');
      expect(html).toContain('bg-white/90');
      expect(html).toContain('shadow-sm');
      expect(html).toContain('h-16');
    }
    expect(primary).toContain('h-16');
    expect(primary).toContain('rounded-2xl');
    expect(primary).toContain('bg-white/90');
  });

  it('shows only the assigned partner identity and stays non-interactive', () => {
    const mark = partner('dj_mark');
    expect(mark).toContain('alt="DJ Mark"');
    expect(mark).not.toContain('DJ Szymoniak');
    expect(mark).not.toContain('<a ');
    expect(mark).not.toContain('<button');

    const szymoniak = partner('dj_szymoniak');
    expect(szymoniak).toContain('alt="DJ Szymoniak"');
    expect(szymoniak).not.toContain('DJ Mark');
    expect(szymoniak).not.toContain('<a ');
    expect(szymoniak).not.toContain('<button');

    const primary = render(createElement(TopBarLogo));
    expect(primary).not.toContain('<a ');
    expect(primary).not.toContain('<button');
  });

  it('keeps the desktop shell wrap-safe and the pocket header logo-free', () => {
    const shell = read('src/components/TopBarShell.jsx');
    expect(shell).toContain('flex min-w-0 flex-wrap items-center');
    expect(shell).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(shell).toContain('lg:justify-end');
    expect(read('src/components/RoleShell.jsx')).not.toContain('BrandFrame');
  });

  it('places the primary logo on the left and the partner on the right of the DJ header', () => {
    const source = read('src/components/DjBoothView.jsx');
    const shellStart = source.indexOf('<TopBarShell');
    const shell = source.slice(shellStart, source.indexOf('\n      />', shellStart));
    const left = shell.slice(shell.indexOf('left={('), shell.indexOf('center={'));
    const right = shell.slice(shell.indexOf('right={('));
    expect(left).toContain('<TopBarLogo');
    expect(right).toContain('<VipDjLogo');
    expect(right).not.toContain('<TopBarLogo');
  });

  it('re-exports a single BrandFrame wrapper around children', () => {
    expect(render(createElement(BrandFrame, null, 'logo'))).toContain('logo');
  });
});
