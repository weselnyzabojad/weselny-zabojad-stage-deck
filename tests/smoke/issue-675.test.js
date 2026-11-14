import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { applyGameQuestionDocs } from '../../src/lib/gameQuestions.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #675 wedding-cartridge Google Doc source flags', () => {
  it('adds the third DJ_MC hosting mode', async () => {
    expect(json('schema/wedding-schema-v1.1.json').properties.servicePackage.enum).toEqual([
      'HOST_AND_DJ_VIP',
      'HOST_ONLY',
      'DJ_MC',
    ]);
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
    expect(template).toContain('Service package: HOST_AND_DJ_VIP');

    expect(parse().cartridge.servicePackage).toBe('HOST_AND_DJ_VIP');
    const combined = parse(template.replace('Service package: HOST_AND_DJ_VIP', 'Service package: DJ_MC'));
    expect(combined.cartridge.servicePackage).toBe('DJ_MC');
    expect(await validateCartridge(combined.cartridge)).toEqual([]);
  });

  it('uses the couple first names in the cartridge example answers', () => {
    const answers = json('schema/wedding-cartridge.example.json').steps
      .flatMap((step) => step.game?.questions ?? [])
      .map((question) => question.answer)
      .filter(Boolean);
    expect(answers).toContain('Jennifer');
    expect(answers).toContain('Guillaume');
    expect(answers).not.toContain('BRIDE');
    expect(answers).not.toContain('GROOM');
  });

  it('resolves BRIDE/GROOM placeholders from the separate question Doc', () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    const gameStep = cartridge.steps.find((step) => step.game?.sourceDocId);
    const doc = [
      '| Question ID | Level | Question PL | Question FR | Question EN | Answer |',
      '| --- | --- | --- | --- | --- | --- |',
      '| w01 | EASY | Kto? | Qui ? | Who? | BRIDE |',
      '| w02 | EASY | Kto? | Qui ? | Who? | GROOM |',
    ].join('\n');

    const result = applyGameQuestionDocs(cartridge, { [gameStep.game.sourceDocId]: doc });
    const questions = result.steps.find((step) => step.id === gameStep.id).game.questions;

    expect(questions.map((question) => question.answer)).toEqual(['Jennifer', 'Guillaume']);
  });

  it('removes the ceremony translation-help field', () => {
    expect(
      json('schema/domains/steps.json').$defs.ceremony.properties.mcTranslationHelpRequested,
    ).toBeUndefined();
    expect(read('schema/google-doc-template.md')).not.toContain('Ceremony MC translation help');
    expect(read('src/demo/demoWedding.js')).not.toContain('mcTranslationHelpRequested');
    expect(read('schema/fixtures/real-jennifer-guillaume.json')).not.toContain(
      'mcTranslationHelpRequested',
    );
  });

  it('has no remaining field-map TODOs', () => {
    expect(json('schema/google-doc-field-map.json').todos).toEqual([]);
  });
});
