// Curated wedding-instrument catalogue. The short list was validated against
// the free MusicBrainz instrument API; the app ships it locally so the PWA stays
// offline-first and no external connect-src is needed.
//
// Values are stable keys. Unknown/legacy free text must stay readable, so
// `instrumentLabel` falls back to the stored value.

export const INSTRUMENT_KEYS = Object.freeze([
  'violin',
  'viola',
  'cello',
  'saxophone',
  'piano',
  'keyboard',
  'harp',
  'guitar',
  'vocals',
  'flute',
  'clarinet',
  'trumpet',
  'accordion',
  'organ',
  'other',
]);

export const INSTRUMENTS = Object.freeze(
  INSTRUMENT_KEYS.map((key) => ({
    key,
    labels: {
      en:
        {
          violin: 'Violin',
          viola: 'Viola',
          cello: 'Cello',
          saxophone: 'Saxophone',
          piano: 'Piano',
          keyboard: 'Keyboard',
          harp: 'Harp',
          guitar: 'Guitar',
          vocals: 'Vocals',
          flute: 'Flute',
          clarinet: 'Clarinet',
          trumpet: 'Trumpet',
          accordion: 'Accordion',
          organ: 'Organ',
          other: 'Other',
        }[key] ?? key,
      fr:
        {
          violin: 'Violon',
          viola: 'Alto',
          cello: 'Violoncelle',
          saxophone: 'Saxophone',
          piano: 'Piano',
          keyboard: 'Clavier',
          harp: 'Harpe',
          guitar: 'Guitare',
          vocals: 'Chant',
          flute: 'Flûte',
          clarinet: 'Clarinette',
          trumpet: 'Trompette',
          accordion: 'Accordéon',
          organ: 'Orgue',
          other: 'Autre',
        }[key] ?? key,
      pl:
        {
          violin: 'Skrzypce',
          viola: 'Altówka',
          cello: 'Wiolonczela',
          saxophone: 'Saksofon',
          piano: 'Fortepian',
          keyboard: 'Keyboard',
          harp: 'Harfa',
          guitar: 'Gitara',
          vocals: 'Wokal',
          flute: 'Flet',
          clarinet: 'Klarnet',
          trumpet: 'Trąbka',
          accordion: 'Akordeon',
          organ: 'Organy',
          other: 'Inne',
        }[key] ?? key,
    },
  })),
);

const BY_KEY = new Map(INSTRUMENTS.map((instrument) => [instrument.key, instrument]));

export function instrumentChoice(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (BY_KEY.has(normalized) && normalized !== 'other') return normalized;
  return 'other';
}

export function instrumentLabel(value, locale = 'en') {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const entry = BY_KEY.get(normalized);
  if (!entry || normalized === 'other') {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
  return entry.labels[locale] ?? entry.labels.en;
}
