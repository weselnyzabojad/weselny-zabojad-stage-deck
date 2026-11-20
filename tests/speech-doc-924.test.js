import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSpeechDocTemplate,
  parseSpeechDoc,
  speechDocFilename,
} from '../supabase/functions/_shared/speechDoc.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const doc = (speaker, mc, sp = 'FR', ml = 'PL') =>
  `SPEAKER [${sp}]\n${speaker}\n\nMC [${ml}]\n${mc}\n`;

describe('issue #924 bilingual speech Doc parser', () => {
  it('parses alternating SPEAKER/MC pairs with explicit languages', () => {
    const result = parseSpeechDoc(
      `${doc('Bonjour à tous', 'Witajcie')}${doc('Deuxième partie', 'Druga część')}`,
      { speakerLanguage: 'FR', mcLanguage: 'PL', order: 2 },
    );
    expect(result.errors).toEqual([]);
    expect(result.pairs).toEqual([
      { speaker: 'Bonjour à tous', translation: 'Witajcie' },
      { speaker: 'Deuxième partie', translation: 'Druga część' },
    ]);
    expect(result.script).toContain('SPEAKER:');
  });

  it('rejects same languages, missing pairs and empty text', () => {
    expect(
      parseSpeechDoc(doc('Hello', 'Hola', 'EN', 'EN'), {
        speakerLanguage: 'EN',
        mcLanguage: 'EN',
      }).errors[0].code,
    ).toBe('same_language');
    expect(
      parseSpeechDoc('SPEAKER [FR]\nBonjour', { speakerLanguage: 'FR', mcLanguage: 'PL' })
        .errors.map((error) => error.code),
    ).toContain('missing_translation');
    expect(
      parseSpeechDoc('SPEAKER [FR]\n\nMC [PL]\nTłumaczenie', {
        speakerLanguage: 'FR',
        mcLanguage: 'PL',
      }).errors.map((error) => error.code),
    ).toContain('empty_speaker');
  });

  it('rejects language drift and duplicate role order', () => {
    expect(
      parseSpeechDoc(doc('Hello', 'Hola', 'EN', 'PL'), {
        speakerLanguage: 'FR',
        mcLanguage: 'PL',
      }).errors.map((error) => error.code),
    ).toContain('language_mismatch');
    expect(
      parseSpeechDoc('MC [PL]\nTłumaczenie\n\nSPEAKER [FR]\nBonjour', {
        speakerLanguage: 'FR',
        mcLanguage: 'PL',
      }).errors.map((error) => error.code),
    ).toContain('unexpected_mc');
  });

  it('builds a language-neutral template and stable filename', () => {
    const template = buildSpeechDocTemplate({
      speakerName: 'Bartek',
      relationship: 'Best man',
      speakerLanguage: 'PL',
      mcLanguage: 'FR',
    });
    expect(template).toContain('SPEAKER [PL]');
    expect(template).toContain('MC [FR]');
    expect(() =>
      buildSpeechDocTemplate({
        speakerLanguage: 'PL',
        mcLanguage: 'PL',
      }),
    ).toThrow(/must differ/);
    expect(
      speechDocFilename({
        weddingId: 'Weronika&Guillaume-UM-2027-04-002',
        order: 2,
        speakerName: 'Bartek',
        relationship: 'Best man',
      }),
    ).toBe('Weronika&Guillaume-UM-2027-04-002 - 2 - Bartek - Best man');
    expect(
      speechDocFilename({
        weddingId: 'Weronika&Guillaume-UM-2027-04-002',
        order: 1,
        speakerName: 'A/B',
        relationship: 'Witness?',
      }),
    ).toBe('Weronika&Guillaume-UM-2027-04-002 - 1 - A B - Witness');
    expect(() => speechDocFilename({ order: 1, speakerName: 'Bartek' })).toThrow(
      /wedding id/,
    );
  });

  it('exposes the Drive create/rename/parse lifecycle', () => {
    const drive = read('supabase/functions/_shared/googleDrive.js');
    for (const method of ['createFolder', 'ensureFolderPath', 'ensureSpeechFolder', 'createGoogleDoc', 'renameFile']) {
      expect(drive).toContain(method);
    }
    const api = read('supabase/functions/admin_drive/index.ts');
    for (const action of ['create_speech_doc', 'rename_speech_doc', 'parse_speech_doc']) {
      expect(api).toContain(action);
    }
    expect(api).toContain("status: 'DRAFT'");
    expect(api).toContain("status: 'READY'");
    expect(api).toContain("progress: [...progress, 'encrypt']");
  });
});
