import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';

const rules = { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } };

describe('issue #717 pocket cultural chips centred', () => {
  it('centres the compact chip row', () => {
    const html = renderToStaticMarkup(
      createElement(CulturalRulesBar, {
        rules,
        oczepinyStatus: { state: 'ON' },
        compact: true,
      }),
    );
    expect(html).toContain('justify-center');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Gorzko');
    expect(html).toContain('Oczepiny');
  });

  it('keeps the desktop row left-aligned', () => {
    const html = renderToStaticMarkup(
      createElement(CulturalRulesBar, { rules, oczepinyStatus: { state: 'ON' } }),
    );
    expect(html).not.toContain('justify-center');
  });
});
