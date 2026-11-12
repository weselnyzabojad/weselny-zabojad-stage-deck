// Prepared optional-game content (TODO 16). Design-only for now: the final
// `games` schema, UI and Google Doc parser mapping are deferred until approval.
// Do not add these modules to the AI converter prompt yet.

export { TEST_WIEDZY_GAME } from './testWiedzy.js';
export { TEST_ZGODNOSCI_GAME } from './testZgodnosci.js';

export const GAME_CAPTURE_OPTIONS = ['YES', 'NO', 'UNDECIDED'];
export const GAME_LANGUAGES = ['PL', 'FR', 'EN'];

export const GAME_PACKAGES = {
  testWiedzy: {
    id: 'test_wiedzy',
    label: { PL: 'Test Wiedzy', FR: 'Test de Connaissances', EN: 'Knowledge Quiz' },
  },
  testZgodnosci: {
    id: 'test_zgodnosci',
    label: { PL: 'Test Zgodności', FR: 'Test de Compatibilité', EN: 'Compatibility Test' },
  },
};
