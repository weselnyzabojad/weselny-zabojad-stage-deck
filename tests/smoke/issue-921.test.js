import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { setLocale } from '../../src/i18n/index.js';

const TOPICS = ['transport', 'access', 'admin', 'secrets', 'data'];
const SECURITY_KEYS = [
  'landing.security.title',
  'landing.security.lead',
  ...TOPICS.flatMap((topic) => [
    `landing.security.${topic}.q`,
    `landing.security.${topic}.a`,
  ]),
  'landing.security.closing',
];

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #921 landing security disclosure', () => {
  it('renders the security section between the FAQ and the contact banner', () => {
    setLocale('en', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain('<section aria-labelledby="landing-security"');
    expect(html).toContain('id="landing-security"');
    expect(html).not.toContain('<details open');

    const faqIndex = html.indexOf('id="landing-faq"');
    const securityIndex = html.indexOf('id="landing-security"');
    const contactIndex = html.indexOf('id="landing-contact"');
    expect(faqIndex).toBeGreaterThan(-1);
    expect(securityIndex).toBeGreaterThan(faqIndex);
    expect(contactIndex).toBeGreaterThan(securityIndex);
  });

  it('renders one lead and five collapsed native disclosures', () => {
    setLocale('pl', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    const sectionStart = html.indexOf('<section aria-labelledby="landing-security"');
    const sectionEnd = html.indexOf('<section aria-labelledby="landing-contact"');
    const section = html.slice(sectionStart, sectionEnd);

    const details = section.match(/<details\b[^>]*>/g) ?? [];
    expect(details).toHaveLength(5);
    for (const tag of details) {
      expect(tag).not.toMatch(/\bopen\b/);
    }
    expect((section.match(/<summary\b/g) ?? [])).toHaveLength(5);
    expect(section).toContain(pl['landing.security.lead']);
    expect(section).toContain(pl['landing.security.closing']);
    for (const topic of TOPICS) {
      expect(section).toContain(pl[`landing.security.${topic}.q`]);
      expect(section).toContain(pl[`landing.security.${topic}.a`]);
    }
  });

  it('ships the full security key set in PL, EN and FR', () => {
    for (const dictionary of [pl, en, fr]) {
      for (const key of SECURITY_KEYS) {
        expect(dictionary[key], key).toBeTruthy();
        expect(dictionary[key].trim(), key).not.toBe('');
      }
    }
  });

  it('names the approved standards and tools in every locale', () => {
    const requiredTerms = {
      transport: ['TLS', 'HSTS', 'CSP', 'X-Frame-Options', 'Permissions-Policy'],
      access: ['bcrypt', 'ES256', 'Postgres', 'RLS'],
      admin: ['TOTP', 'AAL2', 'allowlist'],
      secrets: ['ES256', 'JWKS', 'HS256', 'AES-256-GCM', 'HKDF'],
      data: ['TTL', 'Sentry', 'PII'],
    };

    for (const dictionary of [pl, en, fr]) {
      for (const [topic, terms] of Object.entries(requiredTerms)) {
        for (const term of terms) {
          expect(dictionary[`landing.security.${topic}.a`], `${topic}: ${term}`).toContain(term);
        }
      }
    }
  });
});
