import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECTION_MANIFEST, parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const template = `## EVENT
Wedding ID: 2026-10-10_demo
Date: 10.10.2026
Date ISO: 2026-10-10
Sync PIN: 1010
Service package: HOST_ONLY

## COUPLE IDENTITY
Bride first name: Ilona
Bride nationality: PL
Groom first name: Adrien
Groom nationality: FR
Shared languages: PL, FR

## LANGUAGES
Default content: FR
Supported: FR, PL

## CULTURAL RULES
| Rule | Status | Note |
| --- | --- | --- |
| stoLat | NO |  |
| gorzko | NO |  |
| breadSalt | YES |  |

## MANDATORY STEPS
| Field | Time |
| --- | --- |
| Wedding closure | 18:00 |

## TIMELINE
| Step ID | Time | Title | Type | Location | Anchor ID | Main Song Required | Optional Flag | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| step_01 | 16:00 | Grand Entrance | FLEXIBLE | Main Hall |  | false |  |  |

## NOTES
| Step ID | Notes |
| --- | --- |
| step_01 | Keep the couple by the door. |
|   | Blank Step ID should warn. |
| missing | Unknown Step ID should warn. |

## SUBTASKS
| Step ID | Subtask ID | Label | Done |
| --- | --- | --- | --- |
| step_01 | mic | Check the mic | false |
`;

describe('issue #774 Google Doc step notes section', () => {
  it('replaces MC CUES with NOTES in the template and manifest', () => {
    expect(SECTION_MANIFEST.find((section) => section.marker === 'NOTES')).toMatchObject({
      order: 8,
      schemaPath: ['steps[].notes'],
    });
    expect(SECTION_MANIFEST.some((section) => section.marker === 'MC CUES')).toBe(false);

    const doc = read('schema/google-doc-template.md');
    expect(doc).toContain('## NOTES');
    expect(doc).not.toContain('## MC CUES');
  });

  it('maps one optional note per step and warns on bad rows', () => {
    const result = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    expect(result.errors).toEqual([]);
    expect(result.cartridge.steps[0].notes).toBe('Keep the couple by the door.');
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'NOTES row skipped: missing Step ID',
        'NOTES row skipped: unknown Step ID "missing"',
      ]),
    );
  });

  it('declares optional notes on the step schema and field map', () => {
    for (const path of ['schema/domains/steps.json', 'supabase/functions/_shared/domains/steps.json']) {
      const schema = json(path);
      expect(schema.$defs.step.properties.notes.type).toBe('string');
    }
    const fieldMap = json('schema/google-doc-field-map.json');
    expect(fieldMap.files['steps.example.json']['steps[].notes']).toBe('optional');
    expect(fieldMap.files['wedding-cartridge.example.json']['steps[].notes']).toBe('optional');
  });

  it('keeps legacy mcCues accepted while no longer populating it', () => {
    const legacy = json('schema/wedding-cartridge.example.json');
    legacy.steps[1].mcCues = [{ language: 'PL', timing: 'AT_START', text: 'Legacy cue' }];
    return validateCartridge(legacy).then((errors) => {
      expect(errors).toEqual([]);
    });
  });

  it('adds representative notes to the example and real fixture', () => {
    expect(json('schema/wedding-cartridge.example.json').steps[1].notes).toBe(
      'Guests gather in the garden for the aperitif.',
    );
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    expect(fixture.steps.find((step) => step.id === 'step_03').notes).toContain(
      'Keep the newlyweds',
    );
  });
});
