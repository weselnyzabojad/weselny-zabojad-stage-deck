import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectSemanticErrors } from '../../src/lib/cartridgeValidation.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const closureStep = (mandatory = {}) => ({
  id: 'closure',
  time: '02:00',
  durationMin: 1,
  title: 'Wedding closure',
  type: 'HARD_ANCHOR',
  location: '',
  mandatory: { kind: 'CLOSURE', ...mandatory },
});

const base = {
  steps: [closureStep({ closureExtensionUntil: '03:00' })],
};

describe('issue #448 venue extension hour', () => {
  it('replaces the +1h label with a checkbox and conditional hour picker', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain("t('venueManager.extensionPossible')");
    expect(venue).toContain("t('venueManager.extensionUntil')");
    expect(venue).toContain('closureExtensionAllowed === true');
    expect(venue).toContain('closureExtensionUntil');
    expect(venue).not.toContain('+1h extension allowed');
  });

  it('adds the optional clock field to both schemas and fixtures', () => {
    for (const path of [
      'schema/domains/steps.json',
      'supabase/functions/_shared/domains/steps.json',
    ]) {
      expect(read(path), path).toContain('"closureExtensionUntil"');
    }
    expect(read('schema/wedding-cartridge.example.json')).toContain('"closureExtensionUntil": "03:00"');
    expect(read('src/demo/demoWedding.js')).toContain('closureExtensionUntil: "03:00"');
  });

  it('maps the parser and shared mandatory view', () => {
    expect(read('src/lib/googleDocCartridge.js')).toContain("get('Closure extension until')");
    expect(read('src/lib/mandatorySteps.js')).toContain('closureExtensionUntil');
  });

  it('shows the actual hour in the update popup and closure banner', () => {
    expect(read('src/components/MandatoryUpdatePopup.jsx')).toContain('mandatoryUpdate.extensionUntil');
    const banner = read('src/components/WeddingClosureBanner.jsx');
    expect(banner).toContain('closure.extensionUntil');
    expect(banner).toContain('closure.extensionPossible');
  });

  it('validates the extension end after closure across midnight', () => {
    expect(collectSemanticErrors(base)).toEqual([]);
    const invalid = collectSemanticErrors({
      ...base,
      steps: [closureStep({ closureExtensionUntil: '01:00' })],
    });
    expect(invalid.some((error) => error.message.includes('closure extension'))).toBe(true);
  });

  it('keeps old cartridges without the field valid', () => {
    expect(collectSemanticErrors({ steps: [closureStep()] })).toEqual([]);
  });

  it('defines labels in every locale', () => {
    const keys = [
      'venueManager.extensionPossible',
      'venueManager.extensionUntil',
      'mandatoryUpdate.extensionUntil',
      'closure.extensionUntil',
      'closure.extensionPossible',
    ];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
