// Day -1 "Prep Wrapper" view model (issue #1255).
//
// Aggregated, anonymized pre-event facts only. Country (no city, venue or
// couple), configured languages, locked steps, synced roles and the armed venue
// policy. There is no curfew data in the product, so none is claimed.
import { addDaysISO, resolveEventDateISO } from './eventTime.js';
import { normalizeVenuePolicies } from './venuePolicies.js';

export function resolveSocialTimeZone(wedding) {
  const candidate =
    wedding?.timezone ??
    wedding?.timeZone ??
    wedding?.cartridge?.extensions?.timeZone ??
    wedding?.timeZone;
  if (typeof candidate === 'string' && candidate.trim()) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: candidate });
      return candidate;
    } catch {
      // fall through to UTC
    }
  }
  return 'UTC';
}

export function venueTodayISO(timeZone, now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildDayMinusOneModel({ wedding = null, liveState = null, now = new Date() } = {}) {
  const cartridge = wedding?.cartridge ?? {};
  const eventDateISO =
    resolveEventDateISO({
      dateISO: cartridge.extensions?.dateISO ?? wedding?.dateISO,
      date: wedding?.date,
    }) ?? null;
  const timeZone = resolveSocialTimeZone(wedding);
  const targetDateISO = eventDateISO ? addDaysISO(eventDateISO, -1) : null;
  const rawPolicy =
    liveState?.media_overrides?.venuePolicies ??
    wedding?.venuePolicy ??
    wedding?.details?.venuePolicy ??
    null;
  const policy = normalizeVenuePolicies(rawPolicy);
  const languages = asArray(cartridge.extensions?.languages?.supported ?? wedding?.languages)
    .map((code) => String(code).toUpperCase().slice(0, 2))
    .filter(Boolean);
  const steps = asArray(cartridge.steps);
  const roles = asArray(wedding?.roles);
  return {
    readyToPost: Boolean(targetDateISO && venueTodayISO(timeZone, now) === targetDateISO),
    eventDateISO,
    targetDateISO,
    timeZone,
    country:
      String(wedding?.venue_country ?? wedding?.country ?? cartridge.extensions?.country ?? '')
        .trim()
        .toUpperCase()
        .slice(0, 2) || null,
    languages: [...new Set(languages)],
    stepCount: steps.length || wedding?.totalSteps || 0,
    hardAnchorCount: asArray(cartridge.hardAnchors).length || wedding?.hardAnchorCount || 0,
    roleCount: roles.length,
    policy: {
      armed: policy.decibelLimitEnabled || policy.forbiddenFx.length > 0,
      decibelLimit: policy.decibelLimit,
      forbiddenFx: policy.forbiddenFx.length,
    },
  };
}

export function dayMinusOneCaptionLines(model, locale = 'fr') {
  const country = model.country || (locale === 'fr' ? 'Destination' : 'Kierunek');
  const languages = model.languages.length > 0 ? model.languages.join(' / ') : '—';
  const policy =
    locale === 'fr'
      ? model.policy.armed
        ? 'Politique du lieu armée'
        : 'Politique du lieu à confirmer'
      : model.policy.armed
        ? 'Zasady miejsca aktywne'
        : 'Zasady miejsca do potwierdzenia';
  if (locale === 'fr') {
    return [
      `J−1 avant le mariage — ${country}`,
      `${model.stepCount} étapes verrouillées · ${model.roleCount} rôles synchronisés`,
      `Langues : ${languages}`,
      policy,
    ];
  }
  return [
    `D−1 przed weselem — ${country}`,
    `${model.stepCount} kroków zablokowanych · ${model.roleCount} ról zsynchronizowanych`,
    `Języki: ${languages}`,
    policy,
  ];
}
