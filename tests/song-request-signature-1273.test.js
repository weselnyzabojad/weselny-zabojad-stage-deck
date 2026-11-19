import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { BrandSignature, StatusCard } from '../src/components/SongRequestApp.jsx';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import { setLocale } from '../src/i18n/index.js';
import { getMainSiteUrl } from '../src/lib/mainSite.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const DICTIONARIES = { en, fr, pl };

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1273 Song Request confirmation brand signature', () => {
  it('renders the localized signature and language-aware link', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(BrandSignature));
      expect(html).toContain(dictionary['songRequest.signature.prefix']);
      expect(html).toContain('Weselny Żabojad');
      expect(html).toContain(dictionary['songRequest.signature.link']);
      expect(html).toContain(dictionary['songRequest.signature.aria']);
      expect(html).toContain(`href="${getMainSiteUrl(locale)}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    }
  });

  it('places the signature at the bottom of the status card, below any action', () => {
    const html = renderToStaticMarkup(
      createElement(
        StatusCard,
        {
          tone: 'border-brand-strong/60 bg-brand/15 text-brand-tint',
          title: 'Request pending',
          body: 'Keep this page open.',
        },
        createElement('button', { type: 'button' }, 'Send another request'),
      ),
    );
    const buttonIndex = html.indexOf('Send another request');
    const signatureIndex = html.indexOf('Evening hosted by');
    expect(buttonIndex).toBeGreaterThan(-1);
    expect(signatureIndex).toBeGreaterThan(buttonIndex);
  });

  it('keeps the signature understated and accessible', () => {
    const app = read('src/components/SongRequestApp.jsx');
    expect(app).toContain('mt-6 border-t border-line pt-4 text-center text-xs text-muted');
    expect(app).toContain('font-medium text-ink');
    expect(app).toContain('inline-flex items-center gap-1 whitespace-nowrap font-medium text-[#B89550] transition-colors hover:text-[#D4AF37]');
    expect(app).toContain('h-3 w-3 shrink-0');
    expect(app).toContain('aria-hidden="true"');
    expect(app).toMatch(/\{children\}\r?\n\s+<BrandSignature \/>/);
  });

  it('renders the signature on every post-submission status card', () => {
    const app = read('src/components/SongRequestApp.jsx');
    for (const status of ['pending', 'accepted', 'declined', 'played']) {
      expect(app).toContain(`status === '${status}'`);
    }
    expect(app.match(/<StatusCard/g)).toHaveLength(4);
    expect(app).toContain('<BrandSignature />');
  });

  it('ships the signature keys in all three locales', () => {
    for (const dictionary of Object.values(DICTIONARIES)) {
      for (const key of [
        'songRequest.signature.prefix',
        'songRequest.signature.link',
        'songRequest.signature.aria',
      ]) {
        expect(dictionary[key]).toBeTruthy();
      }
    }
  });
});
