import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HoldToConfirmButton from '../../src/components/HoldToConfirmButton.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #439 hold-button screen-reader progress', () => {
  it('announces a hold hint and exposes a progressbar', () => {
    const html = renderToStaticMarkup(
      createElement(HoldToConfirmButton, { label: 'Advance', onConfirm: () => {} }),
    );

    expect(html).toContain('aria-describedby');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-valuetext');
    expect(html).toContain('Hold progress');
    // The visual bar stays hidden from assistive technology.
    expect(html).toContain('aria-hidden="true"');
  });

  it('keeps a single polite live status for completion/cancel', () => {
    const source = read('src/components/HoldToConfirmButton.jsx');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("t('hold.complete')");
    expect(source).toContain("t('hold.cancelled')");
  });

  it('defines the assistive labels in every locale', () => {
    const keys = ['hold.hint', 'hold.progress', 'hold.progressLabel', 'hold.complete', 'hold.cancelled'];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
