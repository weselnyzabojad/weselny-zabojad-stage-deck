import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRIVACY_CONFIG, normalizePrivacy } from '../src/config/index.js';
import {
  SECTION_MANIFEST,
  parseGoogleDocTemplate,
  validateGoogleDocTemplate,
} from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const template = read('schema/google-doc-template.md');
const NOW = new Date('2026-11-20T00:00:00Z');

function withPrivacy(cloudSync, { algorithm, keyHolder, version } = {}) {
  return [
    template,
    '## PRIVACY',
    `Cloud sync: ${cloudSync}`,
    `Encryption algorithm: ${algorithm ?? 'AES-GCM'}`,
    `Encryption key holder: ${keyHolder ?? 'HOST'}`,
    `Encryption version: ${version ?? 1}`,
  ].join('\n');
}

function parse(source) {
  return googleDocTemplateToCartridge(parseGoogleDocTemplate(source), { now: NOW });
}

describe('issue #1318 app-owned privacy after Doc removal', () => {
  it('keeps PRIVACY out of the template and the section manifest', () => {
    expect(SECTION_MANIFEST.map((section) => section.marker)).not.toContain('PRIVACY');
    expect(template).not.toContain('## PRIVACY');
  });

  it('rejects a Doc that still contains PRIVACY with a migration message', () => {
    const { errors } = validateGoogleDocTemplate(
      parseGoogleDocTemplate(withPrivacy('LOCAL_ONLY')),
    );

    expect(errors).toContain(
      'Section "## PRIVACY" was removed. Privacy and encryption settings are app-owned; delete the section and republish the wedding Doc.',
    );
  });

  it('reads no privacy key from the Doc and fills the cartridge from PRIVACY_CONFIG', async () => {
    const parser = read('src/lib/googleDocCartridge.js');
    for (const key of [
      'Cloud sync',
      'Encryption algorithm',
      'Encryption key holder',
      'Encryption version',
      'Demographics notes',
    ]) {
      expect(parser, key).not.toContain(key);
    }

    const { cartridge } = parse(withPrivacy('LOCAL_ONLY'));
    expect(cartridge.privacy).toEqual(normalizePrivacy());
    expect(cartridge.privacy).toEqual(PRIVACY_CONFIG);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('produces identical cartridges for Docs with different privacy text', () => {
    const first = parse(withPrivacy('LOCAL_ONLY', { algorithm: 'PLAINTEXT' })).cartridge;
    const second = parse(
      withPrivacy('SERVER_MANAGED', {
        algorithm: 'RSA-OAEP',
        keyHolder: 'SERVER',
        version: 9,
      }),
    ).cartridge;

    expect(first).toEqual(second);
    expect(first.privacy).toEqual(normalizePrivacy());
  });

  it('keeps every privacy field out of the Doc field map', () => {
    const fieldMap = json('schema/google-doc-field-map.json');

    for (const [fileName, fields] of Object.entries(fieldMap.files)) {
      expect(
        Object.keys(fields).filter((field) => field.startsWith('privacy.')),
        fileName,
      ).toEqual([]);
    }
  });

  it('documents the removal without listing PRIVACY as a valid marker', () => {
    const docs = read('docs/google-doc-template-conventions.md');
    expect(docs).not.toContain('| 23 | `## PRIVACY`');
    expect(docs).toContain('`## PRIVACY` is no longer a valid Doc marker');
  });
});
