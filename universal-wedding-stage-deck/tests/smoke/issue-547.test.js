import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const MINIMAL_TEMPLATE = `## EVENT
Wedding ID: 2026-10-10_ilona_adrien
Date: 10.10.2026
Date ISO: 2026-10-10
Sync PIN: 1010
Service package: HOST_ONLY
Venue: Hotel Jura Osiek
Ceremony type: RELIGIOUS

## COUPLE IDENTITY
Couple: Ilona & Adrien
Bride first name: Ilona
Bride nationality: PL
Groom first name: Adrien
Groom nationality: FR
Shared languages: PL, FR, EN

## LANGUAGES
Default content: FR
Supported: FR, PL, EN

## CULTURAL RULES
| Rule | Status | Note |
| --- | --- | --- |
| stoLat | YES_EXPLAIN | Explain Sto lat in FR. |
| gorzko | IF_GUESTS_START | During cake only. |
| breadSalt | YES | Vodka vs water shot. |

## TIMELINE
| Step ID | Time | Duration (min) | Title | Type | Location | Anchor ID | Main Song Required | Optional Flag | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| step_01 | 16:00 | 15 | Grand Entrance | FLEXIBLE | Main Hall |  | true |  | Guest order: guests first, newlyweds after. |
| step_02 | 20:30 | 30 | Wedding Cake | HARD_ANCHOR | Terrace | cake_anchor | true |  |  |
| step_03 | 00:00 | 60 | Oczepiny | FLEXIBLE | Main Hall |  | false | oczepiny |  |

## DJ CUES
| Step ID | Playlist | Track | Cutoff | CutoffSec | Note |
| --- | --- | --- | --- | --- | --- |
| step_01 | Party Set | Gimme! Gimme! Gimme! — ABBA |  |  |  |

## MC CUES
| Step ID | Language | Timing | Text |
| --- | --- | --- | --- |
| step_01 | FR | AT_START | Toast et lancer les verres derrière soi. |
| step_01 | PL | AT_START | Sto lat! |
| step_01 | PL | AT_START | Rzut kieliszkami. |

## SUBTASKS
| Step ID | Subtask ID | Label | Done |
| --- | --- | --- | --- |
| step_01 | napkins | Guests use napkins for an Italian welcome | false |
| step_01 | sto_lat_fr | Explain Sto lat in French | false |

## VIEW VISIBILITY
| Role | Section | Visible |
| --- | --- | --- |
| photo | music | false |
`;

describe('issue #547 canonical step vocabulary & Plan-of-the-day mapping', () => {
  it('documents the canonical step vocabulary and lettered-bullet convention', () => {
    const conventions = read('docs/google-doc-template-conventions.md');
    expect(conventions).toContain('Canonical step vocabulary');
    expect(conventions).toContain('Plan-of-the-day transcription');
    for (const term of [
      'Ceremony',
      "Vin d'honneur",
      'Bread & Salt',
      'Wishes',
      'Grand Entrance',
      'First Dance',
      'Wedding Cake',
      'Test Wiedzy',
      'Test Zgodno\u015bci',
      'Oczepiny',
      'Last Dance',
    ]) {
      expect(conventions).toContain(term);
    }
    expect(conventions).toContain('optionalFlag: games');
    expect(conventions).toContain('grandEntranceOrder');
    expect(conventions).toContain('Song \u2014');
  });

  it('points the template at the canonical step titles', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('canonical step titles');
    expect(template).toContain('Grand Entrance');
    expect(template).toContain('Bread & Salt');
    expect(template).toContain('Last Dance');
  });

  it('maps a representative Plan-of-the-day to canonical steps and cues', () => {
    const parsed = parseGoogleDocTemplate(MINIMAL_TEMPLATE);
    const result = googleDocTemplateToCartridge(parsed);

    expect(result.errors).toEqual([]);
    const steps = result.cartridge.steps;
    expect(steps.map((step) => step.title)).toEqual([
      'Grand Entrance',
      'Wedding Cake',
      'Oczepiny',
    ]);

    const entrance = steps[0];
    expect(entrance.grandEntranceOrder).toBe('GUESTS_FIRST');
    expect(entrance.dj.track).toBe('Gimme! Gimme! Gimme! \u2014 ABBA');
    expect(entrance.subTasks).toEqual([
      'Guests use napkins for an Italian welcome',
      'Explain Sto lat in French',
    ]);

    expect(steps[1].type).toBe('HARD_ANCHOR');
    expect(steps[2].optionalFlag).toBe('oczepiny');

    const cues = result.cartridge.extensions.mcCues['step_01'];
    expect(cues.map((cue) => cue.text)).toEqual([
      'Toast et lancer les verres derri\u00e8re soi.',
      'Sto lat!',
      'Rzut kieliszkami.',
    ]);
  });
});
