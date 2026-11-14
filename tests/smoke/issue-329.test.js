import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/i18n/index.js';
import StepMandatoryNotes from '../../src/components/StepMandatoryNotes.jsx';
import CeremonyCueCard from '../../src/components/CeremonyCueCard.jsx';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import GrandEntranceCueCard from '../../src/components/GrandEntranceCueCard.jsx';
import FirstDanceCueCard from '../../src/components/FirstDanceCueCard.jsx';
import MandatoryUpdatePopup from '../../src/components/MandatoryUpdatePopup.jsx';
import { mapMandatoryToSteps } from '../../src/lib/mandatorySteps.js';

const wedding = {
  weddingId: 'w1',
  ceremony: {
    type: 'RELIGIOUS',
    mcSupportRequested: true,
    location: 'St Mary',
  },
  games: {
    enabled: true,
    questionLists: [
      {
        id: 'q1',
        title: 'Quiz',
        status: 'AVAILABLE',
        questions: [{ id: 'a', prompt: 'Question?' }],
      },
    ],
  },
};

const steps = [
  {
    id: 'step_01',
    title: 'Cocktail',
    time: '15:30',
    mandatory: { kind: 'FIRST_GUESTS_ARRIVAL', label: 'First guests arrival' },
  },
  {
    id: 'dinner',
    title: 'Dinner',
    time: '18:30',
    mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
  },
  {
    id: 'step_05',
    title: 'Wedding cake',
    time: '20:30',
    mandatory: { kind: 'CAKE_SERVICE', label: 'Wedding cake', cakeServiceMode: 'KITCHEN_RETURN' },
  },
  {
    id: 'supper_2',
    title: 'Supper II',
    time: '23:30',
    mandatory: { kind: 'KITCHEN_SERVICE', label: 'Supper II', serviceMode: 'BUFFET' },
  },
  {
    id: 'closure',
    title: 'Wedding closure',
    time: '02:00',
    mandatory: {
      kind: 'CLOSURE',
      label: 'Wedding closure',
      closureExtensionAllowed: true,
      lastSong: 'Perfect',
    },
  },
];
const scopedWedding = { ...wedding, steps };
const update = { updatedAt: '2026-11-07T18:00:00.000Z', value: steps };
const mandatoryItems = (role = 'mc', extra = {}) =>
  Object.values(mapMandatoryToSteps(scopedWedding, steps, { role, ...extra })).flat();

afterEach(() => setLocale('en', { persist: false }));

describe('issue #329 localized operational cues', () => {
  it('localizes mandatory constraints in French and Polish', () => {
    setLocale('fr', { persist: false });
    const fr = renderToStaticMarkup(
      createElement(StepMandatoryNotes, { items: mandatoryItems() }),
    );
    expect(fr).toContain('Contraintes obligatoires');
    expect(fr).toContain('Service à table');
    expect(fr).toContain('Buffet');

    setLocale('pl', { persist: false });
    const pl = renderToStaticMarkup(
      createElement(StepMandatoryNotes, { items: mandatoryItems() }),
    );
    expect(pl).toContain('Obowiązkowe ograniczenia');
    expect(pl).toContain('Obsługa przy stole');
  });

  it('localizes ceremony, games, entrance and first dance cards', () => {
    setLocale('fr', { persist: false });
    expect(
      renderToStaticMarkup(createElement(CeremonyCueCard, { wedding, role: 'mc' })),
    ).toContain('Cérémonie religieuse');
    expect(
      renderToStaticMarkup(createElement(GamesCueCard, { wedding, role: 'mc' })),
    ).toContain('Jeux');
    expect(
      renderToStaticMarkup(
        createElement(GrandEntranceCueCard, {
          step: { grandEntranceOrder: 'GUESTS_FIRST' },
        }),
      ),
    ).toContain('Invités d’abord, mariés ensuite');
    expect(
      renderToStaticMarkup(
        createElement(FirstDanceCueCard, {
          step: { firstDanceMode: 'NORMAL' },
          audience: 'mc',
        }),
      ),
    ).toContain('Première danse normale');

    setLocale('pl', { persist: false });
    expect(
      renderToStaticMarkup(createElement(CeremonyCueCard, { wedding, role: 'mc' })),
    ).toContain('Ceremonia religijna');
    expect(
      renderToStaticMarkup(createElement(GamesCueCard, { wedding, role: 'mc' })),
    ).toContain('Gry');
  });

  it('localizes the mandatory update popup', () => {
    setLocale('fr', { persist: false });
    const fr = renderToStaticMarkup(
      createElement(MandatoryUpdatePopup, {
        weddingId: 'w1',
        role: 'mc',
        update,
      }),
    );
    expect(fr).toContain('Le responsable du lieu a modifié le plan');
    expect(fr).toContain('Confirmer');
    expect(fr).toContain('Service à table');

    setLocale('pl', { persist: false });
    const pl = renderToStaticMarkup(
      createElement(MandatoryUpdatePopup, {
        weddingId: 'w1',
        role: 'dj',
        isVipDj: true,
        update,
      }),
    );
    expect(pl).toContain('Menadżer obiektu zmienił plan');
    expect(pl).toContain('Ostatni utwór');
  });

  it('keeps interpolation placeholders intact for service modes', () => {
    setLocale('fr', { persist: false });
    expect(
      renderToStaticMarkup(
        createElement(StepMandatoryNotes, { items: mandatoryItems() }),
      ),
    ).toContain('23:30');
  });
});
