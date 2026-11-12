// Couple identity for the top bar and every other couple label.
//
// `coupleProfile` is the only identity source. Nothing here infers nationality
// from a name or language, and no network call is needed.

export function normalizeCountryCode(code) {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function normalizeLanguageCode(code) {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function normalizeNationalities(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const codes = [];
  for (const entry of value) {
    const code = normalizeCountryCode(entry);
    if (code && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

export function normalizeLanguageList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const codes = [];
  for (const entry of value) {
    const code = normalizeLanguageCode(entry);
    if (code && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

function normalizePerson(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const firstName = typeof raw.firstName === 'string' ? raw.firstName.trim() : '';
  if (!firstName) return null;
  return { firstName, nationalities: normalizeNationalities(raw.nationalities) };
}

// `hasProfile` is only true when both first names are present. The schema
// requires the profile; the generic "Wedding" label is only a defensive
// fallback for malformed or legacy data, never a `couple` string.
export function resolveCoupleIdentity(wedding) {
  const profile = wedding?.coupleProfile;
  const bride = normalizePerson(profile?.bride);
  const groom = normalizePerson(profile?.groom);

  const hasProfile = Boolean(bride && groom);
  const people = hasProfile
    ? [
        { role: 'bride', ...bride },
        { role: 'groom', ...groom },
      ]
    : [];

  return {
    hasProfile,
    people,
    commonLanguages: hasProfile ? normalizeLanguageList(profile?.commonLanguages) : [],
    displayName: hasProfile ? `${bride.firstName} & ${groom.firstName}` : 'Wedding',
  };
}

export function coupleDisplayName(wedding) {
  return resolveCoupleIdentity(wedding).displayName;
}

export function deviceLocale() {
  if (typeof navigator === 'undefined') return 'en';
  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  return languages[0] || navigator.language || 'en';
}

function displayName(type, code, locale) {
  const normalized =
    type === 'region' ? normalizeCountryCode(code) : normalizeLanguageCode(code);
  if (!normalized) return null;

  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      return new Intl.DisplayNames([locale || 'en'], { type }).of(normalized) ?? normalized;
    }
  } catch {
    // Unknown locale or unsupported DisplayNames: fall back to the code.
  }
  return normalized;
}

export function localizedCountryName(code, locale = deviceLocale()) {
  return displayName('region', code, locale);
}

export function localizedLanguageName(code, locale = deviceLocale()) {
  return displayName('language', code, locale);
}
