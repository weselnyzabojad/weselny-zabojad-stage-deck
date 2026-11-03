// Couple identity for the top bar (project.md TODO 15 / Phase 1.5c).
//
// The header is driven by the cartridge's `coupleProfile`; `couple` stays the
// display fallback for v1.1 cartridges. Nothing here infers nationality from a
// name or language, and no network call is needed.

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

// `hasProfile` is only true when both first names are present, matching the
// v1.2 validation rule. Otherwise the legacy `couple` string is the label.
export function resolveCoupleIdentity(wedding) {
  const profile = wedding?.coupleProfile;
  const bride = normalizePerson(profile?.bride);
  const groom = normalizePerson(profile?.groom);
  const fallbackLabel =
    typeof wedding?.couple === 'string' && wedding.couple.trim()
      ? wedding.couple.trim()
      : 'Wedding';

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
    fallbackLabel,
  };
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
