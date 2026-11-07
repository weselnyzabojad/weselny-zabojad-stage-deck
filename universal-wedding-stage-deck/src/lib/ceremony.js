export const CEREMONY_TYPES = {
  RELIGIOUS: { label: 'Religious ceremony', icon: '⛪' },
  CIVIL: { label: 'Civil ceremony', icon: '🏛️' },
  HUMANIST: { label: 'Humanist ceremony', icon: '🕊️' },
};

export function resolveCeremony(wedding) {
  const ceremony = wedding?.ceremony;
  if (!ceremony || typeof ceremony !== 'object') {
    return { type: null, location: null, notes: null, mcSupportRequested: false, mcTranslationHelpRequested: false };
  }
  const type = CEREMONY_TYPES[ceremony.type] ? ceremony.type : null;
  return {
    type,
    meta: type ? CEREMONY_TYPES[type] : null,
    location: typeof ceremony.location === 'string' && ceremony.location.trim() ? ceremony.location.trim() : null,
    notes: typeof ceremony.notes === 'string' && ceremony.notes.trim() ? ceremony.notes.trim() : null,
    mcSupportRequested: ceremony.mcSupportRequested === true,
    mcTranslationHelpRequested: ceremony.mcTranslationHelpRequested === true,
  };
}

// Religious ceremonies are only expanded in MC view when the couple asked for
// MC support. Otherwise they stay as a short note inside First arrival.
export function ceremonyVisibleToMc(ceremony) {
  if (!ceremony?.type) return false;
  if (ceremony.type === 'RELIGIOUS') return ceremony.mcSupportRequested;
  return true;
}

export function firstArrivalCeremonyNote(ceremony) {
  if (ceremony?.type !== 'RELIGIOUS' || ceremony.mcSupportRequested) return null;
  const place = ceremony.location ? ` at ${ceremony.location}` : '';
  return `Religious wedding ceremony${place} is taking place.`;
}
