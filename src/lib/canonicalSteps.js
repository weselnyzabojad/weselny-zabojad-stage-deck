// Issue #1329 / decision 17.143: the frozen 19-step customer timeline catalog.
// Internal IDs stay in the cartridge; the customer only edits the hour, row
// order and row presence. Names are the stable customer-facing key.

export const CANONICAL_STEPS = Object.freeze([
  canonical('step_01', "Vin d'honneur / Cocktail", '16:00', 'Location, arrival note'),
  canonical('step_02', 'Ceremony', '17:00', 'Ceremony type, location, MC support'),
  canonical('step_03', 'Grand Entrance', '18:00', 'Guest order, entrance music', {
    isMainSongRequired: true,
  }),
  canonical('step_13', 'Bread & Salt', '18:30', 'Location, custom note'),
  canonical('step_04', 'Dinner', '19:00', 'Location, menu note'),
  canonical('step_07', 'Wishes', '20:00', 'Location, speaker note'),
  canonical('step_05', 'Wedding Cake', '20:30', 'Cake time, serve mode, music cue', {
    type: 'HARD_ANCHOR',
    anchorId: 'cake_midnight',
    isMainSongRequired: true,
  }),
  canonical('step_06', 'Wedding Thank-You', '21:00', 'Location, thank-you note'),
  canonical('step_08', 'First Dance', '21:15', 'Mode, start/stop, song', {
    isMainSongRequired: true,
  }),
  canonical('step_14', 'Dance with Bride and Groom', '21:45', 'Song, floor note'),
  canonical('step_12', 'Musical Set', '22:00', 'Playlist, start, end', {
    optionalFlag: 'dj_set',
  }),
  canonical('step_15', 'Supper I', '23:00', 'Service mode, dietary notes'),
  canonical('step_16', 'Supper II', '23:30', 'Service mode, dietary notes'),
  canonical('step_17', 'Supper III', '23:50', 'Service mode, dietary notes'),
  canonical('step_09', 'Oczepiny', '00:00', 'Toss, ties, winner photo, music', {
    type: 'HARD_ANCHOR',
    anchorId: 'oczepiny_midnight',
    optionalFlag: 'oczepiny',
  }),
  canonical('step_10', 'Test Wiedzy', '01:00', 'Languages, request, photographer'),
  canonical('step_speed_foto', 'Speed Foto', '01:30', 'Guest order, photo note'),
  canonical('step_11', 'Test Zgodności', '01:45', 'Languages, request, photographer'),
  canonical('step_19', 'Last Dance', '01:50', 'Song, closing note'),
]);

const BY_NAME = new Map(CANONICAL_STEPS.map((step) => [step.name.toLowerCase(), step]));
const BY_ID = new Map(CANONICAL_STEPS.map((step) => [step.id, step]));

function canonical(
  id,
  name,
  exampleHour,
  exampleValues,
  { type = 'FLEXIBLE', optionalFlag = null, anchorId = null, isMainSongRequired = false } = {},
) {
  return Object.freeze({
    id,
    name,
    type,
    optionalFlag,
    anchorId,
    isMainSongRequired,
    exampleHour,
    exampleValues,
  });
}

export const TIMELINE_COLUMNS = Object.freeze(['Hour', 'Step name', 'Example values']);

export function canonicalStepByName(name) {
  return BY_NAME.get(String(name ?? '').trim().toLowerCase()) ?? null;
}

export function canonicalStepById(id) {
  return BY_ID.get(String(id ?? '').trim()) ?? null;
}

export function timelineMarkdownRows() {
  return CANONICAL_STEPS.map(
    (step) => `| ${step.exampleHour} | ${step.name} | ${step.exampleValues} |`,
  );
}
