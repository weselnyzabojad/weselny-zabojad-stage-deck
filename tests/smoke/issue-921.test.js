import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { setLocale } from '../../src/i18n/index.js';

const TECHNICAL = ['tls', 'headers', 'tokens', 'pins', 'admin', 'rls', 'secrets', 'monitoring'];
const SECURITY_KEYS = [
  'landing.security.title',
  'landing.security.lead',
  'landing.security.assurance',
  'landing.security.technical.title',
  ...TECHNICAL.map((key) => `landing.security.technical.${key}`),
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

  it('renders one lead, one assurance and one collapsed technical disclosure', () => {
    setLocale('pl', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    const sectionStart = html.indexOf('<section aria-labelledby="landing-security"');
    const sectionEnd = html.indexOf('<section aria-labelledby="landing-contact"');
    const section = html.slice(sectionStart, sectionEnd);

    const details = section.match(/<details\b[^>]*>/g) ?? [];
    expect(details).toHaveLength(1);
    expect(details[0]).not.toMatch(/\bopen\b/);
    expect((section.match(/<summary\b/g) ?? [])).toHaveLength(1);

    expect(section).toContain(pl['landing.security.lead']);
    expect(section).toContain(pl['landing.security.assurance']);
    expect(section).not.toContain('Designed to Weselny');
    expect(pl['landing.security.standards']).toBeUndefined();
    expect(section).toContain(pl['landing.security.technical.title']);
    expect(pl['landing.security.closing']).toBeUndefined();
    for (const key of TECHNICAL) {
      expect(section).toContain(pl[`landing.security.technical.${key}`]);
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
    const requiredTerms = ['TLS', 'HSTS', 'CSP', 'ES256', 'bcrypt', 'TOTP', 'AAL2', 'RLS', 'AES-256-GCM', 'HKDF', 'PII'];

    for (const dictionary of [pl, en, fr]) {
      const technicalText = TECHNICAL.map(
        (key) => dictionary[`landing.security.technical.${key}`],
      ).join(' ');
      for (const term of requiredTerms) {
        expect(technicalText, term).toContain(term);
      }
      expect(dictionary['landing.intro.trust']).toContain('Weselny Żabojad');
    }
  });

  it('renders the trust line in the intro, not in Security', () => {
    setLocale('en', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));
    const introIndex = html.indexOf(en['landing.intro.p2']);
    const trustIndex = html.indexOf(en['landing.intro.trust']);
    const featuresIndex = html.indexOf('id="landing-features"');
    expect(trustIndex).toBeGreaterThan(introIndex);
    expect(trustIndex).toBeLessThan(featuresIndex);
    expect(html.indexOf('id="landing-security"')).toBeGreaterThan(featuresIndex);
    expect(html.slice(html.indexOf('id="landing-security"'))).not.toContain(
      en['landing.intro.trust'],
    );
  });
});
