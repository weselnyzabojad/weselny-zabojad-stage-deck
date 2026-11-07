import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/i18n/index.js';
import MandatoryConstraintsCard from '../../src/components/MandatoryConstraintsCard.jsx';
import CeremonyCueCard from '../../src/components/CeremonyCueCard.jsx';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import GrandEntranceCueCard from '../../src/components/GrandEntranceCueCard.jsx';
import FirstDanceCueCard from '../../src/components/FirstDanceCueCard.jsx';
import MandatoryUpdatePopup from '../../src/components/MandatoryUpdatePopup.jsx';

const wedding = {
  weddingId: 'w1',
  mandatorySteps: {
    firstGuestsArrival: '15:30',
    kitchenServices: { dinner: '18:30', secondSupper: '23:30' },
    kitchenServiceModes: { dinner: 'TABLE_SERVICE', secondSupper: 'BUFFET' },
    cakeServiceMode: 'KITCHEN_RETURN',
    closureTime: '02:00',
    closureExtensionAllowed: true,
    lastSong: 'Perfect',
  },
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

const update = { updatedAt: '2026-11-07T18:00:00.000Z', value: wedding.mandatorySteps };

afterEach(() => setLocale('en', { persist: false }));

describe('issue #329 localized operational cues', () => {
  it('localizes mandatory constraints in French and Polish', () => {
    setLocale('fr', { persist: false });
    const fr = renderToStaticMarkup(
      createElement(MandatoryConstraintsCard, { wedding, role: 'mc' }),
    );
    expect(fr).toContain('Contraintes obligatoires');
    expect(fr).toContain('Service à table');
    expect(fr).toContain('Buffet');

    setLocale('pl', { persist: false });
    const pl = renderToStaticMarkup(
      createElement(MandatoryConstraintsCard, { wedding, role: 'mc' }),
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
        createElement(MandatoryConstraintsCard, { wedding, role: 'mc' }),
      ),
    ).toContain('23:30');
  });
});
